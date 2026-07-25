const crypto = require("node:crypto");
const prisma = require("../lib/prisma");
const { redis } = require("../lib/redis");
const { logPaymentEvent } = require("../lib/payment-logger");
const { getStripeClient } = require("../lib/stripe");
const {
  EVENT_TARGETS,
  processStripePaymentEvent,
  validatePaymentIntent
} = require("./payment-finalization.service");
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

function reconciliationEventForIntent(intent, eventType) {
  const latestCharge =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id || "none";
  const digest = crypto
    .createHash("sha256")
    .update(`${intent.id}:${intent.status}:${latestCharge}`)
    .digest("hex");

  return {
    id: `evt_reconcile_${digest}`,
    type: eventType,
    data: { object: intent }
  };
}

async function inspectStalePayments({
  prismaClient = prisma,
  stripeClient = getStripeClient(),
  now = new Date(),
  expectedLivemode = process.env.NODE_ENV === "production" ? true : undefined,
  staleMs = 5 * 60 * 1000,
  limit = 100
} = {}) {
  const staleBefore = new Date(now.getTime() - staleMs);
  const orders = await prismaClient.order.findMany({
    where: {
      status: { in: ["PENDING_PAYMENT", "PAYMENT_PROCESSING", "PAYMENT_FAILED"] },
      updatedAt: { lte: staleBefore }
    },
    include: { payments: { orderBy: { checkoutVersion: "desc" }, take: 1 } },
    take: limit
  });
  const rows = [];
  const summary = {
    scanned: orders.length,
    consistent: 0,
    reconcilable: 0,
    waiting: 0,
    reviewRequired: 0,
    failed: 0
  };

  for (const order of orders) {
    const payment = order.payments[0];
    if (!payment?.providerPaymentId) {
      summary.waiting += 1;
      rows.push({
        orderId: order.publicId,
        orderStatus: order.status,
        paymentStatus: payment?.status || null,
        providerStatus: null,
        outcome: "WAITING",
        validationCodes: ["PAYMENT_INTENT_NOT_LINKED"]
      });
      continue;
    }

    try {
      const intent = await stripeClient.paymentIntents.retrieve(payment.providerPaymentId);
      const validationCodes = validatePaymentIntent(intent, {
        ...payment,
        order
      });
      if (typeof expectedLivemode === "boolean" && intent.livemode !== expectedLivemode) {
        validationCodes.push("PAYMENT_MODE_MISMATCH");
      }

      const eventType = eventTypeForIntent(intent, payment.status);
      const target = EVENT_TARGETS[eventType];
      let outcome;
      if (validationCodes.length > 0) {
        outcome = "REVIEW_REQUIRED";
        summary.reviewRequired += 1;
      } else if (!target) {
        outcome = "WAITING";
        summary.waiting += 1;
      } else if (order.status === target.orderStatus && payment.status === target.paymentStatus) {
        outcome = "CONSISTENT";
        summary.consistent += 1;
      } else {
        outcome = "RECONCILE";
        summary.reconcilable += 1;
      }

      rows.push({
        orderId: order.publicId,
        orderStatus: order.status,
        paymentStatus: payment.status,
        providerStatus: intent.status,
        outcome,
        validationCodes: validationCodes.sort()
      });
    } catch (error) {
      summary.failed += 1;
      rows.push({
        orderId: order.publicId,
        orderStatus: order.status,
        paymentStatus: payment.status,
        providerStatus: null,
        outcome: "FAILED",
        validationCodes: [String(error.code || "STRIPE_RETRIEVAL_FAILED")]
      });
    }
  }

  return { summary, rows };
}

async function reconcilePaymentIntent({ intent, localPaymentStatus, prismaClient = prisma }) {
  const eventType = eventTypeForIntent(intent, localPaymentStatus);

  if (!eventType) {
    return { reconciled: false, eventType: null, result: null };
  }

  const result = await processStripePaymentEvent({
    event: reconciliationEventForIntent(intent, eventType),
    prismaClient
  });

  return { reconciled: true, eventType, result };
}

async function reconcileStalePayments({
  prismaClient = prisma,
  stripeClient = getStripeClient(),
  now = new Date(),
  alertSender = sendPaymentOperationsAlert,
  paymentReconciler = reconcilePaymentIntent,
  logger = logPaymentEvent
} = {}) {
  const staleBefore = new Date(now.getTime() - 5 * 60 * 1000);
  const orders = await prismaClient.order.findMany({
    where: {
      status: { in: ["PENDING_PAYMENT", "PAYMENT_PROCESSING", "PAYMENT_FAILED"] },
      updatedAt: { lte: staleBefore }
    },
    include: { payments: { orderBy: { checkoutVersion: "desc" }, take: 1 } },
    take: 100
  });
  const summary = {
    scanned: orders.length,
    repaired: 0,
    deferred: 0,
    mismatched: 0,
    failed: 0
  };

  for (const order of orders) {
    const payment = order.payments[0];
    if (!payment?.providerPaymentId) {
      summary.deferred += 1;
      continue;
    }
    try {
      const intent = await stripeClient.paymentIntents.retrieve(payment.providerPaymentId);
      const mismatched =
        intent.status === "succeeded" &&
        (order.status !== "PAID" || payment.status !== "SUCCEEDED");

      if (mismatched) {
        summary.mismatched += 1;
        logger(
          "payment_state_mismatch_detected",
          {
            code: "STRIPE_SUCCEEDED_LOCAL_NOT_PAID",
            status: order.status,
            paymentIntentId: payment.providerPaymentId,
            orderId: order.publicId
          },
          "warn"
        );
      }

      const reconciliation = await paymentReconciler({
        intent,
        localPaymentStatus: payment.status,
        prismaClient
      });
      if (!reconciliation.reconciled) {
        summary.deferred += 1;
        continue;
      }
      summary.repaired += 1;
    } catch (error) {
      summary.failed += 1;
      logger(
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
    await alertSender({
      code: "PAYMENT_RECONCILIATION_FAILED",
      count: summary.failed
    });
  }
  if (summary.mismatched > 0) {
    await alertSender({
      code: "PAYMENT_STATE_MISMATCH_REPAIRED",
      count: summary.mismatched
    });
  }
  return summary;
}

module.exports = {
  INVALID_SIGNATURE_THRESHOLD,
  eventTypeForIntent,
  inspectStalePayments,
  reconcilePaymentIntent,
  reconciliationEventForIntent,
  reconcileStalePayments,
  recordInvalidWebhookSignature
};
