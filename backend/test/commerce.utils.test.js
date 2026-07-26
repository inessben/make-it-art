const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  parseAmount,
  formatCurrencyAmount,
  buildOrderStatus,
  computeNetRevenue,
} = require("../src/utils/commerce");

test("parseAmount normalizes currency strings", () => {
  assert.equal(parseAmount("EUR 120.50"), 120.5);
  assert.equal(parseAmount("12,30"), 12.3);
  assert.equal(parseAmount(null), 0);
});

test("buildOrderStatus derives paid status from payments", () => {
  assert.equal(
    buildOrderStatus({
      payments: [{ status: "Succeeded" }],
    }),
    "Paid",
  );
});

test("computeNetRevenue applies artist share", () => {
  assert.equal(computeNetRevenue(100), 93);
  assert.equal(formatCurrencyAmount(93), "EUR 93.00");
});
