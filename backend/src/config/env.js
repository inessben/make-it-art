module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost",
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "mia_session",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "mia_refresh",
  loginCodeCookieName: process.env.LOGIN_CODE_COOKIE_NAME || "mia_login_challenge",
  rememberDeviceCookieName: process.env.REMEMBER_DEVICE_COOKIE_NAME || "mia_remember_device",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Make It Art <no-reply@make-it-art.local>"
  }
};
