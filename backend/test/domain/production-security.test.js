const test = require("node:test");
const assert = require("node:assert/strict");

const { validateProductionConfig } = require("../../src/config/validate-production");
const { sanitizePaymentLog } = require("../../src/lib/payment-logger");
const {
  eventTypeForIntent,
  recordInvalidWebhookSignature
} = require("../../src/services/payment-monitoring.service");

function productionConfig(overrides = {}) {
  return {
    nodeEnv: "production",
    appBaseUrl: "https://www.makeitart.io",
    corsOrigin: "https://www.makeitart.io",
    jwtSecret: "a-strong-production-secret-with-32-chars",
    paymentAlertEmail: "payments-alerts@makeitart.io",
    stripe: {
      secretKey: "rk_live_restrictedpaymentkey",
      webhookSecret: "whsec_liveendpointsecret",
      checkoutExpirationSweepMs: 60000
    },
    ...overrides
  };
}

test("production refuses missing, placeholder, or test payment secrets", () => {
  assert.doesNotThrow(() => validateProductionConfig(productionConfig()));
  for (const secretKey of ["", "sk_test_forbidden", "replace_with_stripe_live_secret_key"]) {
    assert.throws(
      () =>
        validateProductionConfig(
          productionConfig({ stripe: { ...productionConfig().stripe, secretKey } })
        ),
      /Unsafe production configuration/
    );
  }
});

test("payment logs keep only allowlisted technical metadata and redact secret values", () => {
  const sanitized = sanitizePaymentLog({
    status: "FAILED",
    code: "sk_live_supersecret",
    durationMs: 42,
    email: "buyer@example.test",
    cookie: "mia_session=secret",
    body: { card: "4242" }
  });
  assert.deepEqual(sanitized, {
    status: "FAILED",
    code: "[REDACTED]",
    durationMs: 42
  });
});

test("reconciliation maps only authoritative terminal or processing states", () => {
  assert.equal(eventTypeForIntent({ status: "succeeded" }, "PENDING"), "payment_intent.succeeded");
  assert.equal(
    eventTypeForIntent({ status: "processing" }, "PENDING"),
    "payment_intent.processing"
  );
  assert.equal(
    eventTypeForIntent({ status: "requires_payment_method" }, "PROCESSING"),
    "payment_intent.payment_failed"
  );
  assert.equal(eventTypeForIntent({ status: "requires_action" }, "PENDING"), null);
});

test("repeated invalid webhook signatures emit one threshold alert without storing the IP", async () => {
  const values = new Map();
  const alerts = [];
  const redisClient = {
    async incr(key) {
      values.set(key, (values.get(key) || 0) + 1);
      return values.get(key);
    },
    async expire() {}
  };
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await recordInvalidWebhookSignature({
      ip: "203.0.113.42",
      redisClient,
      alertSender: async (alert) => alerts.push(alert)
    });
  }
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].code, "INVALID_STRIPE_SIGNATURE_THRESHOLD");
  assert.doesNotMatch([...values.keys()][0], /203\.0\.113\.42/);
});
