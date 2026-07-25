const { validateProductionConfig } = require("./validate-production");

const REQUIRED_STRIPE_WEBHOOK_EVENTS = Object.freeze([
  "payment_intent.processing",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "refund.created",
  "refund.updated",
  "refund.failed",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed"
]);

const REQUIRED_PAYMENT_ACKNOWLEDGEMENTS = Object.freeze([
  "PAYMENT_ROTATION_RUNBOOK_ACK",
  "PAYMENT_CSP_REVIEW_ACK",
  "PAYMENT_ALERT_TEST_ACK",
  "PAYMENT_FISCAL_POLICY_ACK",
  "PAYMENT_ARCHITECTURE_DECISION_ACK",
  "PAYMENT_METHODS_POLICY_ACK",
  "PAYMENT_LIVE_SMOKE_TEST_APPROVED"
]);

function commaSeparatedSet(value) {
  return new Set(
    String(value || "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

function origin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function paymentGoLiveErrors({ environment = process.env, appConfig }) {
  const errors = [];

  try {
    validateProductionConfig(appConfig);
  } catch (error) {
    errors.push(error.message);
  }

  if (!/^rk_live_[A-Za-z0-9]+$/.test(appConfig?.stripe?.secretKey || "")) {
    errors.push("STRIPE_SECRET_KEY must be a least-privilege rk_live_* key");
  }
  if (!/^pk_live_[A-Za-z0-9]+$/.test(environment.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")) {
    errors.push("NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be live");
  }

  const appOrigin = origin(appConfig?.appBaseUrl);
  const publicOrigin = origin(environment.NUXT_PUBLIC_APP_BASE_URL);
  if (!appOrigin || !publicOrigin || appOrigin !== publicOrigin) {
    errors.push("NUXT_PUBLIC_APP_BASE_URL must match APP_BASE_URL");
  }

  const configuredEvents = commaSeparatedSet(environment.STRIPE_WEBHOOK_EVENTS);
  for (const event of REQUIRED_STRIPE_WEBHOOK_EVENTS) {
    if (!configuredEvents.has(event)) errors.push(`Missing webhook event: ${event}`);
  }

  if (environment.PAYMENT_METHODS_POLICY !== "card_only") {
    errors.push("PAYMENT_METHODS_POLICY must be card_only");
  }
  if (environment.PAYMENT_MERCHANT_OF_RECORD !== "MAKE_IT_ART") {
    errors.push("PAYMENT_MERCHANT_OF_RECORD must be MAKE_IT_ART");
  }

  for (const acknowledgement of REQUIRED_PAYMENT_ACKNOWLEDGEMENTS) {
    if (environment[acknowledgement] !== "true") {
      errors.push(`${acknowledgement} must be true`);
    }
  }

  return errors;
}

function validatePaymentGoLive(options) {
  const errors = paymentGoLiveErrors(options);
  if (errors.length === 0) return;

  const error = new Error(`Payment go-live validation failed: ${errors.join("; ")}`);
  error.code = "PAYMENT_GO_LIVE_VALIDATION_FAILED";
  throw error;
}

module.exports = {
  REQUIRED_PAYMENT_ACKNOWLEDGEMENTS,
  REQUIRED_STRIPE_WEBHOOK_EVENTS,
  paymentGoLiveErrors,
  validatePaymentGoLive
};
