import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPaymentAnomalyRows,
  buildPaymentOperationRequest,
  paymentOperationErrorMessage
} from "../utils/payment-operations.js";

test("buildPaymentAnomalyRows exposes operational references without payment secrets", () => {
  const rows = buildPaymentAnomalyRows({
    webhooks: [
      {
        id: 1,
        eventId: "evt_safe",
        eventType: "payment_intent.succeeded",
        status: "FAILED",
        replayable: true,
        orderId: "order-public",
        errorCode: "TRANSIENT_ERROR"
      }
    ],
    orders: [
      {
        id: "order-public",
        status: "PAYMENT_REVIEW",
        paymentStatus: "PROCESSING",
        providerStatus: "processing",
        reconcileable: true
      }
    ]
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].action, {
    type: "webhook",
    id: "evt_safe",
    label: "Rejouer depuis Stripe"
  });
  assert.equal(JSON.stringify(rows).includes("client_secret"), false);
  assert.equal(JSON.stringify(rows).includes("providerPaymentId"), false);
});

test("dispute rows show only aggregate evidence audit data", () => {
  const [row] = buildPaymentAnomalyRows({
    disputes: [
      {
        id: "dp_safe",
        reason: "fraudulent",
        amount: 1000,
        currency: "EUR",
        status: "NEEDS_RESPONSE",
        orderId: "order-public",
        evidence: {
          submissionCount: 2,
          fileReferenceCount: 3,
          hasEvidence: true
        }
      }
    ]
  });

  assert.match(row.detail, /2 soumission/);
  assert.match(row.detail, /3 fichier/);
  assert.equal(JSON.stringify(row).includes("file_safe"), false);
  assert.equal(row.action.type, "dispute");
});

test("buildPaymentOperationRequest only builds explicit replay and reconciliation routes", () => {
  assert.deepEqual(buildPaymentOperationRequest({ type: "task", id: 42 }), {
    url: "/api/v1/admin/payments/anomalies/tasks/42/replay",
    body: {}
  });
  assert.deepEqual(buildPaymentOperationRequest({ type: "alert", id: 7 }), {
    url: "/api/v1/admin/payments/anomalies/alerts/7/resolve",
    body: { resolutionCode: "RECONCILED" }
  });
  assert.deepEqual(buildPaymentOperationRequest({ type: "dispute", id: "dp_safe" }), {
    url: "/api/v1/admin/payments/anomalies/disputes/dp_safe/sync-evidence",
    body: {}
  });
  assert.throws(() => buildPaymentOperationRequest({ type: "mark-paid", id: 1 }), /Unsupported/);
});

test("paymentOperationErrorMessage explains recent authentication and coherent-state checks", () => {
  assert.match(
    paymentOperationErrorMessage({
      data: { code: "RECENT_AUTHENTICATION_REQUIRED" }
    }),
    /Reconnectez-vous/
  );
  assert.match(
    paymentOperationErrorMessage({
      data: { code: "PAYMENT_STATE_STILL_INCOHERENT" }
    }),
    /Rapprochez/
  );
});
