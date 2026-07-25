const crypto = require("node:crypto");
const env = require("../config/env");

const CSRF_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;

function getAllowedOrigins() {
  return [env.appBaseUrl, env.corsOrigin]
    .filter((value) => value && value !== "*")
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function getCsrfCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: env.nodeEnv === "production",
    maxAge: CSRF_TOKEN_MAX_AGE_MS,
    path: "/"
  };
}

function createCsrfToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function issueCsrfToken(_req, res) {
  const token = createCsrfToken();
  res.cookie(env.csrfCookieName, token, getCsrfCookieOptions());
  res.set("Cache-Control", "no-store");

  return res.status(200).json({ csrfToken: token });
}

function tokensMatch(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function csrfProtection(req, res, next) {
  const origin = req.get("origin");
  const allowedOrigins = getAllowedOrigins();

  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      message: "Request origin is not allowed",
      code: "CSRF_VALIDATION_FAILED"
    });
  }

  const headerToken = req.get("x-csrf-token");
  const cookieToken = req.cookies?.[env.csrfCookieName];

  if (!tokensMatch(headerToken, cookieToken)) {
    return res.status(403).json({
      message: "CSRF validation failed",
      code: "CSRF_VALIDATION_FAILED"
    });
  }

  return next();
}

module.exports = {
  getCsrfCookieOptions,
  createCsrfToken,
  issueCsrfToken,
  csrfProtection
};
