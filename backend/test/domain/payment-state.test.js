const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  canTransitionOrder,
  assertOrderTransition,
  canTransitionPayment,
  assertPaymentTransition
} = require("../../src/domain/payment-state");

test("an order can move from pending payment to paid", () => {
  assert.equal(canTransitionOrder(ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.PAID), true);
});

test("an idempotent order transition is accepted", () => {
  assert.doesNotThrow(() => assertOrderTransition(ORDER_STATUS.PAID, ORDER_STATUS.PAID));
});

test("a paid order cannot regress to payment failed", () => {
  assert.equal(canTransitionOrder(ORDER_STATUS.PAID, ORDER_STATUS.PAYMENT_FAILED), false);
  assert.throws(
    () => assertOrderTransition(ORDER_STATUS.PAID, ORDER_STATUS.PAYMENT_FAILED),
    /Invalid order status transition/
  );
});

test("a canceled order is terminal", () => {
  assert.throws(
    () => assertOrderTransition(ORDER_STATUS.CANCELED, ORDER_STATUS.PENDING_PAYMENT),
    /Invalid order status transition/
  );
});

test("a failed payment can be retried", () => {
  assert.equal(canTransitionPayment(PAYMENT_STATUS.FAILED, PAYMENT_STATUS.PROCESSING), true);
});

test("a succeeded payment can only move through refund states", () => {
  assert.doesNotThrow(() =>
    assertPaymentTransition(PAYMENT_STATUS.SUCCEEDED, PAYMENT_STATUS.PARTIALLY_REFUNDED)
  );
  assert.throws(
    () => assertPaymentTransition(PAYMENT_STATUS.SUCCEEDED, PAYMENT_STATUS.FAILED),
    /Invalid payment status transition/
  );
});

test("unknown statuses are rejected", () => {
  assert.throws(
    () => assertPaymentTransition("UNKNOWN", PAYMENT_STATUS.PENDING),
    /Unknown payment status/
  );
});
