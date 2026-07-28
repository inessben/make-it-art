const test = require("node:test");
const assert = require("node:assert/strict");

const { validateProductionConfig } = require("../../src/config/validate-production");
const { sanitizePaymentLog } = require("../../src/lib/payment-logger");
const { STRIPE_API_VERSION } = require("../../src/lib/stripe");
const {
  eventTypeForIntent,
  reconcileStalePayments,
  recordInvalidWebhookSignature
} = require("../../src/services/payment-monitoring.service");

function productionConfig(overrides = {}) {
  return {
    nodeEnv: "production",
    appBaseUrl: "https://www.makeitart.io",
    corsOrigin: "https://www.makeitart.io",
    jwtSecret: "a-strong-production-secret-with-32-chars",
    paymentAlertEmail: "payments-alerts@makeitart.io",
    stripe: {
      secretKey: ["rk", "live", "restrictedpaymentkey"].join("_"),
      webhookSecret: "whsec_liveendpointsecret",
      paymentMethodConfigurationId: "pmc_launchcardsonly",
      savedPaymentMethodConsentVersion: "2026-07-26",
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
    smtp: { host: "smtp.example.test" },
    ...overrides
  };
}

test("production refuses missing, placeholder, or test payment secrets", () => {
  assert.doesNotThrow(() => validateProductionConfig(productionConfig()));
  for (const secretKey of ["", "sk_test_forbidden", "replace_with_stripe_live_secret_key"]) {
    assert.throws(
      () =>
        validateProductionConfig(
          productionConfig({ stripe: { ...productionConfig().stripe, secretKey } })
        ),
      /Unsafe production configuration/
    );
  }
});

test("production refuses unsafe fulfillment worker settings", () => {
  for (const fulfillment of [
    { ...productionConfig().fulfillment, sweepMs: 100 },
    { ...productionConfig().fulfillment, batchSize: 0 },
    { ...productionConfig().fulfillment, leaseMs: 60000 },
    { ...productionConfig().fulfillment, maxAttempts: 0 },
    { ...productionConfig().fulfillment, retryBaseMs: 100 }
  ]) {
    assert.throws(
      () => validateProductionConfig(productionConfig({ fulfillment })),
      /Unsafe production configuration/
    );
  }
});

test("production requires a dated saved-card consent version", () => {
  assert.throws(
    () =>
      validateProductionConfig(
        productionConfig({
          stripe: {
            ...productionConfig().stripe,
            savedPaymentMethodConsentVersion: "latest"
          }
        })
      ),
    /Unsafe production configuration/
  );
});

test("production refuses unsafe payment anomaly monitoring settings", () => {
  for (const paymentOperations of [
    { ...productionConfig().paymentOperations, sweepMs: 1000 },
    { ...productionConfig().paymentOperations, staleMs: 1000 },
    { ...productionConfig().paymentOperations, alertCooldownSeconds: 60 },
    { ...productionConfig().paymentOperations, disputeRightsPolicy: "KEEP_ACTIVE" },
    { ...productionConfig().paymentOperations, disputeRightsPolicy: "UNKNOWN" },
    { ...productionConfig().paymentOperations, disputeRightsPolicyConfirmed: false }
  ]) {
    assert.throws(
      () => validateProductionConfig(productionConfig({ paymentOperations })),
      /Unsafe production configuration/
    );
  }
});

test("production validates every enabled CDP wallet setting", () => {
  const validCdp = {
    walletFeatureEnabled: true,
    projectId: "c7a553d9-e0f5-483d-ac05-57c48d31a930",
    authIssuer: "https://www.makeitart.io",
    authAudience: "c7a553d9-e0f5-483d-ac05-57c48d31a930",
    authKeyId: "make-it-art-production-2026-01",
    authPrivateKey:
      "-----BEGIN PRIVATE KEY-----\nZmFrZS1rZXktZm9yLXZhbGlkYXRpb24=\n-----END PRIVATE KEY-----",
    apiKeyId: "organizations/example/apiKeys/example",
    apiKeySecret: "a-valid-cdp-api-secret",
    requestTimeoutMs: 8000
  };

  assert.doesNotThrow(() => validateProductionConfig(productionConfig({ cdp: validCdp })));

  for (const cdp of [
    { ...validCdp, authIssuer: "make-it-art" },
    { ...validCdp, authAudience: "another-project" },
    { ...validCdp, authPrivateKey: "invalid" },
    { ...validCdp, apiKeySecret: "replace_with_cdp_api_key_secret" }
  ]) {
    assert.throws(
      () => validateProductionConfig(productionConfig({ cdp })),
      /Unsafe production configuration/
    );
  }
});

test("Stripe requests are pinned to the reviewed API version", () => {
  assert.equal(STRIPE_API_VERSION, "2026-06-24.dahlia");
});

test("payment logs keep only allowlisted technical metadata and redact secret values", () => {
  const sanitized = sanitizePaymentLog({
    status: "FAILED",
    code: "sk_live_supersecret",
    durationMs: 42,
    email: "buyer@example.test",
    cookie: "mia_session=secret",
    body: { card: "4242" }
  });
  assert.deepEqual(sanitized, {
    status: "FAILED",
    code: "[REDACTED]",
    durationMs: 42
  });

  assert.deepEqual(
    sanitizePaymentLog({
      taskKey: "order:75ad34cf-5ee4-4838-b36f-fac65a40f1e9:GENERATE_CERTIFICATE",
      effectReference: "must-not-be-logged"
    }),
    { taskKey: "order:75ad34cf-5ee4-4838-b36f-fac65a40f1e9:GENERATE_CERTIFICATE" }
  );
});

test("reconciliation maps only authoritative terminal or processing states", () => {
  assert.equal(eventTypeForIntent({ status: "succeeded" }, "PENDING"), "payment_intent.succeeded");
  assert.equal(
    eventTypeForIntent({ status: "processing" }, "PENDING"),
    "payment_intent.processing"
  );
  assert.equal(
    eventTypeForIntent({ status: "requires_payment_method" }, "PROCESSING"),
    "payment_intent.payment_failed"
  );
  assert.equal(eventTypeForIntent({ status: "requires_action" }, "PENDING"), null);
});

test("reconciliation repairs failed local orders and raises one safe mismatch alert", async () => {
  let capturedQuery;
  const reconciliations = [];
  const alerts = [];
  const logs = [];
  const prismaClient = {
    order: {
      async findMany(query) {
        capturedQuery = query;
        return [
          {
            publicId: "3d886f2a-5be1-4eaf-885f-aefcc15b5234",
            status: "PAYMENT_FAILED",
            payments: [
              {
                providerPaymentId: "pi_test_reconcile",
                status: "FAILED"
              }
            ]
          }
        ];
      }
    }
  };
  const summary = await reconcileStalePayments({
    prismaClient,
    stripeClient: {
      paymentIntents: {
        async retrieve() {
          return { id: "pi_test_reconcile", status: "succeeded" };
        }
      }
    },
    now: new Date("2026-07-19T12:00:00Z"),
    paymentReconciler: async (input) => {
      reconciliations.push(input);
      return { reconciled: true };
    },
    alertSender: async (alert) => alerts.push(alert),
    logger: (...entry) => logs.push(entry)
  });

  assert.deepEqual(capturedQuery.where.status.in, [
    "PENDING_PAYMENT",
    "PAYMENT_PROCESSING",
    "PAYMENT_FAILED"
  ]);
  assert.equal(reconciliations.length, 1);
  assert.equal(reconciliations[0].localPaymentStatus, "FAILED");
  assert.deepEqual(summary, {
    scanned: 1,
    repaired: 1,
    deferred: 0,
    mismatched: 1,
    failed: 0
  });
  assert.deepEqual(alerts, [{ code: "PAYMENT_STATE_MISMATCH_REPAIRED", count: 1 }]);
  assert.equal(logs[0][1].code, "STRIPE_SUCCEEDED_LOCAL_NOT_PAID");
  assert.equal("email" in logs[0][1], false);
});

test("repeated invalid webhook signatures emit one threshold alert without storing the IP", async () => {
  const values = new Map();
  const alerts = [];
  const redisClient = {
    async incr(key) {
      values.set(key, (values.get(key) || 0) + 1);
      return values.get(key);
    },
    async expire() {}
  };
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await recordInvalidWebhookSignature({
      ip: "203.0.113.42",
      redisClient,
      alertSender: async (alert) => alerts.push(alert)
    });
  }
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].code, "INVALID_STRIPE_SIGNATURE_THRESHOLD");
  assert.doesNotMatch([...values.keys()][0], /203\.0\.113\.42/);
});
