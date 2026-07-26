const prisma = require("../lib/prisma");
const { isAdminUser } = require("./admin-required.middleware");

const RECENT_AUTH_MAX_AGE_MS = 10 * 60 * 1000;

async function refundAdminRequired(req, res, next) {
  const issuedAt = req.user?.sessionAuthenticatedAt;
  const isRecent =
    issuedAt instanceof Date &&
    Number.isFinite(issuedAt.getTime()) &&
    Date.now() - issuedAt.getTime() <= RECENT_AUTH_MAX_AGE_MS;

  if (!isRecent) {
    return res.status(403).json({
      message: "Recent authentication is required",
      code: "RECENT_AUTHENTICATION_REQUIRED"
    });
  }

  const admin = await prisma.admin.findUnique({ where: { userId: req.user.id } });
  if (!admin || !isAdminUser({ ...req.user, admin })) {
    return res.status(403).json({ message: "Forbidden", code: "REFUND_FORBIDDEN" });
  }

  req.admin = admin;
  return next();
}

module.exports = {
  RECENT_AUTH_MAX_AGE_MS,
  refundAdminRequired
};
