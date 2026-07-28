const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { csrfProtection } = require("../middlewares/csrf.middleware");
const { CartError } = require("../services/cart.service");
const { CheckoutError, initializeCheckout } = require("../services/checkout.service");
const { getOwnedOrder, listOwnedOrders } = require("../services/order-query.service");
const { CheckoutRecoveryError, resumeCheckout } = require("../services/checkout-recovery.service");
const { assertCheckoutEnabled } = require("../services/checkout-availability.service");
const { CommercePolicyError } = require("../domain/commerce-policy");
const { getOwnedSaleInvoicePdf } = require("../services/invoice.service");
const {
  checkoutIpRateLimit,
  checkoutUserRateLimit,
  artworkDownloadRateLimit
} = require("../middlewares/rate-limit.middleware");
const {
  ArtworkDownloadError,
  consumeArtworkDownload,
  sendArtworkFile
} = require("../services/artwork-download.service");
const { blockAiTrainingBots } = require("../middlewares/artwork-media-guard.middleware");

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
  if (
    error instanceof CartError ||
    error instanceof CheckoutError ||
    error instanceof CheckoutRecoveryError ||
    error instanceof CommercePolicyError
  ) {
    if (error.providerCode) {
      console.error("Stripe checkout provider error:", {
        code: error.providerCode,
        supportReference: res.req.supportReference
      });
    }

    return res.status(error.status).json({
      message: error.message,
      code: error.code,
      ...(error.cart ? { cart: error.cart } : {}),
      ...(error.status >= 500 ? { supportReference: res.req.supportReference } : {})
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
    code: error.code,
    supportReference: res.req.supportReference
  });
  return res.status(500).json({
    message: "Checkout initialization failed",
    code: "CHECKOUT_INITIALIZATION_FAILED",
    supportReference: res.req.supportReference
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
      assertCheckoutEnabled();
      assertOnlyFields(req.body, ["cartVersion", "pricingFingerprint", "billingDetails"]);
      const result = await initializeCheckout({
        userId: req.user.id,
        cartVersion: parseCartVersion(req.body.cartVersion),
        pricingFingerprint: parsePricingFingerprint(req.body.pricingFingerprint),
        billingDetails: req.body.billingDetails,
        clientIdempotencyKey: parseIdempotencyKey(req.get("idempotency-key"))
      });

      return res.status(result.created ? 201 : 200).json({
        order: {
          id: result.orderId,
          status: result.orderStatus,
          amount: result.amount,
          currency: result.currency,
          billingDetails: result.billingDetails
        },
        payment: {
          status: result.paymentStatus,
          requiresConfirmation: result.requiresConfirmation,
          clientSecret: result.clientSecret,
          customerSessionClientSecret: result.customerSessionClientSecret,
          savedPaymentMethodsAvailable: result.savedPaymentMethodsAvailable
        }
      });
    } catch (error) {
      return sendCheckoutError(res, error);
    }
  }
);

router.post(
  "/orders/:publicId/resume",
  checkoutIpRateLimit,
  authRequired,
  checkoutUserRateLimit,
  csrfProtection,
  async (req, res) => {
    res.set("Cache-Control", "private, no-store");

    try {
      assertOnlyFields(req.body, []);
      if (!UUID_V4_PATTERN.test(req.params.publicId)) {
        return res.status(404).json({ message: "Order not found" });
      }

      const result = await resumeCheckout({
        userId: req.user.id,
        publicId: req.params.publicId
      });
      if (!result) return res.status(404).json({ message: "Order not found" });

      return res.status(200).json({
        order: {
          id: result.orderId,
          status: result.orderStatus,
          amount: result.amount,
          currency: result.currency,
          billingDetails: result.billingDetails
        },
        payment: {
          status: result.paymentStatus,
          requiresConfirmation: result.requiresConfirmation,
          clientSecret: result.clientSecret,
          customerSessionClientSecret: result.customerSessionClientSecret,
          savedPaymentMethodsAvailable: result.savedPaymentMethodsAvailable
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

router.get("/orders/:publicId/invoices/:invoicePublicId.pdf", authRequired, async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  if (
    !UUID_V4_PATTERN.test(req.params.publicId) ||
    !UUID_V4_PATTERN.test(req.params.invoicePublicId)
  ) {
    return res.status(404).json({ message: "Invoice not found" });
  }

  try {
    const invoice = await getOwnedSaleInvoicePdf({
      userId: req.user.id,
      orderPublicId: req.params.publicId,
      invoicePublicId: req.params.invoicePublicId
    });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    res.set("Content-Type", "application/pdf");
    res.set(
      "Content-Disposition",
      `attachment; filename="${invoice.number.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf"`
    );
    return res.status(200).send(invoice.pdf);
  } catch (error) {
    console.error("Invoice download failed", { name: error.name, code: error.code });
    return res.status(500).json({ message: "Invoice is temporarily unavailable" });
  }
});

router.get(
  "/orders/:publicId/download/:itemId(\\d+)",
  authRequired,
  blockAiTrainingBots,
  artworkDownloadRateLimit,
  async (req, res) => {
    res.set("Cache-Control", "private, no-store");

    if (!UUID_V4_PATTERN.test(req.params.publicId)) {
      return res.status(404).json({ message: "Order not found", code: "ORDER_NOT_FOUND" });
    }

    const orderItemId = Number.parseInt(req.params.itemId, 10);

    try {
      const download = await consumeArtworkDownload({
        userId: req.user.id,
        orderPublicId: req.params.publicId,
        orderItemId
      });

      return sendArtworkFile(res, download);
    } catch (error) {
      if (error instanceof ArtworkDownloadError) {
        return res.status(error.status).json({
          message: error.message,
          code: error.code
        });
      }

      if (error.message === "INVALID_UPLOAD_PATH") {
        return res.status(404).json({
          message: "The original artwork file is unavailable",
          code: "ARTWORK_FILE_MISSING"
        });
      }

      console.error("Artwork download failed", { name: error.name, code: error.code });
      return res.status(500).json({
        message: "Artwork download is temporarily unavailable",
        code: "ARTWORK_DOWNLOAD_UNAVAILABLE"
      });
    }
  }
);

module.exports = router;
