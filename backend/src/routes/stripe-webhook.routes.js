const express = require("express");
const { StripeWebhookError, receiveStripeWebhook } = require("../services/stripe-webhook.service");
const { recordInvalidWebhookSignature } = require("../services/payment-monitoring.service");

const router = express.Router();

router.post("/", express.raw({ type: "application/json", limit: "256kb" }), async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const result = await receiveStripeWebhook({
      rawBody: req.body,
      signature: req.get("stripe-signature")
    });

    return res.status(200).json({
      received: true,
      duplicate: result.duplicate,
      ignored: result.ignored
    });
  } catch (error) {
    if (error instanceof StripeWebhookError) {
      if (error.code === "INVALID_STRIPE_SIGNATURE") {
        recordInvalidWebhookSignature({ ip: req.ip }).catch(() => undefined);
      }
      return res.status(error.status).json({
        received: false,
        code: error.code
      });
    }

    console.error("Stripe webhook persistence failed", {
      name: error.name,
      code: error.code
    });
    return res.status(500).json({
      received: false,
      code: "STRIPE_WEBHOOK_PERSISTENCE_FAILED"
    });
  }
});

module.exports = router;
