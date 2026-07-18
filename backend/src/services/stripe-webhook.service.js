const prisma = require("../lib/prisma");
const env = require("../config/env");
const { getStripeClient } = require("../lib/stripe");

const SUPPORTED_STRIPE_EVENT_TYPES = new Set([
  "payment_intent.processing",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled"
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

function isUniqueConstraintError(error) {
  return error && error.code === "P2002";
}

async function receiveStripeWebhook({
  rawBody,
  signature,
  stripeClient,
  webhookSecret = env.stripe.webhookSecret,
  prismaClient = prisma
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

  const stripeObjectId =
    event.data && event.data.object && typeof event.data.object.id === "string"
      ? event.data.object.id
      : null;

  try {
    await prismaClient.stripeWebhookEvent.create({
      data: {
        eventId: event.id,
        eventType: event.type,
        stripeObjectId
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { eventId: event.id, accepted: true, ignored: false, duplicate: true };
    }

    throw error;
  }

  return { eventId: event.id, accepted: true, ignored: false, duplicate: false };
}

module.exports = {
  SUPPORTED_STRIPE_EVENT_TYPES,
  StripeWebhookError,
  receiveStripeWebhook,
  verifyStripeEvent
};
