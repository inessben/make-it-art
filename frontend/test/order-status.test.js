import test from "node:test";
import assert from "node:assert/strict";

import {
  getOrderPollingDelay,
  getPaymentStatusLabel,
  getPaymentReturnActionTarget,
  getOrderStatusPresentation,
  getPaymentReturnStatusPresentation,
  getRefundStatusPresentation,
  MAX_ORDER_POLL_ATTEMPTS,
  shouldClearCheckoutStorage
} from "../utils/order-status.js";

test("customer-visible payment states never claim success before PAID", () => {
  for (const status of [
    "PENDING_PAYMENT",
    "PAYMENT_PROCESSING",
    "PAYMENT_FAILED",
    "PAYMENT_REVIEW",
    "CANCELED"
  ]) {
    assert.doesNotMatch(getOrderStatusPresentation(status).title, /confirmed/i);
  }
  assert.match(getOrderStatusPresentation("PAID").title, /confirmed/i);
});

test("only processing orders poll with a bounded exponential backoff", () => {
  assert.equal(getOrderStatusPresentation("PAYMENT_PROCESSING").poll, true);
  assert.equal(getOrderStatusPresentation("PAID").poll, false);
  assert.deepEqual(
    Array.from({ length: MAX_ORDER_POLL_ATTEMPTS }, (_, attempt) => getOrderPollingDelay(attempt)),
    [1500, 3000, 6000, 12000, 12000]
  );
});

test("the payment return page waits for signed confirmation without encouraging a retry", () => {
  const presentation = getPaymentReturnStatusPresentation("PENDING_PAYMENT");

  assert.equal(presentation.poll, true);
  assert.equal(presentation.action, null);
  assert.match(presentation.title, /confirmation.*progress/i);
  assert.match(presentation.message, /signed server confirmation/i);
  assert.doesNotMatch(presentation.message, /not completed/i);
});

test("a failed payment retry resumes the same order instead of restarting the return page", () => {
  const orderId = "83237158-f2c5-447b-8baf-7aaffa9c45c6";
  const failedAction = getPaymentReturnStatusPresentation("PAYMENT_FAILED").action;

  assert.equal(getPaymentReturnActionTarget(failedAction, orderId), `/checkout?order=${orderId}`);
  assert.equal(
    getPaymentReturnActionTarget(getPaymentReturnStatusPresentation("PAID").action, orderId),
    `/orders/${orderId}`
  );
  assert.equal(getPaymentReturnActionTarget(failedAction, ""), "/orders");
});

test("refund states tell the customer whether money was returned", () => {
  assert.match(getRefundStatusPresentation("PENDING").label, /progress/i);
  assert.match(getRefundStatusPresentation("SUCCEEDED").label, /confirmed/i);
  assert.doesNotMatch(getRefundStatusPresentation("FAILED").message, /returned/i);
  assert.match(getOrderStatusPresentation("PARTIALLY_REFUNDED").title, /partially refunded/i);
  assert.match(getOrderStatusPresentation("REFUNDED").message, /digital access.*revoked/i);
});

test("every persisted order status has a customer-visible badge label", () => {
  const expectedLabels = {
    PENDING_PAYMENT: "Paiement en attente",
    PAYMENT_PROCESSING: "Vérification en cours",
    PAYMENT_FAILED: "Paiement refusé",
    PAYMENT_REVIEW: "En cours d’examen",
    PAID: "Payée",
    CANCELED: "Annulée",
    PARTIALLY_REFUNDED: "Partiellement remboursée",
    REFUNDED: "Remboursée"
  };

  for (const [status, expectedLabel] of Object.entries(expectedLabels)) {
    const presentation = getOrderStatusPresentation(status);

    assert.equal(presentation.badgeLabel, expectedLabel);
    assert.notEqual(presentation.badgeLabel, "Statut indisponible");
  }

  assert.equal(getOrderStatusPresentation("UNKNOWN").badgeLabel, "Statut indisponible");
});

test("every persisted payment status has a customer-visible label", () => {
  const expectedLabels = {
    PENDING: "En attente",
    PROCESSING: "En cours",
    SUCCEEDED: "Confirmé",
    FAILED: "Échoué",
    CANCELED: "Annulé",
    PARTIALLY_REFUNDED: "Partiellement remboursé",
    REFUNDED: "Remboursé"
  };

  for (const [status, expectedLabel] of Object.entries(expectedLabels)) {
    assert.equal(getPaymentStatusLabel(status), expectedLabel);
  }

  assert.equal(getPaymentStatusLabel("UNKNOWN"), "Indisponible");
});

test("checkout recovery storage is retained only while another safe action may be needed", () => {
  assert.equal(shouldClearCheckoutStorage("PAID"), true);
  assert.equal(shouldClearCheckoutStorage("CANCELED"), true);
  assert.equal(shouldClearCheckoutStorage("REFUNDED"), true);
  assert.equal(shouldClearCheckoutStorage("PAYMENT_FAILED"), false);
  assert.equal(shouldClearCheckoutStorage("PAYMENT_PROCESSING"), false);
});
