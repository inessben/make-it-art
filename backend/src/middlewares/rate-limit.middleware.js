const rateLimit = require("express-rate-limit");

const isProduction = process.env.NODE_ENV === "production";

function asExpressMiddleware(limiter) {
  return (req, res, next) => limiter(req, res, next);
}

const authRateLimit = asExpressMiddleware(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isProduction ? 20 : 100,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many authentication attempts. Please try again later."
    }
  })
);

const strictAuthRateLimit = asExpressMiddleware(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isProduction ? 8 : 50,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many attempts. Please try again later."
    }
  })
);

module.exports = {
  authRateLimit,
  strictAuthRateLimit
};
