const test = require("node:test");
const assert = require("node:assert/strict");

const { inspectStalePayments } = require("../../src/services/payment-monitoring.service");

test("the reconciliation dry run compares Stripe without mutating local state", async () => {
  let writes = 0;
  const prismaClient = {
    order: {
      async findMany() {
        return [
          {
            publicId: "87ad104c-37a3-4a2c-8db3-ad05654c85f0",
            status: "PAYMENT_FAILED",
            customerType: "B2C",
            marketCountry: "FR",
            taxBehavior: "INCLUSIVE",
            billingSnapshot: {
              customerType: "B2C",
              address: { country: "FR" }
            },
            subtotalExcludingTaxAmount: 2000,
            taxAmount: 400,
            taxRateBps: 2000,
            totalAmount: 2400,
            payments: [
              {
                providerPaymentId: "pi_reconciliation_preview",
                providerChargeId: null,
                amount: 2400,
                currency: "EUR",
                status: "FAILED"
              }
            ]
          }
        ];
      },
      async update() {
        writes += 1;
      }
    }
  };

  const result = await inspectStalePayments({
    prismaClient,
    stripeClient: {
      paymentIntents: {
        async retrieve() {
          return {
            id: "pi_reconciliation_preview",
            status: "succeeded",
            livemode: false,
            amount: 2400,
            amount_received: 2400,
            currency: "eur",
            latest_charge: "ch_reconciliation_preview",
            metadata: { order_id: "87ad104c-37a3-4a2c-8db3-ad05654c85f0" }
          };
        }
      }
    },
    expectedLivemode: false
  });

  assert.equal(writes, 0);
  assert.deepEqual(result.summary, {
    scanned: 1,
    consistent: 0,
    reconcilable: 1,
    waiting: 0,
    reviewRequired: 0,
    failed: 0
  });
  assert.equal(result.rows[0].outcome, "RECONCILE");
  assert.doesNotMatch(JSON.stringify(result), /pi_reconciliation_preview|client_secret/i);
});

test("the reconciliation dry run quarantines financial and mode mismatches", async () => {
  const result = await inspectStalePayments({
    prismaClient: {
      order: {
        async findMany() {
          return [
            {
              publicId: "e47cf2a9-2d7f-49b4-966e-b8ef93d0d10f",
              status: "PAYMENT_PROCESSING",
              customerType: "B2C",
              marketCountry: "FR",
              taxBehavior: "INCLUSIVE",
              billingSnapshot: {
                customerType: "B2C",
                address: { country: "FR" }
              },
              subtotalExcludingTaxAmount: 2000,
              taxAmount: 400,
              taxRateBps: 2000,
              totalAmount: 2400,
              payments: [
                {
                  providerPaymentId: "pi_mismatch",
                  providerChargeId: null,
                  amount: 2400,
                  currency: "EUR",
                  status: "PROCESSING"
                }
              ]
            }
          ];
        }
      }
    },
    stripeClient: {
      paymentIntents: {
        async retrieve() {
          return {
            id: "pi_mismatch",
            status: "succeeded",
            livemode: true,
            amount: 2500,
            amount_received: 2500,
            currency: "eur",
            metadata: { order_id: "e47cf2a9-2d7f-49b4-966e-b8ef93d0d10f" }
          };
        }
      }
    },
    expectedLivemode: false
  });

  assert.equal(result.summary.reviewRequired, 1);
  assert.equal(result.rows[0].outcome, "REVIEW_REQUIRED");
  assert.deepEqual(result.rows[0].validationCodes, [
    "PAYMENT_AMOUNT_MISMATCH",
    "PAYMENT_MODE_MISMATCH",
    "PAYMENT_RECEIVED_AMOUNT_MISMATCH"
  ]);
});
