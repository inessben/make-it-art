const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { csrfProtection } = require("../middlewares/csrf.middleware");
const { securityRateLimit } = require("../middlewares/rate-limit.middleware");
const {
  SavedPaymentMethodError,
  listSavedPaymentMethods,
  removeSavedPaymentMethod
} = require("../services/saved-payment-method.service");

const router = express.Router();

function sendError(res, error) {
  if (error instanceof SavedPaymentMethodError) {
    return res.status(error.status).json({ message: error.message, code: error.code });
  }

  console.error("Saved payment method operation failed", {
    code: error?.code || error?.type,
    supportReference: res.req.supportReference
  });
  return res.status(503).json({
    message: "Saved payment methods are temporarily unavailable",
    code: "SAVED_PAYMENT_METHODS_UNAVAILABLE",
    supportReference: res.req.supportReference
  });
}

router.get("/payment-methods", authRequired, securityRateLimit, async (req, res) => {
  res.set("Cache-Control", "private, no-store");

  try {
    return res.status(200).json({
      paymentMethods: await listSavedPaymentMethods({ userId: req.user.id })
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete(
  "/payment-methods/:paymentMethodId",
  authRequired,
  securityRateLimit,
  csrfProtection,
  async (req, res) => {
    res.set("Cache-Control", "private, no-store");

    try {
      const result = await removeSavedPaymentMethod({
        userId: req.user.id,
        paymentMethodId: req.params.paymentMethodId
      });
      return res.status(200).json(result);
    } catch (error) {
      return sendError(res, error);
    }
  }
);

module.exports = router;
