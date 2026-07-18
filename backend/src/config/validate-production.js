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
  if (!config.paymentAlertEmail || !config.paymentAlertEmail.includes("@")) {
    errors.push("PAYMENT_ALERT_EMAIL must be configured");
  }
  if (
    !Number.isSafeInteger(config.stripe.checkoutExpirationSweepMs) ||
    config.stripe.checkoutExpirationSweepMs < 10000
  ) {
    errors.push("CHECKOUT_EXPIRATION_SWEEP_MS must be at least 10000");
  }
  if (errors.length > 0) {
    const error = new Error(`Unsafe production configuration: ${errors.join("; ")}`);
    error.code = "UNSAFE_PRODUCTION_CONFIGURATION";
    throw error;
  }
}

module.exports = { validateProductionConfig };
