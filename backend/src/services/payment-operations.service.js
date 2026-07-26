const prisma = require("../lib/prisma");
const env = require("../config/env");
const { redis } = require("../lib/redis");
const { getStripeClient } = require("../lib/stripe");
const { reconcilePaymentIntent } = require("./payment-monitoring.service");
const { processVerifiedStripeEvent } = require("./stripe-webhook.service");
const { sendPaymentOperationsAlert } = require("./mail.service");

const STRIPE_EVENT_ID_PATTERN = /^evt_[A-Za-z0-9_]+$/;
const STRIPE_DISPUTE_ID_PATTERN = /^dp_[A-Za-z0-9_]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOLUTION_CODES = new Set(["RECONCILED", "FALSE_POSITIVE", "EXTERNAL_RESOLUTION"]);

class PaymentOperationsError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "PaymentOperationsError";
    this.code = code;
    this.status = status;
  }
}

function webhookOrderId(event) {
  return (
    event.payment?.order?.publicId ||
    event.refund?.order?.publicId ||
    event.dispute?.order?.publicId ||
    null
  );
}

function serializeWebhook(event) {
  return {
    id: event.id,
    eventId: event.eventId,
    eventType: event.eventType,
    status: event.status,
    attemptCount: event.attemptCount,
    errorCode: event.lastErrorCode,
    orderId: webhookOrderId(event),
    createdAt: event.createdAt,
    processedAt: event.processedAt,
    replayable: event.status === "FAILED" && !event.eventId.startsWith("evt_reconcile_")
  };
}

function serializeTask(task) {
  return {
    id: task.id,
    taskType: task.taskType,
    status: task.status,
    attemptCount: task.attemptCount,
    errorCode: task.lastErrorCode,
    orderId: task.order.publicId,
    availableAt: task.availableAt,
    lockedAt: task.lockedAt,
    processedAt: task.processedAt,
    replayable: task.status === "FAILED"
  };
}

function serializeOrder(order) {
  const payment = order.payments[0] || null;
  return {
    id: order.publicId,
    status: order.status,
    updatedAt: order.updatedAt,
    paymentStatus: payment?.status || null,
    providerStatus: payment?.providerStatus || null,
    reconcileable: Boolean(payment?.providerPaymentId)
  };
}

function serializeRefund(refund) {
  return {
    id: refund.publicId,
    paymentId: refund.paymentId,
    paymentStatus: refund.payment?.status || null,
    orderId: refund.order.publicId,
    status: refund.status,
    providerStatus: refund.providerStatus,
    amount: refund.amount,
    currency: refund.currency,
    reasonCode: refund.reasonCode,
    requestedBy:
      refund.requestedBy?.username ||
      (refund.requestedBy ? `user #${refund.requestedBy.id}` : null),
    createdAt: refund.createdAt,
    updatedAt: refund.updatedAt
  };
}

function serializeOperatorAlert(alert) {
  return {
    id: alert.id,
    code: alert.code,
    status: alert.status,
    orderId: alert.order.publicId,
    paymentStatus: alert.payment?.status || null,
    orderStatus: alert.order.status,
    createdAt: alert.createdAt,
    resolvedAt: alert.resolvedAt
  };
}

function serializeDispute(dispute) {
  const evidence = dispute.evidenceAudits[0] || null;
  return {
    id: dispute.providerDisputeId,
    status: dispute.status,
    providerStatus: dispute.providerStatus,
    reason: dispute.reason,
    amount: dispute.amount,
    currency: dispute.currency,
    evidenceDueAt: dispute.evidenceDueAt,
    orderId: dispute.order.publicId,
    createdAt: dispute.createdAt,
    closedAt: dispute.closedAt,
    evidence: evidence
      ? {
          providerStatus: evidence.providerStatus,
          submissionCount: evidence.submissionCount,
          hasEvidence: evidence.hasEvidence,
          fileReferenceCount: evidence.fileReferences.length,
          capturedAt: evidence.capturedAt
        }
      : null
  };
}

async function listPaymentAnomalies({
  prismaClient = prisma,
  now = new Date(),
  staleMs = env.paymentOperations.staleMs,
  leaseMs = env.fulfillment.leaseMs,
  limit = 100
} = {}) {
  const staleBefore = new Date(now.getTime() - staleMs);
  const staleLeaseBefore = new Date(now.getTime() - leaseMs);
  const webhookWhere = {
    OR: [{ status: "FAILED" }, { status: "PENDING", createdAt: { lte: staleBefore } }]
  };
  const taskWhere = {
    OR: [{ status: "FAILED" }, { status: "PROCESSING", lockedAt: { lte: staleLeaseBefore } }]
  };
  const orderWhere = {
    OR: [
      { status: "PAYMENT_REVIEW" },
      { status: "PAYMENT_PROCESSING", updatedAt: { lte: staleBefore } }
    ]
  };
  const refundWhere = { status: "PENDING" };
  const alertWhere = { status: "OPEN" };
  const disputeWhere = { status: { in: ["NEEDS_RESPONSE", "UNDER_REVIEW"] } };

  const [
    webhooks,
    tasks,
    orders,
    refunds,
    alerts,
    disputes,
    webhookCount,
    taskCount,
    orderCount,
    refundCount,
    alertCount,
    disputeCount
  ] = await Promise.all([
    prismaClient.stripeWebhookEvent.findMany({
      where: webhookWhere,
      include: {
        payment: { select: { order: { select: { publicId: true } } } },
        refund: { select: { order: { select: { publicId: true } } } },
        dispute: { select: { order: { select: { publicId: true } } } }
      },
      orderBy: { createdAt: "asc" },
      take: limit
    }),
    prismaClient.fulfillmentTask.findMany({
      where: taskWhere,
      include: { order: { select: { publicId: true } } },
      orderBy: { createdAt: "asc" },
      take: limit
    }),
    prismaClient.order.findMany({
      where: orderWhere,
      include: {
        payments: {
          select: { status: true, providerStatus: true, providerPaymentId: true },
          orderBy: { checkoutVersion: "desc" },
          take: 1
        }
      },
      orderBy: { updatedAt: "asc" },
      take: limit
    }),
    prismaClient.refund.findMany({
      where: refundWhere,
      include: {
        order: { select: { publicId: true } },
        payment: { select: { status: true } },
        requestedBy: { select: { id: true, username: true, email: true } }
      },
      orderBy: { createdAt: "asc" },
      take: limit
    }),
    prismaClient.paymentOperatorAlert.findMany({
      where: alertWhere,
      include: {
        order: { select: { publicId: true, status: true } },
        payment: { select: { status: true } }
      },
      orderBy: { createdAt: "asc" },
      take: limit
    }),
    prismaClient.dispute.findMany({
      where: disputeWhere,
      include: {
        order: { select: { publicId: true } },
        evidenceAudits: { orderBy: { capturedAt: "desc" }, take: 1 }
      },
      orderBy: [{ evidenceDueAt: "asc" }, { createdAt: "asc" }],
      take: limit
    }),
    prismaClient.stripeWebhookEvent.count({ where: webhookWhere }),
    prismaClient.fulfillmentTask.count({ where: taskWhere }),
    prismaClient.order.count({ where: orderWhere }),
    prismaClient.refund.count({ where: refundWhere }),
    prismaClient.paymentOperatorAlert.count({ where: alertWhere }),
    prismaClient.dispute.count({ where: disputeWhere })
  ]);

  return {
    generatedAt: now,
    summary: {
      webhooks: webhookCount,
      tasks: taskCount,
      orders: orderCount,
      refunds: refundCount,
      alerts: alertCount,
      disputes: disputeCount,
      total: webhookCount + taskCount + orderCount + refundCount + alertCount + disputeCount
    },
    webhooks: webhooks.map(serializeWebhook),
    tasks: tasks.map(serializeTask),
    orders: orders.map(serializeOrder),
    refunds: refunds.map(serializeRefund),
    alerts: alerts.map(serializeOperatorAlert),
    disputes: disputes.map(serializeDispute)
  };
}

async function writeAudit(transaction, { userId, action, entityType, entityId, ipAddress }) {
  await transaction.auditLog.create({
    data: { userId, action, entityType, entityId, ipAddress, createdAt: new Date() }
  });
}

async function requeueFulfillmentTask({
  taskId,
  requestedByUserId,
  ipAddress,
  prismaClient = prisma,
  now = new Date()
}) {
  if (!Number.isSafeInteger(taskId) || taskId < 1) {
    throw new PaymentOperationsError("INVALID_FULFILLMENT_TASK_ID", "Invalid task id", 400);
  }

  return prismaClient.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${taskId})::text AS lock`;
    const task = await transaction.fulfillmentTask.findUnique({
      where: { id: taskId },
      include: { order: { select: { publicId: true } } }
    });
    if (!task) {
      throw new PaymentOperationsError("FULFILLMENT_TASK_NOT_FOUND", "Task not found", 404);
    }
    if (task.status === "PENDING" || task.status === "PROCESSING") {
      return { queued: false, task: serializeTask(task) };
    }
    if (task.status !== "FAILED") {
      throw new PaymentOperationsError(
        "FULFILLMENT_TASK_NOT_REPLAYABLE",
        "Only failed tasks can be replayed",
        409
      );
    }

    const updated = await transaction.fulfillmentTask.update({
      where: { id: task.id },
      data: {
        status: "PENDING",
        attemptCount: 0,
        availableAt: now,
        lockedAt: null,
        leaseToken: null,
        processedAt: null,
        effectReference: null
      },
      include: { order: { select: { publicId: true } } }
    });
    await writeAudit(transaction, {
      userId: requestedByUserId,
      action: "FULFILLMENT_TASK_REPLAY_REQUESTED",
      entityType: "FULFILLMENT_TASK",
      entityId: String(task.id),
      ipAddress
    });
    return { queued: true, task: serializeTask(updated) };
  });
}

async function replayStripeWebhook({
  eventId,
  requestedByUserId,
  ipAddress,
  prismaClient = prisma,
  stripeClient = getStripeClient(),
  eventProcessor = processVerifiedStripeEvent,
  expectedLivemode = env.nodeEnv === "production" ? true : undefined
}) {
  if (!STRIPE_EVENT_ID_PATTERN.test(eventId || "") || eventId.startsWith("evt_reconcile_")) {
    throw new PaymentOperationsError("WEBHOOK_NOT_REPLAYABLE", "Webhook cannot be replayed", 409);
  }
  const stored = await prismaClient.stripeWebhookEvent.findUnique({ where: { eventId } });
  if (!stored) {
    throw new PaymentOperationsError("WEBHOOK_NOT_FOUND", "Webhook not found", 404);
  }
  if (stored.status === "PROCESSED") {
    return { replayed: false, outcome: "already_processed", eventId };
  }

  const event = await stripeClient.events.retrieve(eventId);
  const stripeObjectId = event?.data?.object?.id;
  if (
    event?.id !== stored.eventId ||
    event?.type !== stored.eventType ||
    !stripeObjectId ||
    (stored.stripeObjectId && stripeObjectId !== stored.stripeObjectId)
  ) {
    throw new PaymentOperationsError(
      "WEBHOOK_REPLAY_MISMATCH",
      "Stripe event does not match the persisted webhook",
      409
    );
  }

  const result = await eventProcessor({ event, expectedLivemode, prismaClient });
  await prismaClient.auditLog.create({
    data: {
      userId: requestedByUserId,
      action: "STRIPE_WEBHOOK_REPLAYED",
      entityType: "STRIPE_WEBHOOK_EVENT",
      entityId: eventId,
      ipAddress,
      createdAt: new Date()
    }
  });
  return { replayed: true, eventId, outcome: result.outcome };
}

async function reconcileOrderWithStripe({
  orderPublicId,
  requestedByUserId,
  ipAddress,
  prismaClient = prisma,
  stripeClient = getStripeClient(),
  reconciler = reconcilePaymentIntent,
  expectedLivemode = env.nodeEnv === "production" ? true : undefined
}) {
  if (!UUID_PATTERN.test(orderPublicId || "")) {
    throw new PaymentOperationsError("ORDER_NOT_FOUND", "Order not found", 404);
  }
  const order = await prismaClient.order.findUnique({
    where: { publicId: orderPublicId },
    include: { payments: { orderBy: { checkoutVersion: "desc" }, take: 1 } }
  });
  const payment = order?.payments[0];
  if (!order || !payment?.providerPaymentId) {
    throw new PaymentOperationsError("ORDER_NOT_RECONCILABLE", "Order cannot be reconciled", 409);
  }

  const intent = await stripeClient.paymentIntents.retrieve(payment.providerPaymentId);
  if (typeof expectedLivemode === "boolean" && intent.livemode !== expectedLivemode) {
    throw new PaymentOperationsError(
      "PAYMENT_MODE_MISMATCH",
      "Stripe payment mode does not match this environment",
      409
    );
  }
  const result = await reconciler({
    intent,
    localPaymentStatus: payment.status,
    prismaClient
  });
  await prismaClient.auditLog.create({
    data: {
      userId: requestedByUserId,
      action: "PAYMENT_ORDER_RECONCILIATION_REQUESTED",
      entityType: "ORDER",
      entityId: order.publicId,
      ipAddress,
      createdAt: new Date()
    }
  });
  return {
    reconciled: result.reconciled,
    eventType: result.eventType,
    outcome: result.result?.outcome || (result.reconciled ? "applied" : "deferred")
  };
}

function stripeId(value) {
  return typeof value === "string" ? value : value?.id;
}

function stripeFileReferences(evidence) {
  return [
    ...new Set(
      Object.values(evidence || {}).filter(
        (value) => typeof value === "string" && /^file_[A-Za-z0-9_]+$/.test(value)
      )
    )
  ].sort();
}

async function syncDisputeEvidenceAudit({
  disputeId,
  requestedByUserId,
  ipAddress,
  prismaClient = prisma,
  stripeClient = getStripeClient(),
  expectedLivemode = env.nodeEnv === "production" ? true : undefined,
  now = new Date()
}) {
  if (!STRIPE_DISPUTE_ID_PATTERN.test(disputeId || "")) {
    throw new PaymentOperationsError("DISPUTE_NOT_FOUND", "Dispute not found", 404);
  }
  const local = await prismaClient.dispute.findUnique({
    where: { providerDisputeId: disputeId },
    include: { payment: true }
  });
  if (!local) {
    throw new PaymentOperationsError("DISPUTE_NOT_FOUND", "Dispute not found", 404);
  }

  const stripeDispute = await stripeClient.disputes.retrieve(disputeId);
  if (
    stripeDispute?.id !== local.providerDisputeId ||
    stripeId(stripeDispute.charge) !== local.providerChargeId ||
    (stripeId(stripeDispute.payment_intent) &&
      stripeId(stripeDispute.payment_intent) !== local.payment.providerPaymentId)
  ) {
    throw new PaymentOperationsError(
      "DISPUTE_EVIDENCE_MISMATCH",
      "Stripe dispute does not match the persisted payment",
      409
    );
  }
  if (typeof expectedLivemode === "boolean" && stripeDispute.livemode !== expectedLivemode) {
    throw new PaymentOperationsError(
      "PAYMENT_MODE_MISMATCH",
      "Stripe dispute mode does not match this environment",
      409
    );
  }

  const submissionCount = Number.isSafeInteger(stripeDispute.evidence_details?.submission_count)
    ? stripeDispute.evidence_details.submission_count
    : 0;
  const fileReferences = stripeFileReferences(stripeDispute.evidence);
  const record = await prismaClient.$transaction(async (transaction) => {
    const audit = await transaction.disputeEvidenceAudit.create({
      data: {
        disputeId: local.id,
        capturedByUserId: requestedByUserId,
        providerStatus: String(stripeDispute.status || "unknown"),
        submissionCount,
        hasEvidence: stripeDispute.evidence_details?.has_evidence === true,
        fileReferences,
        capturedAt: now
      }
    });
    await writeAudit(transaction, {
      userId: requestedByUserId,
      action: "STRIPE_DISPUTE_EVIDENCE_SYNCHRONIZED",
      entityType: "DISPUTE",
      entityId: local.providerDisputeId,
      ipAddress
    });
    return audit;
  });
  return {
    disputeId: local.providerDisputeId,
    providerStatus: record.providerStatus,
    submissionCount: record.submissionCount,
    hasEvidence: record.hasEvidence,
    fileReferences: record.fileReferences,
    capturedAt: record.capturedAt
  };
}

function financialStateIsCoherent(orderStatus, paymentStatus) {
  const expected = {
    PENDING_PAYMENT: ["PENDING"],
    PAYMENT_PROCESSING: ["PROCESSING"],
    PAYMENT_FAILED: ["FAILED"],
    PAID: ["SUCCEEDED"],
    CANCELED: ["CANCELED"],
    PARTIALLY_REFUNDED: ["PARTIALLY_REFUNDED"],
    REFUNDED: ["REFUNDED"]
  };
  return expected[orderStatus]?.includes(paymentStatus) || false;
}

async function resolveOperatorAlert({
  alertId,
  resolutionCode,
  requestedByUserId,
  ipAddress,
  prismaClient = prisma,
  now = new Date()
}) {
  if (!Number.isSafeInteger(alertId) || alertId < 1) {
    throw new PaymentOperationsError("INVALID_OPERATOR_ALERT_ID", "Invalid alert id", 400);
  }
  if (!RESOLUTION_CODES.has(resolutionCode)) {
    throw new PaymentOperationsError("INVALID_RESOLUTION_CODE", "Invalid resolution code", 400);
  }

  return prismaClient.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${alertId})::text AS lock`;
    const alert = await transaction.paymentOperatorAlert.findUnique({
      where: { id: alertId },
      include: { order: true, payment: true }
    });
    if (!alert) {
      throw new PaymentOperationsError("OPERATOR_ALERT_NOT_FOUND", "Alert not found", 404);
    }
    if (alert.status === "RESOLVED") return { resolved: false, alertId };
    if (!financialStateIsCoherent(alert.order.status, alert.payment?.status)) {
      throw new PaymentOperationsError(
        "PAYMENT_STATE_STILL_INCOHERENT",
        "The payment state must be reconciled before resolving the alert",
        409
      );
    }

    await transaction.paymentOperatorAlert.update({
      where: { id: alert.id },
      data: { status: "RESOLVED", resolvedAt: now }
    });
    await writeAudit(transaction, {
      userId: requestedByUserId,
      action: `PAYMENT_ALERT_RESOLVED_${resolutionCode}`,
      entityType: "PAYMENT_OPERATOR_ALERT",
      entityId: String(alert.id),
      ipAddress
    });
    return { resolved: true, alertId };
  });
}

async function notifyPaymentAnomalies({
  prismaClient = prisma,
  redisClient = redis,
  alertSender = sendPaymentOperationsAlert,
  now = new Date(),
  cooldownSeconds = env.paymentOperations.alertCooldownSeconds
} = {}) {
  const anomalies = await listPaymentAnomalies({ prismaClient, now, limit: 1 });
  const categories = [
    {
      code: "PAYMENT_WEBHOOK_ANOMALIES",
      count: anomalies.summary.webhooks,
      reference: anomalies.webhooks[0]?.eventId,
      occurredAt: anomalies.webhooks[0]?.createdAt,
      recommendedAction: "Inspect and replay the verified Stripe event from payment supervision"
    },
    {
      code: "PAYMENT_FULFILLMENT_ANOMALIES",
      count: anomalies.summary.tasks,
      reference: anomalies.tasks[0] ? `task:${anomalies.tasks[0].id}` : null,
      occurredAt: anomalies.tasks[0]?.lockedAt || anomalies.tasks[0]?.availableAt,
      recommendedAction: "Inspect the handler error and requeue the idempotent task"
    },
    {
      code: "PAYMENT_ORDER_ANOMALIES",
      count: anomalies.summary.orders,
      reference: anomalies.orders[0]?.id,
      occurredAt: anomalies.orders[0]?.updatedAt,
      recommendedAction: "Reconcile the order from Stripe; never force it to paid"
    },
    {
      code: "PAYMENT_REFUNDS_PENDING",
      count: anomalies.summary.refunds,
      reference: anomalies.refunds[0]?.id,
      occurredAt: anomalies.refunds[0]?.createdAt,
      recommendedAction:
        "Review the pending refund in payment supervision and wait for webhook confirmation"
    },
    {
      code: "PAYMENT_DISPUTES_OPEN",
      count: anomalies.summary.disputes,
      reference: anomalies.disputes[0]?.id,
      occurredAt: anomalies.disputes[0]?.createdAt,
      deadlineAt: anomalies.disputes[0]?.evidenceDueAt,
      recommendedAction: "Review the dispute and its evidence deadline in payment supervision"
    },
    {
      code: "PAYMENT_OPERATOR_ALERTS_OPEN",
      count: anomalies.summary.alerts,
      reference: anomalies.alerts[0] ? `alert:${anomalies.alerts[0].id}` : null,
      occurredAt: anomalies.alerts[0]?.createdAt,
      recommendedAction: "Reconcile the financial state before resolving the alert"
    }
  ];
  let notified = 0;

  for (const category of categories) {
    const { code, count, reference, occurredAt, deadlineAt, recommendedAction } = category;
    if (count === 0) continue;
    const key = `payment-operations:alert:${code}`;
    const acquired = await redisClient.set(key, "1", {
      NX: true,
      EX: cooldownSeconds
    });
    if (acquired !== "OK") continue;
    const occurredAtMs = occurredAt ? new Date(occurredAt).getTime() : NaN;
    const ageSeconds = Number.isFinite(occurredAtMs)
      ? Math.max(0, Math.floor((now.getTime() - occurredAtMs) / 1000))
      : null;
    try {
      await alertSender({
        code,
        count,
        reference,
        ageSeconds,
        ...(deadlineAt ? { deadlineAt } : {}),
        recommendedAction
      });
      notified += 1;
    } catch (error) {
      // A failed delivery must not suppress the next sweep for the whole cooldown window.
      try {
        await redisClient.del(key);
      } catch (_redisError) {
        // Keep the original notification error for scheduler diagnostics.
      }
      throw error;
    }
  }
  return { ...anomalies.summary, notified };
}

module.exports = {
  PaymentOperationsError,
  RESOLUTION_CODES,
  financialStateIsCoherent,
  listPaymentAnomalies,
  notifyPaymentAnomalies,
  reconcileOrderWithStripe,
  replayStripeWebhook,
  requeueFulfillmentTask,
  resolveOperatorAlert,
  stripeFileReferences,
  syncDisputeEvidenceAudit
};
