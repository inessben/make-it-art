const prisma = require("../lib/prisma");
const { RECENT_AUTH_MAX_AGE_MS } = require("./refund-admin.middleware");

async function paymentOperationsAdminRequired(req, res, next) {
  const authenticatedAt = req.user?.sessionAuthenticatedAt;
  const recent =
    authenticatedAt instanceof Date &&
    Number.isFinite(authenticatedAt.getTime()) &&
    Date.now() - authenticatedAt.getTime() <= RECENT_AUTH_MAX_AGE_MS;

  if (!recent) {
    return res.status(403).json({
      message: "Recent authentication is required",
      code: "RECENT_AUTHENTICATION_REQUIRED"
    });
  }

  const admin = await prisma.admin.findUnique({ where: { userId: req.user.id } });
  if (!admin || req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "Payment operations access is forbidden",
      code: "PAYMENT_OPERATIONS_FORBIDDEN"
    });
  }

  req.admin = admin;
  return next();
}

module.exports = { paymentOperationsAdminRequired };
