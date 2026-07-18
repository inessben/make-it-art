const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { csrfProtection } = require("../middlewares/csrf.middleware");
const {
  checkoutIpRateLimit,
  checkoutUserRateLimit
} = require("../middlewares/rate-limit.middleware");
const { CartError } = require("../services/cart.service");
const { CheckoutError, initializeCheckout } = require("../services/checkout.service");
const { getOwnedOrder, listOwnedOrders } = require("../services/order-query.service");

const router = express.Router();
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertOnlyFields(body, allowedFields) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new CheckoutError("INVALID_CHECKOUT_INPUT", "Invalid request body", 400);
  }

  const unexpectedFields = Object.keys(body).filter((field) => !allowedFields.includes(field));

  if (unexpectedFields.length > 0) {
    throw new CheckoutError(
      "INVALID_CHECKOUT_INPUT",
      `Server-managed or unknown fields are not allowed: ${unexpectedFields.join(", ")}`,
      400
    );
  }
}

function parseCartVersion(value) {
  const version = Number(value);

  if (!Number.isSafeInteger(version) || version <= 0) {
    throw new CheckoutError(
      "INVALID_CHECKOUT_INPUT",
      "cartVersion must be a positive integer",
      400
    );
  }

  return version;
}

function parsePricingFingerprint(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new CheckoutError(
      "INVALID_CHECKOUT_INPUT",
      "pricingFingerprint must be a SHA-256 fingerprint",
      400
    );
  }

  return value.toLowerCase();
}

function parseIdempotencyKey(value) {
  if (typeof value !== "string" || !UUID_V4_PATTERN.test(value)) {
    throw new CheckoutError("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be a UUID v4", 400);
  }

  return value.toLowerCase();
}

function sendCheckoutError(res, error) {
  if (error instanceof CartError || error instanceof CheckoutError) {
    if (error.providerCode) {
      console.error("Stripe checkout provider error:", {
        code: error.providerCode
      });
    }

    return res.status(error.status).json({
      message: error.message,
      code: error.code,
      ...(error.cart ? { cart: error.cart } : {})
    });
  }

  if (error.code === "STRIPE_NOT_CONFIGURED") {
    return res.status(503).json({
      message: "Payment provider is not configured",
      code: "STRIPE_NOT_CONFIGURED"
    });
  }

  console.error("Checkout initialization failed:", {
    name: error.name,
    code: error.code
  });
  return res.status(500).json({
    message: "Checkout initialization failed",
    code: "CHECKOUT_INITIALIZATION_FAILED"
  });
}

router.post(
  "/orders/checkout",
  checkoutIpRateLimit,
  authRequired,
  checkoutUserRateLimit,
  csrfProtection,
  async (req, res) => {
    res.set("Cache-Control", "no-store");

    try {
      assertOnlyFields(req.body, ["cartVersion", "pricingFingerprint"]);
      const result = await initializeCheckout({
        userId: req.user.id,
        cartVersion: parseCartVersion(req.body.cartVersion),
        pricingFingerprint: parsePricingFingerprint(req.body.pricingFingerprint),
        clientIdempotencyKey: parseIdempotencyKey(req.get("idempotency-key"))
      });

      return res.status(result.created ? 201 : 200).json({
        order: {
          id: result.orderId,
          status: result.orderStatus,
          amount: result.amount,
          currency: result.currency
        },
        payment: {
          status: result.paymentStatus,
          clientSecret: result.clientSecret
        }
      });
    } catch (error) {
      return sendCheckoutError(res, error);
    }
  }
);

router.get("/orders", authRequired, async (req, res) => {
  res.set("Cache-Control", "private, no-store");

  try {
    return res.status(200).json({ orders: await listOwnedOrders(req.user.id) });
  } catch (error) {
    console.error("Order history lookup failed", { name: error.name, code: error.code });
    return res.status(500).json({ message: "Order history is temporarily unavailable" });
  }
});

router.get("/orders/:publicId", authRequired, async (req, res) => {
  res.set("Cache-Control", "private, no-store");

  if (!UUID_V4_PATTERN.test(req.params.publicId)) {
    return res.status(404).json({ message: "Order not found" });
  }

  try {
    const order = await getOwnedOrder(req.user.id, req.params.publicId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error("Order lookup failed", { name: error.name, code: error.code });
    return res.status(500).json({ message: "Order status is temporarily unavailable" });
  }
});

module.exports = router;
