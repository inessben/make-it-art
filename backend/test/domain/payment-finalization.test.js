const test = require("node:test");
const assert = require("node:assert/strict");

const { validatePaymentIntent } = require("../../src/services/payment-finalization.service");

function localPayment() {
  return {
    providerPaymentId: "pi_expected",
    amount: 4200,
    currency: "EUR",
    order: { publicId: "8d43bb83-e55d-4712-8ab1-72e315f3cb1b" }
  };
}

function stripeIntent(overrides = {}) {
  return {
    id: "pi_expected",
    amount: 4200,
    amount_received: 4200,
    currency: "eur",
    status: "succeeded",
    metadata: { order_id: "8d43bb83-e55d-4712-8ab1-72e315f3cb1b" },
    ...overrides
  };
}

test("a PaymentIntent must match the persisted id, amount, currency, order and received amount", () => {
  assert.deepEqual(validatePaymentIntent(stripeIntent(), localPayment()), []);

  assert.deepEqual(
    validatePaymentIntent(
      stripeIntent({
        id: "pi_other",
        amount: 4100,
        amount_received: 4000,
        currency: "usd",
        metadata: { order_id: "another-order" }
      }),
      localPayment()
    ).sort(),
    [
      "PAYMENT_AMOUNT_MISMATCH",
      "PAYMENT_CURRENCY_MISMATCH",
      "PAYMENT_INTENT_ID_MISMATCH",
      "PAYMENT_ORDER_MISMATCH",
      "PAYMENT_RECEIVED_AMOUNT_MISMATCH"
    ]
  );
});
