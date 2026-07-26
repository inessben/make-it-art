const prisma = require("../lib/prisma");
const env = require("../config/env");
const { isTransactionWriteConflict, waitForTransactionRetry } = require("../lib/transaction-retry");

const DISPUTE_EVENT_TYPES = new Set([
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed"
]);
const TERMINAL_DISPUTE_STATUSES = new Set(["WON", "LOST", "CLOSED"]);

class DisputeFinalizationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DisputeFinalizationError";
    this.code = code;
  }
}

function stripeId(value) {
  return typeof value === "string" ? value : value?.id;
}

function targetDisputeStatus(providerStatus) {
  const statuses = {
    needs_response: "NEEDS_RESPONSE",
    warning_needs_response: "NEEDS_RESPONSE",
    under_review: "UNDER_REVIEW",
    warning_under_review: "UNDER_REVIEW",
    won: "WON",
    lost: "LOST",
    warning_closed: "CLOSED",
    prevented: "CLOSED"
  };
  const status = statuses[providerStatus];
  if (!status) {
    throw new DisputeFinalizationError(
      "UNSUPPORTED_DISPUTE_STATUS",
      "Unsupported Stripe dispute status"
    );
  }
  return status;
}

function evidenceDueAt(dispute) {
  const dueBy = dispute.evidence_details?.due_by;
  return Number.isSafeInteger(dueBy) && dueBy > 0 ? new Date(dueBy * 1000) : null;
}

async function openOperatorAlert(transaction, event, payment, code) {
  const existing = await transaction.paymentOperatorAlert.findFirst({
    where: {
      stripeObjectId: event.data.object.id,
      code,
      status: "OPEN"
    }
  });
  if (existing) return;
  await transaction.paymentOperatorAlert.create({
    data: {
      orderId: payment.orderId,
      paymentId: payment.id,
      stripeEventId: event.id,
      stripeObjectId: event.data.object.id,
      code
    }
  });
}

async function persistFailedEvent(prismaClient, event, error) {
  await prismaClient.stripeWebhookEvent.upsert({
    where: { eventId: event.id },
    create: {
      eventId: event.id,
      eventType: event.type,
      stripeObjectId: event.data.object.id,
      status: "FAILED",
      attemptCount: 1,
      lastErrorCode: error.code || "DISPUTE_EVENT_PROCESSING_FAILED"
    },
    update: {
      status: "FAILED",
      attemptCount: { increment: 1 },
      lastErrorCode: error.code || "DISPUTE_EVENT_PROCESSING_FAILED"
    }
  });
}

function rightsTaskForDispute({ status, disputeId, disputeRightsPolicy }) {
  if (disputeRightsPolicy !== "SUSPEND_ON_OPEN") return null;
  if (["NEEDS_RESPONSE", "UNDER_REVIEW"].includes(status)) {
    return {
      taskType: "SUSPEND_DOWNLOAD_RIGHTS",
      taskKey: `dispute:${disputeId}:SUSPEND_DOWNLOAD_RIGHTS`
    };
  }
  if (["WON", "CLOSED"].includes(status)) {
    return {
      taskType: "RESTORE_DOWNLOAD_RIGHTS",
      taskKey: `dispute:${disputeId}:RESTORE_DOWNLOAD_RIGHTS`
    };
  }
  if (status === "LOST") {
    return {
      taskType: "REVOKE_DOWNLOAD_RIGHTS",
      taskKey: `dispute:${disputeId}:REVOKE_DOWNLOAD_RIGHTS`
    };
  }
  return null;
}

async function applyDisputeEvent(transaction, event, payment, disputeRightsPolicy) {
  const stripeDispute = event.data.object;
  const providerChargeId = stripeId(stripeDispute.charge);
  const status = targetDisputeStatus(stripeDispute.status);
  if (
    !providerChargeId ||
    !Number.isSafeInteger(stripeDispute.amount) ||
    stripeDispute.amount <= 0 ||
    !/^[a-z]{3}$/.test(stripeDispute.currency || "")
  ) {
    throw new DisputeFinalizationError("INVALID_DISPUTE", "Invalid Stripe dispute");
  }

  const existing = await transaction.dispute.findUnique({
    where: { providerDisputeId: stripeDispute.id }
  });
  if (existing && TERMINAL_DISPUTE_STATUSES.has(existing.status) && existing.status !== status) {
    return { dispute: existing, outcome: "ignored_terminal_transition" };
  }

  const dispute = await transaction.dispute.upsert({
    where: { providerDisputeId: stripeDispute.id },
    create: {
      providerDisputeId: stripeDispute.id,
      providerChargeId,
      orderId: payment.orderId,
      paymentId: payment.id,
      status,
      providerStatus: stripeDispute.status,
      reason: stripeDispute.reason || "unknown",
      amount: stripeDispute.amount,
      currency: String(stripeDispute.currency || "").toUpperCase(),
      evidenceDueAt: evidenceDueAt(stripeDispute),
      ...(TERMINAL_DISPUTE_STATUSES.has(status) ? { closedAt: new Date() } : {})
    },
    update: {
      status,
      providerStatus: stripeDispute.status,
      reason: stripeDispute.reason || "unknown",
      evidenceDueAt: evidenceDueAt(stripeDispute),
      ...(TERMINAL_DISPUTE_STATUSES.has(status)
        ? { closedAt: existing?.closedAt || new Date() }
        : {})
    }
  });

  const otherExposure = await transaction.dispute.aggregate({
    where: {
      paymentId: payment.id,
      providerDisputeId: { not: stripeDispute.id },
      status: { in: ["NEEDS_RESPONSE", "UNDER_REVIEW", "LOST"] }
    },
    _sum: { amount: true }
  });
  const currentExposure = ["NEEDS_RESPONSE", "UNDER_REVIEW", "LOST"].includes(status)
    ? stripeDispute.amount
    : 0;
  const financialMismatch =
    stripeDispute.currency !== payment.currency.toLowerCase() ||
    payment.refundedAmount + (otherExposure._sum.amount || 0) + currentExposure > payment.amount;
  if (TERMINAL_DISPUTE_STATUSES.has(status)) {
    await transaction.paymentOperatorAlert.updateMany({
      where: {
        stripeObjectId: stripeDispute.id,
        code: "STRIPE_DISPUTE_OPEN",
        status: "OPEN"
      },
      data: { status: "RESOLVED", resolvedAt: new Date() }
    });
  }
  if (financialMismatch) {
    await openOperatorAlert(transaction, event, payment, "DISPUTE_FINANCIAL_EXPOSURE_MISMATCH");
  } else if (!TERMINAL_DISPUTE_STATUSES.has(status)) {
    await openOperatorAlert(transaction, event, payment, "STRIPE_DISPUTE_OPEN");
  }

  const rightsTask = rightsTaskForDispute({
    status,
    disputeId: stripeDispute.id,
    disputeRightsPolicy
  });
  if (rightsTask) {
    await transaction.fulfillmentTask.createMany({
      data: [{ orderId: payment.orderId, ...rightsTask }],
      skipDuplicates: true
    });
  }

  return { dispute, outcome: financialMismatch ? "review" : "applied" };
}

async function processStripeDisputeEvent({
  event,
  prismaClient = prisma,
  disputeRightsPolicy = env.paymentOperations.disputeRightsPolicy
}) {
  if (!DISPUTE_EVENT_TYPES.has(event.type) || !event.data?.object?.id) {
    throw new DisputeFinalizationError("INVALID_DISPUTE_EVENT", "Invalid dispute event");
  }

  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await prismaClient.$transaction(
        async (transaction) => {
          const stripeDispute = event.data.object;
          const providerChargeId = stripeId(stripeDispute.charge);
          const providerPaymentId = stripeId(stripeDispute.payment_intent);
          await transaction.stripeWebhookEvent.upsert({
            where: { eventId: event.id },
            create: {
              eventId: event.id,
              eventType: event.type,
              stripeObjectId: stripeDispute.id
            },
            update: {}
          });
          await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${stripeDispute.id}, 0))::text AS lock`;
          const storedEvent = await transaction.stripeWebhookEvent.findUnique({
            where: { eventId: event.id }
          });
          if (storedEvent.status === "PROCESSED") {
            return { duplicate: true, outcome: "already_processed" };
          }

          const payment = await transaction.payment.findFirst({
            where: {
              OR: [
                ...(providerChargeId ? [{ providerChargeId }] : []),
                ...(providerPaymentId ? [{ providerPaymentId }] : [])
              ]
            }
          });
          if (!payment) {
            await transaction.stripeWebhookEvent.update({
              where: { eventId: event.id },
              data: {
                status: "FAILED",
                attemptCount: { increment: 1 },
                lastErrorCode: "DISPUTE_PAYMENT_NOT_FOUND"
              }
            });
            return { duplicate: false, outcome: "retry", retryable: true };
          }
          if (providerChargeId && !payment.providerChargeId) {
            await transaction.payment.update({
              where: { id: payment.id },
              data: { providerChargeId }
            });
          }

          const result = await applyDisputeEvent(transaction, event, payment, disputeRightsPolicy);
          await transaction.stripeWebhookEvent.update({
            where: { eventId: event.id },
            data: {
              paymentId: payment.id,
              disputeId: result.dispute.id,
              status: "PROCESSED",
              attemptCount: { increment: 1 },
              lastErrorCode: null,
              processedAt: new Date()
            }
          });
          return { duplicate: false, outcome: result.outcome };
        },
        { isolationLevel: "Serializable" }
      );
    } catch (error) {
      lastError = error;
      if (!isTransactionWriteConflict(error) || attempt === 5) break;
      await waitForTransactionRetry(attempt);
    }
  }
  await persistFailedEvent(prismaClient, event, lastError);
  throw lastError;
}

module.exports = {
  DISPUTE_EVENT_TYPES,
  TERMINAL_DISPUTE_STATUSES,
  DisputeFinalizationError,
  processStripeDisputeEvent,
  rightsTaskForDispute,
  targetDisputeStatus
};
