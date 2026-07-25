const Stripe = require("stripe");
const env = require("../config/env");

const STRIPE_API_VERSION = "2026-06-24.dahlia";
let stripeClient;

function getStripeClient() {
  if (!env.stripe.secretKey || !/^(sk|rk)_(test|live)_/.test(env.stripe.secretKey)) {
    const error = new Error("Stripe is not configured");
    error.code = "STRIPE_NOT_CONFIGURED";
    throw error;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.stripe.secretKey, {
      apiVersion: STRIPE_API_VERSION,
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
  STRIPE_API_VERSION,
  getStripeClient
};
