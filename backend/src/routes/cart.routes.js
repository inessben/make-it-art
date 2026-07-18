const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { cartRateLimit } = require("../middlewares/rate-limit.middleware");
const {
  CartError,
  getCartSummary,
  setCartItem,
  removeCartItem,
  clearCart,
  validateCartForCheckout
} = require("../services/cart.service");

const router = express.Router();

function parsePositiveInteger(value, field, maximum = Number.MAX_SAFE_INTEGER) {
  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0 || parsedValue > maximum) {
    throw new CartError("INVALID_CART_INPUT", `${field} must be a positive integer`, 400);
  }

  return parsedValue;
}

function assertOnlyFields(body, allowedFields) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new CartError("INVALID_CART_INPUT", "Invalid request body", 400);
  }

  const unexpectedFields = Object.keys(body).filter((field) => !allowedFields.includes(field));

  if (unexpectedFields.length > 0) {
    throw new CartError(
      "INVALID_CART_INPUT",
      `Server-managed or unknown fields are not allowed: ${unexpectedFields.join(", ")}`,
      400
    );
  }
}

function sendError(res, error) {
  if (error instanceof CartError) {
    return res.status(error.status).json({
      message: error.message,
      code: error.code,
      ...(error.cart ? { cart: error.cart } : {})
    });
  }

  console.error("Cart operation failed:", error);
  return res.status(500).json({
    message: "Cart operation failed",
    code: "CART_OPERATION_FAILED"
  });
}

router.get("/cart", authRequired, cartRateLimit, async (req, res) => {
  try {
    const cart = await getCartSummary(req.user.id);
    return res.status(200).json({ cart });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/cart/items", authRequired, cartRateLimit, async (req, res) => {
  try {
    assertOnlyFields(req.body, ["artworkId", "quantity"]);
    const artworkId = parsePositiveInteger(req.body.artworkId, "artworkId");
    const quantity = parsePositiveInteger(req.body.quantity ?? 1, "quantity", 100);
    const cart = await setCartItem(req.user.id, { artworkId, quantity });

    return res.status(200).json({ cart });
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete("/cart/items/:artworkId", authRequired, cartRateLimit, async (req, res) => {
  try {
    const artworkId = parsePositiveInteger(req.params.artworkId, "artworkId");
    const cart = await removeCartItem(req.user.id, artworkId);
    return res.status(200).json({ cart });
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete("/cart", authRequired, cartRateLimit, async (req, res) => {
  try {
    const cart = await clearCart(req.user.id);
    return res.status(200).json({ cart });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/cart/validate", authRequired, cartRateLimit, async (req, res) => {
  try {
    assertOnlyFields(req.body, ["cartVersion", "pricingFingerprint"]);
    const expectedVersion = parsePositiveInteger(req.body.cartVersion, "cartVersion");
    const expectedPricingFingerprint = req.body.pricingFingerprint;

    if (!/^[a-f0-9]{64}$/i.test(expectedPricingFingerprint || "")) {
      throw new CartError(
        "INVALID_CART_INPUT",
        "pricingFingerprint must be a SHA-256 fingerprint",
        400
      );
    }

    const cart = await validateCartForCheckout({
      userId: req.user.id,
      expectedVersion,
      expectedPricingFingerprint
    });

    return res.status(200).json({ valid: true, cart });
  } catch (error) {
    return sendError(res, error);
  }
});

module.exports = router;
