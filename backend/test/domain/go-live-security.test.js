const test = require("node:test");
const assert = require("node:assert/strict");

const { assertCheckoutEnabled } = require("../../src/services/checkout-availability.service");

test("the emergency switch blocks only creation of new checkouts", () => {
  assert.doesNotThrow(() => assertCheckoutEnabled(true));
  assert.throws(
    () => assertCheckoutEnabled(false),
    (error) => error.code === "CHECKOUT_TEMPORARILY_DISABLED" && error.status === 503
  );
});
