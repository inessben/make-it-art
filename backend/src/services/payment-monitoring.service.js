const crypto = require("node:crypto");
const prisma = require("../lib/prisma");
const { redis } = require("../lib/redis");
const { logPaymentEvent } = require("../lib/payment-logger");
const { getStripeClient } = require("../lib/stripe");
const { processStripePaymentEvent } = require("./payment-finalization.service");
const { sendPaymentOperationsAlert } = require("./mail.service");

const INVALID_SIGNATURE_THRESHOLD = 10;

async function recordInvalidWebhookSignature({
  ip,
  redisClient = redis,
  alertSender = sendPaymentOperationsAlert
}) {
  const ipDigest = crypto
    .createHash("sha256")
    .update(ip || "unknown")
    .digest("hex")
    .slice(0, 16);
  const bucket = Math.floor(Date.now() / 60000);
  const key = `payment-security:invalid-signature:${bucket}:${ipDigest}`;
  const count = await redisClient.incr(key);
  if (count === 1) await redisClient.expire(key, 120);
  if (count === INVALID_SIGNATURE_THRESHOLD) {
    logPaymentEvent(
      "invalid_webhook_signature_threshold",
      {
        code: "INVALID_STRIPE_SIGNATURE",
        count
      },
      "warn"
    );
    await alertSender({ code: "INVALID_STRIPE_SIGNATURE_THRESHOLD", count });
  }
  return count;
}

function eventTypeForIntent(intent, localStatus) {
  if (intent.status === "succeeded") return "payment_intent.succeeded";
  if (intent.status === "processing" || intent.status === "requires_capture") {
    return "payment_intent.processing";
  }
  if (intent.status === "canceled") return "payment_intent.canceled";
  if (intent.status === "requires_payment_method" && localStatus === "PROCESSING") {
    return "payment_intent.payment_failed";
  }
  return null;
}

async function reconcileStalePayments({
  prismaClient = prisma,
  stripeClient = getStripeClient(),
  now = new Date()
} = {}) {
  const staleBefore = new Date(now.getTime() - 5 * 60 * 1000);
  const orders = await prismaClient.order.findMany({
    where: {
      status: { in: ["PENDING_PAYMENT", "PAYMENT_PROCESSING"] },
      updatedAt: { lte: staleBefore }
    },
    include: { payments: { orderBy: { checkoutVersion: "desc" }, take: 1 } },
    take: 100
  });
  const summary = { scanned: orders.length, repaired: 0, deferred: 0, failed: 0 };

  for (const order of orders) {
    const payment = order.payments[0];
    if (!payment?.providerPaymentId) {
      summary.deferred += 1;
      continue;
    }
    try {
      const intent = await stripeClient.paymentIntents.retrieve(payment.providerPaymentId);
      const eventType = eventTypeForIntent(intent, payment.status);
      if (!eventType) {
        summary.deferred += 1;
        continue;
      }
      const digest = crypto
        .createHash("sha256")
        .update(`${intent.id}:${intent.status}:${intent.latest_charge || "none"}`)
        .digest("hex");
      await processStripePaymentEvent({
        event: { id: `evt_reconcile_${digest}`, type: eventType, data: { object: intent } },
        prismaClient
      });
      summary.repaired += 1;
    } catch (error) {
      summary.failed += 1;
      logPaymentEvent(
        "reconciliation_failed",
        {
          code: error.code || "RECONCILIATION_FAILED",
          paymentIntentId: payment.providerPaymentId,
          orderId: order.publicId
        },
        "error"
      );
    }
  }
  if (summary.failed > 0) {
    await sendPaymentOperationsAlert({
      code: "PAYMENT_RECONCILIATION_FAILED",
      count: summary.failed
    });
  }
  return summary;
}

module.exports = {
  INVALID_SIGNATURE_THRESHOLD,
  eventTypeForIntent,
  reconcileStalePayments,
  recordInvalidWebhookSignature
};
