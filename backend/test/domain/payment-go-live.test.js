const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_PAYMENT_ACKNOWLEDGEMENTS,
  REQUIRED_STRIPE_WEBHOOK_EVENTS,
  paymentGoLiveErrors,
  validatePaymentGoLive
} = require("../../src/config/validate-payment-go-live");

function validConfiguration() {
  return {
    appConfig: {
      nodeEnv: "production",
      appBaseUrl: "https://payments.example.test",
      corsOrigin: "https://payments.example.test",
      checkoutEnabled: true,
      jwtSecret: "a-strong-production-secret-with-32-chars",
      paymentAlertEmail: "payment-alerts@example.test",
      stripe: {
        secretKey: ["rk", "live", "restrictedpaymentkey"].join("_"),
        webhookSecret: "whsec_liveendpointsecret",
        paymentMethodConfigurationId: "pmc_launchcardsonly",
        checkoutExpirationSweepMs: 60000
      },
      commerce: {
        marketCountry: "FR",
        customerScope: "B2C",
        stripeTaxEnabled: false,
        franceVatRateBps: 2000,
        commissionRateBps: 700,
        commissionInvoicingEnabled: false,
        issuer: {
          legalName: "Make It Art SAS",
          addressLine1: "1 rue de Paris",
          postalCode: "75001",
          city: "Paris",
          country: "FR",
          registrationId: "123456789",
          vatId: "FR00123456789",
          email: "billing@example.test"
        }
      },
      fulfillment: {
        sweepMs: 5000,
        batchSize: 20,
        leaseMs: 300000,
        maxAttempts: 5,
        retryBaseMs: 5000
      },
      paymentOperations: {
        sweepMs: 300000,
        staleMs: 300000,
        alertCooldownSeconds: 3600,
        disputeRightsPolicy: "SUSPEND_ON_OPEN",
        disputeRightsPolicyConfirmed: true
      },
      smtp: { host: "smtp.example.test" }
    },
    environment: {
      NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_publickey",
      NUXT_PUBLIC_APP_BASE_URL: "https://payments.example.test",
      STRIPE_WEBHOOK_EVENTS: REQUIRED_STRIPE_WEBHOOK_EVENTS.join(","),
      PAYMENT_METHODS_POLICY: "card_only",
      PAYMENT_MERCHANT_OF_RECORD: "MAKE_IT_ART",
      ...Object.fromEntries(REQUIRED_PAYMENT_ACKNOWLEDGEMENTS.map((name) => [name, "true"]))
    }
  };
}

test("a complete reviewed live payment configuration passes", () => {
  const configuration = validConfiguration();

  assert.deepEqual(paymentGoLiveErrors(configuration), []);
  assert.doesNotThrow(() => validatePaymentGoLive(configuration));
});

test("live checkout requires a restricted key and every external decision", () => {
  const configuration = validConfiguration();
  configuration.appConfig.stripe.secretKey = ["sk", "live", "fullaccountkey"].join("_");
  configuration.environment.PAYMENT_FISCAL_POLICY_ACK = "false";

  const errors = paymentGoLiveErrors(configuration);

  assert.ok(errors.some((message) => message.includes("rk_live")));
  assert.ok(errors.some((message) => message.includes("PAYMENT_FISCAL_POLICY_ACK")));
  assert.throws(
    () => validatePaymentGoLive(configuration),
    (error) => error.code === "PAYMENT_GO_LIVE_VALIDATION_FAILED"
  );
});

test("the frontend origin and launch payment policy must match the reviewed configuration", () => {
  const configuration = validConfiguration();
  configuration.environment.NUXT_PUBLIC_APP_BASE_URL = "https://other.example.test";
  configuration.environment.PAYMENT_METHODS_POLICY = "wallets_enabled";
  configuration.environment.PAYMENT_MERCHANT_OF_RECORD = "ARTIST";

  const errors = paymentGoLiveErrors(configuration);

  assert.ok(errors.some((message) => message.includes("NUXT_PUBLIC_APP_BASE_URL")));
  assert.ok(errors.some((message) => message.includes("PAYMENT_METHODS_POLICY")));
  assert.ok(errors.some((message) => message.includes("PAYMENT_MERCHANT_OF_RECORD")));
});
