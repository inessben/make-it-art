const env = require("../config/env");
const { CheckoutRecoveryError } = require("./checkout-recovery.service");

function assertCheckoutEnabled(enabled = env.checkoutEnabled) {
  if (!enabled) {
    throw new CheckoutRecoveryError(
      "CHECKOUT_TEMPORARILY_DISABLED",
      "New payments are temporarily unavailable",
      503
    );
  }
}

module.exports = { assertCheckoutEnabled };
