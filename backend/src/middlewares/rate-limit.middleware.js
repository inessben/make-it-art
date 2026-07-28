const { ipKeyGenerator } = require("express-rate-limit");
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
    skip: (_req, _res) => {
      return false;
    },
    keyGenerator: ipKeyGenerator,
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
    skip: (_req, _res) => {
      return false;
    },
    keyGenerator: ipKeyGenerator,
    message: {
      message: "Too many attempts. Please try again later."
    }
  })
);

const cartRateLimit = asExpressMiddleware(
  rateLimit({
    windowMs: 60 * 1000,
    limit: isProduction ? 120 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? `cart-user:${req.user.id}` : ipKeyGenerator(req.ip)),
    message: {
      message: "Too many cart requests. Please try again later.",
      code: "CART_RATE_LIMITED"
    }
  })
);

const checkoutIpRateLimit = asExpressMiddleware(
  rateLimit({
    windowMs: 60 * 1000,
    limit: isProduction ? 30 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKeyGenerator,
    message: {
      message: "Too many checkout attempts. Please try again later.",
      code: "CHECKOUT_RATE_LIMITED"
    }
  })
);

const checkoutUserRateLimit = asExpressMiddleware(
  rateLimit({
    windowMs: 60 * 1000,
    limit: isProduction ? 10 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `checkout-user:${req.user.id}`,
    message: {
      message: "Too many checkout attempts. Please try again later.",
      code: "CHECKOUT_RATE_LIMITED"
    }
  })
);

const securityRateLimit = asExpressMiddleware(
  rateLimit({
    windowMs: 60 * 1000,
    limit: isProduction ? 30 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? `security-user:${req.user.id}` : ipKeyGenerator(req.ip)),
    message: {
      message: "Too many security token requests. Please try again later.",
      code: "SECURITY_RATE_LIMITED"
    }
  })
);

const refundRateLimit = asExpressMiddleware(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isProduction ? 10 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? `refund-admin:${req.user.id}` : ipKeyGenerator(req.ip)),
    message: {
      message: "Too many refund requests. Please try again later.",
      code: "REFUND_RATE_LIMITED"
    }
  })
);

const paymentOperationsRateLimit = asExpressMiddleware(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isProduction ? 20 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
      req.user ? `payment-operations-admin:${req.user.id}` : ipKeyGenerator(req.ip),
    message: {
      message: "Too many payment operations. Please try again later.",
      code: "PAYMENT_OPERATIONS_RATE_LIMITED"
    }
  })
);

const walletWriteRateLimit = asExpressMiddleware(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isProduction ? 20 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    message: {
      message: "Too many wallet operations. Please try again later.",
      code: "WALLET_RATE_LIMITED"
    }
  })
);

const artworkMediaRateLimit = asExpressMiddleware(
  rateLimit({
    windowMs: 60 * 1000,
    limit: isProduction ? 60 : 600,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKeyGenerator,
    message: {
      message: "Too many artwork media requests. Please try again later.",
      code: "ARTWORK_MEDIA_RATE_LIMITED"
    }
  })
);

const artworkCatalogRateLimit = asExpressMiddleware(
  rateLimit({
    windowMs: 60 * 1000,
    limit: isProduction ? 90 : 900,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
      req.user ? `artwork-catalog-user:${req.user.id}` : ipKeyGenerator(req.ip),
    message: {
      message: "Too many artwork catalog requests. Please try again later.",
      code: "ARTWORK_CATALOG_RATE_LIMITED"
    }
  })
);

const artworkManagementRateLimit = asExpressMiddleware(
  rateLimit({
    windowMs: 60 * 1000,
    limit: isProduction ? 30 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
      req.user ? `artwork-management-user:${req.user.id}` : ipKeyGenerator(req.ip),
    message: {
      message: "Trop de demandes de gestion d'oeuvre. Reessayez dans quelques instants.",
      code: "ARTWORK_MANAGEMENT_RATE_LIMITED"
    }
  })
);

const artworkDownloadRateLimit = asExpressMiddleware(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isProduction ? 20 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
      req.user ? `artwork-download-user:${req.user.id}` : ipKeyGenerator(req.ip),
    message: {
      message: "Too many artwork download requests. Please try again later.",
      code: "ARTWORK_DOWNLOAD_RATE_LIMITED"
    }
  })
);

module.exports = {
  authRateLimit,
  strictAuthRateLimit,
  walletWriteRateLimit,
  cartRateLimit,
  checkoutIpRateLimit,
  checkoutUserRateLimit,
  securityRateLimit,
  refundRateLimit,
  paymentOperationsRateLimit,
  artworkManagementRateLimit,
  artworkMediaRateLimit,
  artworkCatalogRateLimit,
  artworkDownloadRateLimit
};
