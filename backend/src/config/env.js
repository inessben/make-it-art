const nodeEnv = process.env.NODE_ENV || "development";

const defaultAdminEnabled = process.env.SEED_DEFAULT_ADMIN
  ? process.env.SEED_DEFAULT_ADMIN === "true"
  : nodeEnv !== "production";

const defaultAdminBypassLoginCode = process.env.DEFAULT_ADMIN_BYPASS_LOGIN_CODE
  ? process.env.DEFAULT_ADMIN_BYPASS_LOGIN_CODE === "true"
  : nodeEnv !== "production";

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost",
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "mia_session",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "mia_refresh",
  loginCodeCookieName:
    process.env.LOGIN_CODE_COOKIE_NAME || "mia_login_challenge",
  rememberDeviceCookieName:
    process.env.REMEMBER_DEVICE_COOKIE_NAME || "mia_remember_device",
  googleOAuth: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.APP_BASE_URL || "http://localhost"}/api/auth/google/callback`,
    authorizationUrl:
      process.env.GOOGLE_AUTHORIZATION_URL ||
      "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl:
      process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token",
    userInfoUrl:
      process.env.GOOGLE_USERINFO_URL ||
      "https://openidconnect.googleapis.com/v1/userinfo",
    stateCookieName:
      process.env.GOOGLE_OAUTH_STATE_COOKIE_NAME || "mia_google_oauth_state",
    linkCookieName:
      process.env.GOOGLE_OAUTH_LINK_COOKIE_NAME || "mia_google_oauth_link",
  },
  defaultAdmin: {
    enabled: defaultAdminEnabled,
    email: process.env.DEFAULT_ADMIN_EMAIL || "admin@art.com",
    password: process.env.DEFAULT_ADMIN_PASSWORD || "admin123",
    bypassLoginCode: defaultAdminBypassLoginCode && nodeEnv !== "production",
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Make It Art <no-reply@make-it-art.local>",
  },
};
