const Stripe = require("stripe");
const env = require("../config/env");

let stripeClient;

function getStripeClient() {
  if (!env.stripe.secretKey || !env.stripe.secretKey.startsWith("sk_")) {
    const error = new Error("Stripe is not configured");
    error.code = "STRIPE_NOT_CONFIGURED";
    throw error;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.stripe.secretKey, {
      maxNetworkRetries: 2,
      appInfo: {
        name: "Make It Art",
        version: "1.0.0"
      }
    });
  }

  return stripeClient;
}

module.exports = {
  getStripeClient
};
