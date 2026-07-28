const env = require("../config/env");

function securityHeaders(_req, res, next) {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "no-referrer");
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
  res.set("X-Robots-Tag", "noai, noimageai");
  if (env.nodeEnv === "production") {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return next();
}

module.exports = { securityHeaders };
