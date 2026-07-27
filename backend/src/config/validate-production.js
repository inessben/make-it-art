function validateProductionConfig(config) {
  if (config.nodeEnv !== "production") return;

  const errors = [];
  if (!/^https:\/\//.test(config.appBaseUrl)) errors.push("APP_BASE_URL must use HTTPS");
  if (!config.corsOrigin || config.corsOrigin === "*") errors.push("CORS_ORIGIN must be closed");
  if (!config.jwtSecret || config.jwtSecret.length < 32 || config.jwtSecret.includes("change_me")) {
    errors.push("JWT_SECRET must be a strong production secret");
  }
  if (!/^(sk|rk)_live_[A-Za-z0-9]+$/.test(config.stripe.secretKey)) {
    errors.push("STRIPE_SECRET_KEY must be a live secret or restricted key");
  }
  if (!/^whsec_[A-Za-z0-9_]+$/.test(config.stripe.webhookSecret)) {
    errors.push("STRIPE_WEBHOOK_SECRET must be configured");
  }
  if (!/^pmc_[A-Za-z0-9]+$/.test(config.stripe.paymentMethodConfigurationId || "")) {
    errors.push(
      "STRIPE_PAYMENT_METHOD_CONFIGURATION_ID must reference the reviewed card-only configuration"
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.stripe.savedPaymentMethodConsentVersion || "")) {
    errors.push("SAVED_PAYMENT_METHOD_CONSENT_VERSION must be a dated version (YYYY-MM-DD)");
  }
  if (config.commerce?.marketCountry !== "FR") {
    errors.push("PAYMENT_MARKET_COUNTRY must be FR for the initial launch");
  }
  if (config.commerce?.customerScope !== "B2C") {
    errors.push("PAYMENT_CUSTOMER_SCOPE must be B2C for the initial launch");
  }
  if (config.commerce?.stripeTaxEnabled !== false) {
    errors.push("STRIPE_TAX_ENABLED must remain false until the phase 2 tax prerequisites are met");
  }
  if (
    !Number.isSafeInteger(config.commerce?.franceVatRateBps) ||
    config.commerce.franceVatRateBps <= 0 ||
    config.commerce.franceVatRateBps > 10000
  ) {
    errors.push("FRANCE_B2C_VAT_RATE_BPS must be explicitly validated and configured");
  }
  if (config.commerce?.commissionRateBps !== 700) {
    errors.push("PLATFORM_COMMISSION_RATE_BPS must be 700");
  }
  if (config.commerce?.commissionInvoicingEnabled !== false) {
    errors.push("COMMISSION_INVOICING_ENABLED must remain false until the commission phase opens");
  }
  const issuer = config.commerce?.issuer || {};
  for (const field of [
    "legalName",
    "addressLine1",
    "postalCode",
    "city",
    "country",
    "registrationId",
    "vatId",
    "email"
  ]) {
    if (!String(issuer[field] || "").trim()) {
      errors.push(`Invoice issuer field ${field} must be configured`);
    }
  }
  if (!config.paymentAlertEmail || !config.paymentAlertEmail.includes("@")) {
    errors.push("PAYMENT_ALERT_EMAIL must be configured");
  }
  if (!config.smtp?.host) errors.push("SMTP_HOST must be configured");
  if (
    !Number.isSafeInteger(config.stripe.checkoutExpirationSweepMs) ||
    config.stripe.checkoutExpirationSweepMs < 10000
  ) {
    errors.push("CHECKOUT_EXPIRATION_SWEEP_MS must be at least 10000");
  }
  if (!Number.isSafeInteger(config.fulfillment?.sweepMs) || config.fulfillment.sweepMs < 1000) {
    errors.push("FULFILLMENT_SWEEP_MS must be at least 1000");
  }
  if (
    !Number.isSafeInteger(config.fulfillment?.batchSize) ||
    config.fulfillment.batchSize < 1 ||
    config.fulfillment.batchSize > 100
  ) {
    errors.push("FULFILLMENT_BATCH_SIZE must be between 1 and 100");
  }
  if (!Number.isSafeInteger(config.fulfillment?.leaseMs) || config.fulfillment.leaseMs < 120000) {
    errors.push("FULFILLMENT_LEASE_MS must be at least 120000");
  }
  if (
    !Number.isSafeInteger(config.fulfillment?.maxAttempts) ||
    config.fulfillment.maxAttempts < 1 ||
    config.fulfillment.maxAttempts > 20
  ) {
    errors.push("FULFILLMENT_MAX_ATTEMPTS must be between 1 and 20");
  }
  if (
    !Number.isSafeInteger(config.fulfillment?.retryBaseMs) ||
    config.fulfillment.retryBaseMs < 1000
  ) {
    errors.push("FULFILLMENT_RETRY_BASE_MS must be at least 1000");
  }
  if (
    !Number.isSafeInteger(config.paymentOperations?.sweepMs) ||
    config.paymentOperations.sweepMs < 60000
  ) {
    errors.push("PAYMENT_ANOMALY_SWEEP_MS must be at least 60000");
  }
  if (
    !Number.isSafeInteger(config.paymentOperations?.staleMs) ||
    config.paymentOperations.staleMs < 60000
  ) {
    errors.push("PAYMENT_ANOMALY_STALE_MS must be at least 60000");
  }
  if (
    !Number.isSafeInteger(config.paymentOperations?.alertCooldownSeconds) ||
    config.paymentOperations.alertCooldownSeconds < 300
  ) {
    errors.push("PAYMENT_ALERT_COOLDOWN_SECONDS must be at least 300");
  }
  if (config.paymentOperations?.disputeRightsPolicy !== "SUSPEND_ON_OPEN") {
    errors.push("DISPUTE_RIGHTS_POLICY must be SUSPEND_ON_OPEN");
  }
  if (config.paymentOperations?.disputeRightsPolicyConfirmed !== true) {
    errors.push("DISPUTE_RIGHTS_POLICY_CONFIRMED must be true after the risk policy is approved");
  }
  if (errors.length > 0) {
    const error = new Error(`Unsafe production configuration: ${errors.join("; ")}`);
    error.code = "UNSAFE_PRODUCTION_CONFIGURATION";
    throw error;
  }
}

module.exports = { validateProductionConfig };
