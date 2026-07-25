const test = require("node:test");
const assert = require("node:assert/strict");

const {
  financialStateIsCoherent,
  notifyPaymentAnomalies,
  stripeFileReferences
} = require("../../src/services/payment-operations.service");

test("evidence audit keeps only opaque Stripe file references", () => {
  assert.deepEqual(
    stripeFileReferences({
      customer_communication: "file_communication123",
      customer_email_address: "collector@example.test",
      service_documentation: "file_documentation456",
      product_description: "private free text",
      duplicate: "file_communication123"
    }),
    ["file_communication123", "file_documentation456"]
  );
});

test("operator alerts can be resolved only for coherent financial states", () => {
  assert.equal(financialStateIsCoherent("PAID", "SUCCEEDED"), true);
  assert.equal(financialStateIsCoherent("REFUNDED", "REFUNDED"), true);
  assert.equal(financialStateIsCoherent("PAYMENT_REVIEW", "SUCCEEDED"), false);
  assert.equal(financialStateIsCoherent("PAID", "FAILED"), false);
});

test("anomaly alerts are aggregated and throttled without financial or personal data", async () => {
  const values = new Set();
  const alerts = [];
  const now = new Date("2026-07-19T12:00:00.000Z");
  const prismaClient = {
    stripeWebhookEvent: {
      findMany: async () => [
        {
          id: 1,
          eventId: "evt_safe_reference",
          eventType: "payment_intent.succeeded",
          status: "FAILED",
          attemptCount: 1,
          lastErrorCode: "TRANSIENT_ERROR",
          createdAt: new Date("2026-07-19T11:58:00.000Z"),
          processedAt: null,
          payment: null,
          refund: null
        }
      ],
      count: async () => 2
    },
    refund: { findMany: async () => [], count: async () => 0 },
    fulfillmentTask: { findMany: async () => [], count: async () => 0 },
    order: { findMany: async () => [], count: async () => 0 },
    paymentOperatorAlert: { findMany: async () => [], count: async () => 0 },
    dispute: { findMany: async () => [], count: async () => 0 }
  };
  const redisClient = {
    async set(key) {
      if (values.has(key)) return null;
      values.add(key);
      return "OK";
    },
    async del(key) {
      values.delete(key);
    }
  };
  const options = {
    prismaClient,
    redisClient,
    alertSender: async (alert) => alerts.push(alert),
    cooldownSeconds: 3600,
    now
  };

  const first = await notifyPaymentAnomalies(options);
  const second = await notifyPaymentAnomalies(options);

  assert.equal(first.notified, 1);
  assert.equal(second.notified, 0);
  assert.deepEqual(alerts, [
    {
      code: "PAYMENT_WEBHOOK_ANOMALIES",
      count: 2,
      reference: "evt_safe_reference",
      ageSeconds: 120,
      recommendedAction: "Inspect and replay the verified Stripe event from payment supervision"
    }
  ]);
  assert.doesNotMatch(JSON.stringify(alerts), /email|client_secret|card|address/i);
});

test("a failed anomaly notification is eligible for retry on the next sweep", async () => {
  const values = new Set();
  const prismaClient = {
    stripeWebhookEvent: { findMany: async () => [], count: async () => 1 },
    refund: { findMany: async () => [], count: async () => 0 },
    fulfillmentTask: { findMany: async () => [], count: async () => 0 },
    order: { findMany: async () => [], count: async () => 0 },
    paymentOperatorAlert: { findMany: async () => [], count: async () => 0 },
    dispute: { findMany: async () => [], count: async () => 0 }
  };
  const redisClient = {
    async set(key) {
      if (values.has(key)) return null;
      values.add(key);
      return "OK";
    },
    async del(key) {
      values.delete(key);
    }
  };
  let attempts = 0;
  const alertSender = async () => {
    attempts += 1;
    throw new Error("mail unavailable");
  };

  await assert.rejects(
    () => notifyPaymentAnomalies({ prismaClient, redisClient, alertSender }),
    /mail unavailable/
  );
  await assert.rejects(
    () => notifyPaymentAnomalies({ prismaClient, redisClient, alertSender }),
    /mail unavailable/
  );
  assert.equal(attempts, 2);
});
