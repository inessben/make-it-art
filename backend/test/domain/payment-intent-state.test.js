const test = require("node:test");
const assert = require("node:assert/strict");

const { isPaymentIntentReusable } = require("../../src/domain/payment-intent-state");

test("only PaymentIntent states that still require customer confirmation are reusable", () => {
  for (const status of ["requires_payment_method", "requires_confirmation", "requires_action"]) {
    assert.equal(isPaymentIntentReusable(status), true);
  }

  for (const status of ["processing", "requires_capture", "succeeded", "canceled", null]) {
    assert.equal(isPaymentIntentReusable(status), false);
  }
});
