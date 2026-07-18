const test = require("node:test");
const assert = require("node:assert/strict");

const { serializeOrder } = require("../../src/services/order-query.service");
const { buildPaymentConfirmationMessage } = require("../../src/services/mail.service");

test("the public order serializer excludes all provider and secret fields", () => {
  const serialized = serializeOrder({
    publicId: "75ad34cf-5ee4-4838-b36f-fac65a40f1e9",
    status: "PAID",
    totalAmount: 2500,
    currency: "EUR",
    createdAt: new Date("2026-07-18T10:00:00Z"),
    updatedAt: new Date("2026-07-18T10:01:00Z"),
    paidAt: new Date("2026-07-18T10:01:00Z"),
    payments: [
      {
        status: "SUCCEEDED",
        providerPaymentId: "pi_secret_provider_id",
        idempotencyKey: "secret-idempotency-key",
        clientSecret: "pi_secret_secret"
      }
    ],
    refunds: [
      {
        publicId: "2b8b0e03-c3a4-4a0d-aa1b-89ff86922a52",
        status: "SUCCEEDED",
        amount: 500,
        currency: "EUR",
        providerReference: "safe-refund-reference",
        providerRefundId: "re_secret_provider_id",
        createdAt: new Date("2026-07-18T11:00:00Z"),
        updatedAt: new Date("2026-07-18T11:01:00Z")
      }
    ],
    items: [
      {
        id: 1,
        artworkTitle: "Safe artwork",
        artistName: "Artist",
        quantity: 1,
        unitAmount: 2500,
        currency: "EUR"
      }
    ],
    webhookEvents: [{ payload: "raw-secret" }]
  });
  const json = JSON.stringify(serialized);

  assert.equal(serialized.payment.status, "SUCCEEDED");
  assert.equal(serialized.refunds[0].reference, "safe-refund-reference");
  assert.doesNotMatch(
    json,
    /pi_secret|re_secret|idempotency|providerPaymentId|providerRefundId|webhook|payload/i
  );
});

test("the paid email contains only an authenticated order link and no payment details", () => {
  const message = buildPaymentConfirmationMessage({
    to: "buyer@example.test",
    username: "Buyer",
    orderPublicId: "75ad34cf-5ee4-4838-b36f-fac65a40f1e9"
  });
  const content = `${message.text}\n${message.html}`;

  assert.match(content, /\/orders\/75ad34cf-5ee4-4838-b36f-fac65a40f1e9/);
  assert.doesNotMatch(content, /client_secret|payment_intent|card number|cvc|iban/i);
});
