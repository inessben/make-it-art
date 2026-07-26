const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { csrfProtection } = require("../middlewares/csrf.middleware");
const { refundAdminRequired } = require("../middlewares/refund-admin.middleware");
const { refundRateLimit } = require("../middlewares/rate-limit.middleware");
const { RefundError, requestRefund } = require("../services/refund.service");

const router = express.Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseRequest(req) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw new RefundError("INVALID_REFUND_INPUT", "Invalid request body", 400);
  }
  const unexpected = Object.keys(req.body).filter((field) => !["amount", "reason"].includes(field));
  if (unexpected.length > 0) {
    throw new RefundError(
      "INVALID_REFUND_INPUT",
      `Server-managed or unknown fields are not allowed: ${unexpected.join(", ")}`,
      400
    );
  }
  const idempotencyKey = req.get("idempotency-key");
  if (!UUID_V4_PATTERN.test(idempotencyKey || "")) {
    throw new RefundError("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be a UUID v4", 400);
  }
  return {
    amount: req.body.amount,
    reasonCode: req.body.reason,
    idempotencyKey: idempotencyKey.toLowerCase()
  };
}

router.post(
  "/admin/orders/:publicId/refunds",
  (_req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    next();
  },
  authRequired,
  refundAdminRequired,
  refundRateLimit,
  csrfProtection,
  async (req, res) => {
    if (!UUID_PATTERN.test(req.params.publicId)) {
      return res.status(404).json({ message: "Order not found" });
    }

    try {
      const input = parseRequest(req);
      const result = await requestRefund({
        orderPublicId: req.params.publicId,
        requestedByUserId: req.user.id,
        ipAddress: req.ip,
        ...input
      });
      return res.status(result.created ? 202 : 200).json({ refund: result.refund });
    } catch (error) {
      if (error instanceof RefundError) {
        return res.status(error.status).json({
          message: error.message,
          code: error.code,
          ...(error.refund ? { refund: error.refund } : {})
        });
      }
      console.error("Refund request failed", {
        name: error.name,
        code: error.code,
        supportReference: req.supportReference
      });
      return res.status(500).json({
        message: "Refund request failed",
        code: "REFUND_REQUEST_FAILED",
        supportReference: req.supportReference
      });
    }
  }
);

module.exports = router;
