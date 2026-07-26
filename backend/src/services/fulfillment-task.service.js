const crypto = require("node:crypto");
const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");
const { logPaymentEvent } = require("../lib/payment-logger");
const {
  sendPaymentConfirmationEmail,
  sendPaymentOperationsAlert,
  sendRefundStatusEmail
} = require("./mail.service");
const {
  generateCertificates,
  grantDownloadRights,
  restoreDownloadRights,
  revokeDownloadRights,
  suspendDownloadRights
} = require("./digital-delivery.service");
const { issueCommissionInvoices, issueSaleInvoice } = require("./invoice.service");

const KNOWN_TASK_TYPES = Object.freeze([
  "SEND_PAYMENT_CONFIRMATION",
  "SEND_REFUND_STATUS",
  "GRANT_DOWNLOAD_RIGHTS",
  "REVOKE_DOWNLOAD_RIGHTS",
  "GENERATE_CERTIFICATE",
  "SUSPEND_DOWNLOAD_RIGHTS",
  "RESTORE_DOWNLOAD_RIGHTS",
  "ISSUE_SALE_INVOICE",
  "ISSUE_COMMISSION_INVOICES"
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class FulfillmentTaskError extends Error {
  constructor(code, message, { retryable = true, canceled = false } = {}) {
    super(message);
    this.name = "FulfillmentTaskError";
    this.code = code;
    this.retryable = retryable;
    this.canceled = canceled;
  }
}

function safeErrorCode(error) {
  return String(error?.code || "FULFILLMENT_TASK_FAILED")
    .replace(/[^A-Z0-9_:-]/gi, "_")
    .slice(0, 120);
}

function retryDelayMs(attemptCount, baseDelayMs = 5000, maximumDelayMs = 15 * 60 * 1000) {
  const exponent = Math.max(0, Math.min(attemptCount - 1, 10));
  return Math.min(maximumDelayMs, baseDelayMs * 2 ** exponent);
}

function stableMessageId(taskKey) {
  const digest = crypto.createHash("sha256").update(taskKey).digest("hex");
  return `<${digest}.fulfillment@make-it-art.local>`;
}

function assertRecipient(task) {
  if (!task.order.user.email) {
    throw new FulfillmentTaskError(
      "FULFILLMENT_RECIPIENT_MISSING",
      "The order owner has no email address",
      { retryable: false }
    );
  }
}

function assertPaymentConfirmationAllowed(task) {
  if (["PAID", "PARTIALLY_REFUNDED"].includes(task.order.status)) return;
  const terminal = ["REFUNDED", "CANCELED"].includes(task.order.status);
  throw new FulfillmentTaskError(
    terminal ? "PAYMENT_CONFIRMATION_CANCELED" : "ORDER_NOT_READY_FOR_CONFIRMATION",
    "The order is not eligible for a payment confirmation",
    { retryable: !terminal, canceled: terminal }
  );
}

function refundContext(task) {
  const match = /^refund:([^:]+):SEND_REFUND_STATUS:(SUCCEEDED|FAILED)$/.exec(task.taskKey);
  if (!match || !UUID_PATTERN.test(match[1])) {
    throw new FulfillmentTaskError(
      "INVALID_REFUND_TASK_KEY",
      "The refund notification task key is invalid",
      { retryable: false }
    );
  }

  const refund = task.order.refunds.find((candidate) => candidate.publicId === match[1]);
  if (!refund) {
    throw new FulfillmentTaskError("REFUND_NOT_FOUND", "The refund no longer exists");
  }
  if (refund.status !== match[2]) {
    throw new FulfillmentTaskError(
      "REFUND_STATUS_MISMATCH",
      "The refund status does not match the notification task",
      { retryable: refund.status === "PENDING" }
    );
  }
  return refund;
}

function createDefaultHandlers({
  paymentConfirmationSender = sendPaymentConfirmationEmail,
  refundStatusSender = sendRefundStatusEmail,
  prismaClient = prisma,
  disputeRightsPolicy
} = {}) {
  return {
    SEND_PAYMENT_CONFIRMATION: async ({ task }) => {
      assertRecipient(task);
      assertPaymentConfirmationAllowed(task);
      const result = await paymentConfirmationSender({
        to: task.order.user.email,
        username: task.order.user.username,
        orderPublicId: task.order.publicId,
        messageId: stableMessageId(task.taskKey)
      });
      return { effectReference: result?.messageId || stableMessageId(task.taskKey) };
    },
    SEND_REFUND_STATUS: async ({ task }) => {
      assertRecipient(task);
      const refund = refundContext(task);
      const result = await refundStatusSender({
        to: task.order.user.email,
        username: task.order.user.username,
        orderPublicId: task.order.publicId,
        refundPublicId: refund.publicId,
        status: refund.status,
        amount: refund.amount,
        currency: refund.currency,
        providerReference: refund.providerReference,
        messageId: stableMessageId(task.taskKey)
      });
      return { effectReference: result?.messageId || stableMessageId(task.taskKey) };
    },
    GRANT_DOWNLOAD_RIGHTS: ({ task }) =>
      grantDownloadRights({ task, prismaClient, disputeRightsPolicy }),
    REVOKE_DOWNLOAD_RIGHTS: ({ task }) => revokeDownloadRights({ task, prismaClient }),
    GENERATE_CERTIFICATE: ({ task }) =>
      generateCertificates({ task, prismaClient, disputeRightsPolicy }),
    SUSPEND_DOWNLOAD_RIGHTS: ({ task }) => suspendDownloadRights({ task, prismaClient }),
    RESTORE_DOWNLOAD_RIGHTS: ({ task }) => restoreDownloadRights({ task, prismaClient }),
    ISSUE_SALE_INVOICE: ({ task }) => issueSaleInvoice({ task, prismaClient }),
    ISSUE_COMMISSION_INVOICES: ({ task }) => issueCommissionInvoices({ task, prismaClient })
  };
}

const taskInclude = {
  order: {
    include: {
      user: { select: { email: true, username: true } },
      refunds: {
        select: {
          publicId: true,
          status: true,
          amount: true,
          currency: true,
          providerReference: true
        }
      }
    }
  }
};

async function claimNextTask({ prismaClient, now, leaseMs, maxAttempts, taskId }) {
  const leaseToken = crypto.randomUUID();
  const staleBefore = new Date(now.getTime() - leaseMs);
  const taskFilter = Number.isSafeInteger(taskId) ? Prisma.sql`AND "id" = ${taskId}` : Prisma.sql``;

  return prismaClient.$transaction(async (transaction) => {
    const claimed = await transaction.$queryRaw(
      Prisma.sql`
        WITH candidate AS (
          SELECT "id"
          FROM "fulfillment_task"
          WHERE (
            ("status" = 'PENDING' AND "available_at" <= ${now})
            OR ("status" = 'PROCESSING' AND "locked_at" <= ${staleBefore})
          )
          AND "attempt_count" < ${maxAttempts}
          ${taskFilter}
          ORDER BY "available_at" ASC, "created_at" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE "fulfillment_task" AS task
        SET "status" = 'PROCESSING',
            "attempt_count" = task."attempt_count" + 1,
            "locked_at" = ${now},
            "lease_token" = ${leaseToken},
            "last_error_code" = NULL,
            "processed_at" = NULL
        FROM candidate
        WHERE task."id" = candidate."id"
        RETURNING task."id"
      `
    );

    if (claimed.length === 0) return null;
    return transaction.fulfillmentTask.findUnique({
      where: { id: claimed[0].id },
      include: taskInclude
    });
  });
}

async function completeTask({ prismaClient, task, effectReference, now }) {
  return prismaClient.fulfillmentTask.updateMany({
    where: { id: task.id, status: "PROCESSING", leaseToken: task.leaseToken },
    data: {
      status: "COMPLETED",
      processedAt: now,
      lockedAt: null,
      leaseToken: null,
      lastErrorCode: null,
      effectReference: effectReference ? String(effectReference).slice(0, 255) : null
    }
  });
}

async function failTask({ prismaClient, task, error, now, maxAttempts, baseDelayMs }) {
  const code = safeErrorCode(error);
  const canceled = error?.canceled === true;
  const retryable = error?.retryable !== false && !canceled && task.attemptCount < maxAttempts;
  const status = canceled ? "CANCELED" : retryable ? "PENDING" : "FAILED";
  const data = {
    status,
    lockedAt: null,
    leaseToken: null,
    lastErrorCode: code,
    ...(retryable
      ? { availableAt: new Date(now.getTime() + retryDelayMs(task.attemptCount, baseDelayMs)) }
      : { processedAt: now })
  };

  const result = await prismaClient.fulfillmentTask.updateMany({
    where: { id: task.id, status: "PROCESSING", leaseToken: task.leaseToken },
    data
  });
  return { updated: result.count === 1, status, code };
}

async function markExhaustedTasks({ prismaClient, now, leaseMs, maxAttempts, taskId }) {
  const staleBefore = new Date(now.getTime() - leaseMs);
  return prismaClient.fulfillmentTask.updateMany({
    where: {
      ...(Number.isSafeInteger(taskId) ? { id: taskId } : {}),
      attemptCount: { gte: maxAttempts },
      OR: [{ status: "PENDING" }, { status: "PROCESSING", lockedAt: { lte: staleBefore } }]
    },
    data: {
      status: "FAILED",
      processedAt: now,
      lockedAt: null,
      leaseToken: null,
      lastErrorCode: "FULFILLMENT_ATTEMPTS_EXHAUSTED"
    }
  });
}

async function alertFinalFailures({ alertSender, count, logger }) {
  if (count === 0) return;
  try {
    await alertSender({ code: "FULFILLMENT_TASK_FAILED", count });
  } catch (error) {
    logger("fulfillment_alert_failed", { code: safeErrorCode(error), count }, "error");
  }
}

async function processFulfillmentBatch({
  prismaClient = prisma,
  handlers,
  alertSender = sendPaymentOperationsAlert,
  logger = logPaymentEvent,
  now,
  clock = () => new Date(),
  batchSize = 20,
  leaseMs = 5 * 60 * 1000,
  maxAttempts = 5,
  baseDelayMs = 5000,
  taskId
} = {}) {
  const activeHandlers = handlers || createDefaultHandlers({ prismaClient });
  const summary = {
    claimed: 0,
    completed: 0,
    retried: 0,
    canceled: 0,
    failed: 0,
    leaseLost: 0
  };

  const currentTime = () => now || clock();
  const sweepStartedAt = currentTime();

  const exhausted = await markExhaustedTasks({
    prismaClient,
    now: sweepStartedAt,
    leaseMs,
    maxAttempts,
    taskId
  });
  summary.failed += exhausted.count;

  for (let index = 0; index < batchSize; index += 1) {
    const task = await claimNextTask({
      prismaClient,
      now: currentTime(),
      leaseMs,
      maxAttempts,
      taskId
    });
    if (!task) break;
    summary.claimed += 1;
    const taskStartedAt = Date.now();

    try {
      if (!KNOWN_TASK_TYPES.includes(task.taskType)) {
        throw new FulfillmentTaskError(
          "UNKNOWN_FULFILLMENT_TASK_TYPE",
          "The fulfillment task type is unknown",
          { retryable: false }
        );
      }
      const handler = activeHandlers[task.taskType];
      if (!handler) {
        throw new FulfillmentTaskError(
          "FULFILLMENT_HANDLER_NOT_CONFIGURED",
          "The fulfillment task handler is not configured",
          { retryable: false }
        );
      }

      const result = await handler({ task });
      const update = await completeTask({
        prismaClient,
        task,
        effectReference: result?.effectReference,
        now: currentTime()
      });
      if (update.count === 1) {
        summary.completed += 1;
        logger("fulfillment_task_completed", {
          taskId: task.id,
          taskType: task.taskType,
          taskKey: task.taskKey,
          attemptCount: task.attemptCount,
          orderId: task.order.publicId,
          status: "COMPLETED",
          durationMs: Date.now() - taskStartedAt
        });
      } else {
        summary.leaseLost += 1;
      }
    } catch (error) {
      const outcome = await failTask({
        prismaClient,
        task,
        error,
        now: currentTime(),
        maxAttempts,
        baseDelayMs
      });
      if (!outcome.updated) {
        summary.leaseLost += 1;
        continue;
      }
      if (outcome.status === "PENDING") summary.retried += 1;
      if (outcome.status === "CANCELED") summary.canceled += 1;
      if (outcome.status === "FAILED") summary.failed += 1;
      logger(
        "fulfillment_task_not_completed",
        {
          code: outcome.code,
          status: outcome.status,
          taskId: task.id,
          taskType: task.taskType,
          taskKey: task.taskKey,
          attemptCount: task.attemptCount,
          orderId: task.order.publicId,
          durationMs: Date.now() - taskStartedAt
        },
        outcome.status === "FAILED" ? "error" : "warn"
      );
    }
  }

  await alertFinalFailures({ alertSender, count: summary.failed, logger });
  return summary;
}

module.exports = {
  FulfillmentTaskError,
  KNOWN_TASK_TYPES,
  createDefaultHandlers,
  processFulfillmentBatch,
  retryDelayMs,
  stableMessageId
};
