const nodeEnv = process.env.NODE_ENV || "development";

const defaultAdminEnabled = process.env.SEED_DEFAULT_ADMIN
  ? process.env.SEED_DEFAULT_ADMIN === "true"
  : nodeEnv !== "production";

const defaultAdminBypassLoginCode = process.env.DEFAULT_ADMIN_BYPASS_LOGIN_CODE
  ? process.env.DEFAULT_ADMIN_BYPASS_LOGIN_CODE === "true"
  : nodeEnv !== "production";

const defaultFranceVatRateBps = nodeEnv === "production" ? 0 : 2000;
const developmentInvoiceIssuer =
  nodeEnv === "production"
    ? {}
    : {
        legalName: "Make It Art Sandbox",
        addressLine1: "Adresse de test",
        postalCode: "75000",
        city: "Paris",
        country: "FR",
        registrationId: "SANDBOX",
        vatId: "FR-SANDBOX",
        email: "billing@make-it-art.local"
      };

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost",
  paymentAlertEmail: process.env.PAYMENT_ALERT_EMAIL || "",
  checkoutEnabled: process.env.CHECKOUT_ENABLED !== "false",
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "mia_session",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "mia_refresh",
  csrfCookieName: process.env.CSRF_COOKIE_NAME || "mia_csrf",
  loginCodeCookieName: process.env.LOGIN_CODE_COOKIE_NAME || "mia_login_challenge",
  rememberDeviceCookieName: process.env.REMEMBER_DEVICE_COOKIE_NAME || "mia_remember_device",
  googleOAuth: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.APP_BASE_URL || "http://localhost"}/api/auth/google/callback`,
    authorizationUrl:
      process.env.GOOGLE_AUTHORIZATION_URL || "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token",
    userInfoUrl:
      process.env.GOOGLE_USERINFO_URL || "https://openidconnect.googleapis.com/v1/userinfo",
    stateCookieName: process.env.GOOGLE_OAUTH_STATE_COOKIE_NAME || "mia_google_oauth_state",
    linkCookieName: process.env.GOOGLE_OAUTH_LINK_COOKIE_NAME || "mia_google_oauth_link"
  },
  defaultAdmin: {
    enabled: defaultAdminEnabled,
    email: process.env.DEFAULT_ADMIN_EMAIL || "admin@art.com",
    password: process.env.DEFAULT_ADMIN_PASSWORD || "admin123",
    bypassLoginCode: defaultAdminBypassLoginCode && nodeEnv !== "production"
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    paymentMethodConfigurationId: process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION_ID || "",
    savedPaymentMethodConsentVersion:
      process.env.SAVED_PAYMENT_METHOD_CONSENT_VERSION || "2026-07-26",
    checkoutExpirationSweepMs: Number(process.env.CHECKOUT_EXPIRATION_SWEEP_MS || 60000),
    reconciliationSweepMs: Number(process.env.PAYMENT_RECONCILIATION_SWEEP_MS || 300000)
  },
  commerce: {
    marketCountry: process.env.PAYMENT_MARKET_COUNTRY || "FR",
    customerScope: process.env.PAYMENT_CUSTOMER_SCOPE || "B2C",
    stripeTaxEnabled: process.env.STRIPE_TAX_ENABLED === "true",
    franceVatRateBps: Number(process.env.FRANCE_B2C_VAT_RATE_BPS || defaultFranceVatRateBps),
    commissionRateBps: Number(process.env.PLATFORM_COMMISSION_RATE_BPS || 700),
    commissionInvoicingEnabled: process.env.COMMISSION_INVOICING_ENABLED === "true",
    commissionVatRateBps: Number(process.env.COMMISSION_VAT_RATE_BPS || 0),
    issuer: {
      legalName: process.env.INVOICE_ISSUER_LEGAL_NAME || developmentInvoiceIssuer.legalName || "",
      addressLine1:
        process.env.INVOICE_ISSUER_ADDRESS_LINE1 || developmentInvoiceIssuer.addressLine1 || "",
      addressLine2: process.env.INVOICE_ISSUER_ADDRESS_LINE2 || "",
      postalCode:
        process.env.INVOICE_ISSUER_POSTAL_CODE || developmentInvoiceIssuer.postalCode || "",
      city: process.env.INVOICE_ISSUER_CITY || developmentInvoiceIssuer.city || "",
      country: process.env.INVOICE_ISSUER_COUNTRY || developmentInvoiceIssuer.country || "FR",
      registrationId:
        process.env.INVOICE_ISSUER_REGISTRATION_ID || developmentInvoiceIssuer.registrationId || "",
      vatId: process.env.INVOICE_ISSUER_VAT_ID || developmentInvoiceIssuer.vatId || "",
      email: process.env.INVOICE_ISSUER_EMAIL || developmentInvoiceIssuer.email || ""
    }
  },
  fulfillment: {
    sweepMs: Number(process.env.FULFILLMENT_SWEEP_MS || 5000),
    batchSize: Number(process.env.FULFILLMENT_BATCH_SIZE || 20),
    leaseMs: Number(process.env.FULFILLMENT_LEASE_MS || 300000),
    maxAttempts: Number(process.env.FULFILLMENT_MAX_ATTEMPTS || 5),
    retryBaseMs: Number(process.env.FULFILLMENT_RETRY_BASE_MS || 5000)
  },
  paymentOperations: {
    sweepMs: Number(process.env.PAYMENT_ANOMALY_SWEEP_MS || 300000),
    staleMs: Number(process.env.PAYMENT_ANOMALY_STALE_MS || 300000),
    alertCooldownSeconds: Number(process.env.PAYMENT_ALERT_COOLDOWN_SECONDS || 3600),
    disputeRightsPolicy: process.env.DISPUTE_RIGHTS_POLICY || "SUSPEND_ON_OPEN",
    disputeRightsPolicyConfirmed: process.env.DISPUTE_RIGHTS_POLICY_CONFIRMED === "true"
  },
  artistWithdrawals: {
    minimumAmount: Number(process.env.ARTIST_WITHDRAWAL_MIN_AMOUNT || 2500),
    alertEmail: process.env.ARTIST_WITHDRAWAL_ALERT_EMAIL || process.env.PAYMENT_ALERT_EMAIL || ""
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Make It Art <no-reply@make-it-art.local>"
  },
  umami: {
    internalUrl: process.env.UMAMI_INTERNAL_URL || "http://umami:3000",
    username: process.env.UMAMI_API_USERNAME || "",
    password: process.env.UMAMI_API_PASSWORD || "",
    websiteId: process.env.UMAMI_WEBSITE_ID || ""
  },
  artworkMedia: {
    storageProvider: (process.env.ARTWORK_STORAGE_PROVIDER || "local").toLowerCase(),
    pythonPath: process.env.PDF_PYTHON_PATH || process.env.ARTWORK_PYTHON_PATH || "python3",
    previewMaxWidth: Number(process.env.ARTWORK_PREVIEW_MAX_WIDTH || 1600),
    previewQuality: Number(process.env.ARTWORK_PREVIEW_QUALITY || 82),
    watermarkText: process.env.ARTWORK_WATERMARK_TEXT || "Make It Art",
    watermarkPublicPreviews: process.env.ARTWORK_WATERMARK_PUBLIC_PREVIEWS !== "false",
    s3: {
      bucket: process.env.AWS_S3_BUCKET || "",
      region: process.env.AWS_S3_REGION || "",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      publicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL || ""
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
      apiKey: process.env.CLOUDINARY_API_KEY || "",
      apiSecret: process.env.CLOUDINARY_API_SECRET || "",
      folder: process.env.CLOUDINARY_FOLDER || "make-it-art"
    }
  }
};
