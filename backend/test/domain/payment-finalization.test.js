const test = require("node:test");
const assert = require("node:assert/strict");

const {
  consumeReservations,
  validatePaymentIntent
} = require("../../src/services/payment-finalization.service");

function localPayment() {
  return {
    providerPaymentId: "pi_expected",
    amount: 4200,
    currency: "EUR",
    order: {
      publicId: "8d43bb83-e55d-4712-8ab1-72e315f3cb1b",
      customerType: "B2C",
      marketCountry: "FR",
      taxBehavior: "INCLUSIVE",
      billingSnapshot: {
        customerType: "B2C",
        name: "Buyer",
        email: "buyer@example.test",
        address: {
          line1: "1 rue de Paris",
          postalCode: "75001",
          city: "Paris",
          country: "FR"
        }
      },
      subtotalExcludingTaxAmount: 3500,
      taxAmount: 700,
      taxRateBps: 2000,
      totalAmount: 4200
    }
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

test("a retry may replace a failed charge on the same PaymentIntent", () => {
  const payment = localPayment();
  payment.status = "FAILED";
  payment.providerChargeId = "ch_failed_attempt";
  payment.order.status = "PAYMENT_FAILED";

  assert.deepEqual(
    validatePaymentIntent(stripeIntent({ latest_charge: "ch_successful_retry" }), payment),
    []
  );
});

test("a terminal payment rejects an unexpected replacement charge", () => {
  const payment = localPayment();
  payment.status = "SUCCEEDED";
  payment.providerChargeId = "ch_expected";
  payment.order.status = "PAID";

  assert.deepEqual(
    validatePaymentIntent(stripeIntent({ latest_charge: "ch_unexpected" }), payment),
    ["PAYMENT_CHARGE_ID_MISMATCH"]
  );
});

test("consuming an exclusive reservation marks the artwork sold atomically", async () => {
  const artworkUpdates = [];
  const reservationUpdates = [];
  const transaction = {
    artwork: {
      async updateMany(input) {
        artworkUpdates.push(input);
        return { count: 1 };
      }
    },
    inventoryReservation: {
      async updateMany(input) {
        reservationUpdates.push(input);
        return { count: 1 };
      }
    }
  };

  await consumeReservations(transaction, {
    orderId: 31,
    order: {
      reservations: [
        {
          artworkId: 42,
          quantity: 1,
          status: "ACTIVE"
        }
      ]
    }
  });

  assert.deepEqual(artworkUpdates, [
    {
      where: {
        id: 42,
        licenseType: "EXCLUSIVE",
        saleStatus: "AVAILABLE",
        isSold: false,
        stockQuantity: 1,
        reservedQuantity: 1
      },
      data: {
        stockQuantity: 0,
        reservedQuantity: 0,
        saleStatus: "SOLD_OUT",
        isSold: true
      }
    }
  ]);
  assert.deepEqual(reservationUpdates, [
    {
      where: { orderId: 31, status: "ACTIVE" },
      data: { status: "CONSUMED" }
    }
  ]);
});
