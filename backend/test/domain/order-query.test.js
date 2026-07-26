const test = require("node:test");
const assert = require("node:assert/strict");

const { serializeOrder } = require("../../src/services/order-query.service");
const {
  buildPaymentConfirmationMessage,
  buildRefundStatusMessage
} = require("../../src/services/mail.service");

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
        artworkId: 42,
        artworkTitle: "Safe artwork",
        artistName: "Artist",
        quantity: 1,
        unitAmount: 2500,
        currency: "EUR"
      }
    ],
    digitalEntitlements: [
      {
        orderItemId: 1,
        status: "ACTIVE",
        sourceTaskKey: "internal-task-key",
        grantedAt: new Date("2026-07-18T10:02:00Z"),
        suspendedAt: null,
        revokedAt: null
      }
    ],
    ownershipCertificates: [
      {
        orderItemId: 1,
        publicId: "1b5d0a0c-d743-4a0b-aed4-e6402058dd77",
        certificateNumber: "MIA-0123456789ABCDEF0123",
        status: "ACTIVE",
        fingerprint: "a".repeat(64),
        issuedAt: new Date("2026-07-18T10:02:00Z"),
        snapshot: { version: 1, artworkTitle: "Safe artwork" }
      }
    ],
    webhookEvents: [{ payload: "raw-secret" }]
  });
  const json = JSON.stringify(serialized);

  assert.equal(serialized.payment.status, "SUCCEEDED");
  assert.equal(serialized.refunds[0].reference, "safe-refund-reference");
  assert.equal(serialized.items[0].artworkId, 42);
  assert.equal(serialized.items[0].delivery.downloadRights.status, "ACTIVE");
  assert.equal(serialized.items[0].delivery.certificate.number, "MIA-0123456789ABCDEF0123");
  assert.doesNotMatch(json, /internal-task-key|sourceTaskKey/i);
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

test("the refund email contains the amount and authenticated order link without bank data", () => {
  const message = buildRefundStatusMessage({
    to: "buyer@example.test",
    username: "Buyer",
    orderPublicId: "75ad34cf-5ee4-4838-b36f-fac65a40f1e9",
    refundPublicId: "2b8b0e03-c3a4-4a0d-aa1b-89ff86922a52",
    status: "SUCCEEDED",
    amount: 500,
    currency: "EUR",
    providerReference: "safe-refund-reference"
  });
  const content = `${message.text}\n${message.html}`;

  assert.match(content, /5\.00 EUR/);
  assert.match(content, /safe-refund-reference/);
  assert.match(content, /\/orders\/75ad34cf-5ee4-4838-b36f-fac65a40f1e9/);
  assert.doesNotMatch(content, /client_secret|payment_intent|card number|cvc|iban/i);
});
