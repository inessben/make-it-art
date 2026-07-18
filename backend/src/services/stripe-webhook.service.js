const prisma = require("../lib/prisma");
const env = require("../config/env");
const { getStripeClient } = require("../lib/stripe");
const { processStripePaymentEvent } = require("./payment-finalization.service");
const { processStripeRefundEvent } = require("./refund-finalization.service");

const SUPPORTED_STRIPE_EVENT_TYPES = new Set([
  "payment_intent.processing",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "refund.created",
  "refund.updated",
  "refund.failed"
]);

class StripeWebhookError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = "StripeWebhookError";
    this.code = code;
    this.status = status;
  }
}

function verifyStripeEvent({ rawBody, signature, stripeClient, webhookSecret }) {
  if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
    throw new StripeWebhookError(
      "STRIPE_WEBHOOK_NOT_CONFIGURED",
      "Stripe webhook is not configured",
      503
    );
  }

  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0 || typeof signature !== "string") {
    throw new StripeWebhookError("INVALID_STRIPE_SIGNATURE", "Invalid Stripe signature", 400);
  }

  try {
    // Intentionally omit the tolerance argument: stripe-node keeps its secure
    // five-minute default, including the timestamp recency check.
    return stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (_error) {
    throw new StripeWebhookError("INVALID_STRIPE_SIGNATURE", "Invalid Stripe signature", 400);
  }
}

async function receiveStripeWebhook({
  rawBody,
  signature,
  stripeClient,
  webhookSecret = env.stripe.webhookSecret,
  prismaClient = prisma,
  processPaymentEvent = processStripePaymentEvent,
  processRefundEvent = processStripeRefundEvent
}) {
  if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
    throw new StripeWebhookError(
      "STRIPE_WEBHOOK_NOT_CONFIGURED",
      "Stripe webhook is not configured",
      503
    );
  }

  const event = verifyStripeEvent({
    rawBody,
    signature,
    stripeClient: stripeClient || getStripeClient(),
    webhookSecret
  });

  if (!event || typeof event.id !== "string" || typeof event.type !== "string") {
    throw new StripeWebhookError("INVALID_STRIPE_EVENT", "Invalid Stripe event", 400);
  }

  if (!SUPPORTED_STRIPE_EVENT_TYPES.has(event.type)) {
    return { eventId: event.id, accepted: true, ignored: true, duplicate: false };
  }

  const processing = event.type.startsWith("refund.")
    ? await processRefundEvent({ event, prismaClient })
    : await processPaymentEvent({ event, prismaClient });

  if (processing.retryable) {
    throw new StripeWebhookError(
      "STRIPE_WEBHOOK_PROCESSING_RETRY",
      "Stripe webhook processing must be retried",
      500
    );
  }

  return {
    eventId: event.id,
    accepted: true,
    ignored: false,
    duplicate: processing.duplicate,
    outcome: processing.outcome
  };
}

module.exports = {
  SUPPORTED_STRIPE_EVENT_TYPES,
  StripeWebhookError,
  receiveStripeWebhook,
  verifyStripeEvent
};
