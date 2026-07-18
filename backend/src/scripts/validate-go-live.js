const env = require("../config/env");
const { validateProductionConfig } = require("../config/validate-production");

validateProductionConfig(env);
const errors = [];
if (!/^pk_live_[A-Za-z0-9]+$/.test(process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")) {
  errors.push("NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be live");
}
const requiredEvents = [
  "payment_intent.processing",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled"
];
const configuredEvents = new Set(
  (process.env.STRIPE_WEBHOOK_EVENTS || "").split(",").map((value) => value.trim())
);
for (const event of requiredEvents) {
  if (!configuredEvents.has(event)) errors.push(`Missing webhook event: ${event}`);
}
if (!(process.env.STRIPE_WALLET_DOMAINS || "").includes("makeitart.io")) {
  errors.push("STRIPE_WALLET_DOMAINS must include makeitart.io");
}
for (const acknowledgement of [
  "PAYMENT_ROTATION_RUNBOOK_ACK",
  "PAYMENT_CSP_REVIEW_ACK",
  "PAYMENT_ALERT_TEST_ACK"
]) {
  if (process.env[acknowledgement] !== "true") errors.push(`${acknowledgement} must be true`);
}
if (errors.length > 0) throw new Error(`Go-live validation failed: ${errors.join("; ")}`);
console.log("Payment go-live configuration validated");
