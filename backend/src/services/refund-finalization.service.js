const prisma = require("../lib/prisma");
const { canTransitionOrder, canTransitionPayment } = require("../domain/payment-state");

const REFUND_EVENT_TYPES = new Set(["refund.created", "refund.updated", "refund.failed"]);
const FINAL_REFUND_STATUSES = new Set(["SUCCEEDED", "FAILED"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class RefundFinalizationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RefundFinalizationError";
    this.code = code;
  }
}

function stripeId(value) {
  return typeof value === "string" ? value : value?.id;
}

function providerReference(stripeRefund) {
  const reference =
    stripeRefund.destination_details?.card?.reference || stripeRefund.receipt_number;
  return typeof reference === "string" && reference.length <= 255 ? reference : null;
}

function targetRefundStatus(event) {
  if (event.type === "refund.failed") return "FAILED";
  if (event.data.object.status === "succeeded") return "SUCCEEDED";
  if (["failed", "canceled"].includes(event.data.object.status)) return "FAILED";
  return "PENDING";
}

function validateStripeRefund(stripeRefund, refund) {
  const errors = [];
  if (refund.providerRefundId && refund.providerRefundId !== stripeRefund.id) {
    errors.push("REFUND_ID_MISMATCH");
  }
  if (stripeId(stripeRefund.payment_intent) !== refund.payment.providerPaymentId) {
    errors.push("REFUND_PAYMENT_INTENT_MISMATCH");
  }
  if (stripeRefund.amount !== refund.amount) errors.push("REFUND_AMOUNT_MISMATCH");
  if (stripeRefund.currency !== refund.currency.toLowerCase()) {
    errors.push("REFUND_CURRENCY_MISMATCH");
  }
  if (stripeRefund.metadata?.order_id && stripeRefund.metadata.order_id !== refund.order.publicId) {
    errors.push("REFUND_ORDER_MISMATCH");
  }
  return errors;
}

function transitionAudit(event, refund, entityType, previousStatus, nextStatus) {
  return {
    orderId: refund.orderId,
    paymentId: refund.paymentId,
    stripeEventId: event.id,
    stripeObjectId: event.data.object.id,
    entityType,
    previousStatus,
    nextStatus,
    reasonCode: event.type
  };
}

async function flagRefundForReview(transaction, event, refund, validationErrors) {
  await transaction.paymentOperatorAlert.create({
    data: {
      orderId: refund.orderId,
      paymentId: refund.paymentId,
      stripeEventId: event.id,
      stripeObjectId: event.data.object.id,
      code: validationErrors.sort().join("+")
    }
  });
}

async function notifyRefundStatus(transaction, refund, status) {
  await transaction.fulfillmentTask.createMany({
    data: [
      {
        orderId: refund.orderId,
        taskType: "SEND_REFUND_STATUS",
        taskKey: `refund:${refund.publicId}:SEND_REFUND_STATUS:${status}`
      }
    ],
    skipDuplicates: true
  });
}

async function applySucceededRefund(transaction, event, refund, stripeRefund) {
  const previousRefundStatus = refund.status;
  const reference = providerReference(stripeRefund);
  await transaction.refund.update({
    where: { id: refund.id },
    data: {
      providerRefundId: stripeRefund.id,
      providerStatus: stripeRefund.status,
      ...(reference ? { providerReference: reference } : {}),
      status: "SUCCEEDED",
      failureCode: null,
      succeededAt: refund.succeededAt || new Date()
    }
  });

  if (previousRefundStatus !== "SUCCEEDED") {
    await transaction.financialTransition.create({
      data: transitionAudit(event, refund, "REFUND", previousRefundStatus, "SUCCEEDED")
    });
  }

  const aggregate = await transaction.refund.aggregate({
    where: { paymentId: refund.paymentId, status: "SUCCEEDED" },
    _sum: { amount: true }
  });
  const refundedAmount = aggregate._sum.amount || 0;
  if (refundedAmount > refund.payment.amount) {
    throw new RefundFinalizationError(
      "REFUND_TOTAL_EXCEEDS_PAYMENT",
      "Confirmed refunds exceed payment amount"
    );
  }

  const nextStatus = refundedAmount === refund.payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";
  if (
    refund.payment.status !== nextStatus &&
    canTransitionPayment(refund.payment.status, nextStatus)
  ) {
    await transaction.payment.update({
      where: { id: refund.paymentId },
      data: { status: nextStatus, refundedAmount }
    });
    await transaction.financialTransition.create({
      data: transitionAudit(event, refund, "PAYMENT", refund.payment.status, nextStatus)
    });
  } else {
    await transaction.payment.update({
      where: { id: refund.paymentId },
      data: { refundedAmount }
    });
  }

  if (refund.order.status !== nextStatus && canTransitionOrder(refund.order.status, nextStatus)) {
    await transaction.order.update({ where: { id: refund.orderId }, data: { status: nextStatus } });
    await transaction.financialTransition.create({
      data: transitionAudit(event, refund, "ORDER", refund.order.status, nextStatus)
    });
  }

  if (nextStatus === "REFUNDED") {
    await transaction.fulfillmentTask.updateMany({
      where: {
        orderId: refund.orderId,
        taskType: "GRANT_DOWNLOAD_RIGHTS",
        status: "PENDING"
      },
      data: { status: "CANCELED" }
    });
    await transaction.fulfillmentTask.createMany({
      data: [
        {
          orderId: refund.orderId,
          taskType: "REVOKE_DOWNLOAD_RIGHTS",
          taskKey: `order:${refund.order.publicId}:REVOKE_DOWNLOAD_RIGHTS`
        }
      ],
      skipDuplicates: true
    });
  }
  await notifyRefundStatus(transaction, refund, "SUCCEEDED");
}

async function applyFailedRefund(transaction, event, refund, stripeRefund) {
  const previousStatus = refund.status;
  const reference = providerReference(stripeRefund);
  await transaction.refund.update({
    where: { id: refund.id },
    data: {
      providerRefundId: stripeRefund.id,
      providerStatus: stripeRefund.status || "failed",
      ...(reference ? { providerReference: reference } : {}),
      status: "FAILED",
      failureCode: stripeRefund.failure_reason || "REFUND_FAILED",
      failedAt: refund.failedAt || new Date()
    }
  });
  if (previousStatus !== "FAILED") {
    await transaction.financialTransition.create({
      data: transitionAudit(event, refund, "REFUND", previousStatus, "FAILED")
    });
  }
  await notifyRefundStatus(transaction, refund, "FAILED");
}

async function applyRefundEvent(transaction, event, refund) {
  const stripeRefund = event.data.object;
  const validationErrors = validateStripeRefund(stripeRefund, refund);
  if (validationErrors.length > 0) {
    await flagRefundForReview(transaction, event, refund, validationErrors);
    return { outcome: "review", validationErrors };
  }

  const targetStatus = targetRefundStatus(event);
  if (FINAL_REFUND_STATUSES.has(refund.status) && refund.status !== targetStatus) {
    const reference = providerReference(stripeRefund);
    await transaction.refund.update({
      where: { id: refund.id },
      data: {
        providerRefundId: stripeRefund.id,
        ...(reference ? { providerReference: reference } : {})
      }
    });
    return { outcome: "ignored_terminal_transition" };
  }

  if (targetStatus === "SUCCEEDED") {
    await applySucceededRefund(transaction, event, refund, stripeRefund);
  } else if (targetStatus === "FAILED") {
    await applyFailedRefund(transaction, event, refund, stripeRefund);
  } else {
    const reference = providerReference(stripeRefund);
    await transaction.refund.update({
      where: { id: refund.id },
      data: {
        providerRefundId: stripeRefund.id,
        providerStatus: stripeRefund.status || "pending",
        ...(reference ? { providerReference: reference } : {})
      }
    });
  }
  return { outcome: targetStatus === "PENDING" ? "pending" : "applied" };
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
      lastErrorCode: error.code || "REFUND_EVENT_PROCESSING_FAILED"
    },
    update: {
      status: "FAILED",
      attemptCount: { increment: 1 },
      lastErrorCode: error.code || "REFUND_EVENT_PROCESSING_FAILED"
    }
  });
}

async function processStripeRefundEvent({ event, prismaClient = prisma }) {
  if (!REFUND_EVENT_TYPES.has(event.type) || !event.data?.object?.id) {
    throw new RefundFinalizationError("INVALID_REFUND_EVENT", "Invalid refund event");
  }

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prismaClient.$transaction(
        async (transaction) => {
          await transaction.stripeWebhookEvent.upsert({
            where: { eventId: event.id },
            create: {
              eventId: event.id,
              eventType: event.type,
              stripeObjectId: event.data.object.id
            },
            update: {}
          });
          await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${event.data.object.id}, 0))::text AS lock`;
          const eventPaymentIntentId = stripeId(event.data.object.payment_intent);
          if (eventPaymentIntentId) {
            await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${eventPaymentIntentId}, 0))::text AS payment_lock`;
          }

          const storedEvent = await transaction.stripeWebhookEvent.findUnique({
            where: { eventId: event.id }
          });
          if (storedEvent.status === "PROCESSED") {
            return { duplicate: true, outcome: "already_processed" };
          }

          const localRefundId = event.data.object.metadata?.local_refund_id;
          const refund = await transaction.refund.findFirst({
            where: {
              OR: [
                { providerRefundId: event.data.object.id },
                ...(UUID_PATTERN.test(localRefundId || "") ? [{ publicId: localRefundId }] : [])
              ]
            },
            include: { payment: true, order: true }
          });
          if (!refund) {
            await transaction.stripeWebhookEvent.update({
              where: { eventId: event.id },
              data: {
                status: "FAILED",
                attemptCount: { increment: 1 },
                lastErrorCode: "REFUND_NOT_FOUND"
              }
            });
            return { duplicate: false, outcome: "retry", retryable: true };
          }

          const result = await applyRefundEvent(transaction, event, refund);
          await transaction.stripeWebhookEvent.update({
            where: { eventId: event.id },
            data: {
              paymentId: refund.paymentId,
              refundId: refund.id,
              status: "PROCESSED",
              attemptCount: { increment: 1 },
              lastErrorCode: null,
              processedAt: new Date()
            }
          });
          return { duplicate: false, ...result };
        },
        { isolationLevel: "Serializable" }
      );
    } catch (error) {
      lastError = error;
      if (error.code !== "P2034" || attempt === 3) break;
    }
  }
  await persistFailedEvent(prismaClient, event, lastError);
  throw lastError;
}

module.exports = {
  REFUND_EVENT_TYPES,
  RefundFinalizationError,
  processStripeRefundEvent,
  targetRefundStatus,
  validateStripeRefund
};
