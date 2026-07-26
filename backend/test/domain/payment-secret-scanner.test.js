const test = require("node:test");
const assert = require("node:assert/strict");

const { scanPaymentSecrets } = require("../../src/lib/payment-secret-scanner");

test("the repository scanner detects Stripe server, webhook and client secrets", () => {
  const content = [
    ["sk", "test", "a".repeat(32)].join("_"),
    ["rk", "live", "b".repeat(32)].join("_"),
    `whsec_${"c".repeat(32)}`,
    `pi_payment_reference_secret_${"d".repeat(32)}`
  ].join("\n");

  assert.deepEqual(
    scanPaymentSecrets(content).map((finding) => finding.code),
    ["STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_CLIENT_SECRET"]
  );
});

test("publishable keys, placeholders and regular Stripe identifiers are allowed", () => {
  const content = [
    ["pk", "test", "publicvalue"].join("_"),
    "replace_with_stripe_live_secret_key",
    "pi_safe_payment_identifier",
    "evt_safe_event_identifier"
  ].join("\n");

  assert.deepEqual(scanPaymentSecrets(content), []);
});
