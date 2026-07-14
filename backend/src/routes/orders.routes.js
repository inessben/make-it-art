const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { isAdminUser } = require("../middlewares/admin-required.middleware");
const { createCheckout } = require("../services/checkout.service");
const { formatOrderReference } = require("../utils/commerce");
const prisma = require("../lib/prisma");

const router = express.Router();

function mapCheckoutError(error) {
  switch (error?.message) {
    case "CHECKOUT_EMPTY":
      return {
        status: 400,
        message: "Votre panier est vide.",
      };
    case "ARTWORK_NOT_FOUND":
      return {
        status: 404,
        message: "Une ou plusieurs oeuvres sont introuvables.",
      };
    case "CANNOT_BUY_OWN_ARTWORK":
      return {
        status: 400,
        message: "Vous ne pouvez pas acheter vos propres oeuvres.",
      };
    case "INVALID_ARTWORK_PRICE":
      return {
        status: 400,
        message: "Le prix d'une oeuvre est invalide.",
      };
    default:
      return null;
  }
}

router.post("/orders/checkout", authRequired, async (req, res) => {
  if (isAdminUser(req.user)) {
    return res.status(403).json({
      message: "Les comptes admin ne peuvent pas passer commande.",
    });
  }

  try {
    const result = await createCheckout({
      userId: req.user.id,
      items: req.body?.items,
      paymentMethod: req.body?.paymentMethod,
      billingEmail: req.body?.billingEmail,
    });

    return res.status(201).json({
      message: "Commande confirmee avec succes.",
      order: {
        id: result.order.id,
        reference: formatOrderReference(result.order.id),
        status: result.order.status,
        totalAmount: result.totalAmount,
        billingEmail: result.billingEmail,
        createdAt: result.order.createdAt,
      },
      payment: {
        id: result.payment.id,
        method: result.payment.method,
        status: result.payment.status,
        price: result.payment.price,
      },
    });
  } catch (error) {
    const mappedError = mapCheckoutError(error);

    if (mappedError) {
      return res.status(mappedError.status).json({
        message: mappedError.message,
      });
    }

    console.error("Checkout error:", error);
    return res.status(500).json({
      message: "Impossible de finaliser la commande.",
    });
  }
});

router.get("/orders", authRequired, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            artwork: true
          }
        }
      }
    });

    return res.status(200).json({
      orders: orders.map((order) => ({
        id: order.id,
        number: `ORD-${String(order.id).padStart(6, "0")}`,
        status: order.status || "Processing",
        totalToken: order.totalToken || 0,
        createdAt: order.createdAt,
        itemCount: order.items.length,
        artworks: order.items.map((item) => ({
          id: item.artwork.id,
          title: item.artwork.title,
          priceTokens: item.priceTokens
        }))
      }))
    });
  } catch (error) {
    console.error("Orders fetch error:", error);
    return res.status(500).json({ message: "Unable to fetch orders" });
  }
});

router.get("/orders/:id", authRequired, async (req, res) => {
  const orderId = Number(req.params.id);

  if (Number.isNaN(orderId)) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  try {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: req.user.id
      },
      include: {
        items: {
          include: {
            artwork: true
          }
        },
        payments: true
      }
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({
      order: {
        id: order.id,
        number: `ORD-${String(order.id).padStart(6, "0")}`,
        status: order.status || "Processing",
        totalToken: order.totalToken || 0,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          artworkId: item.artworkId,
          artworkTitle: item.artwork.title,
          priceTokens: item.priceTokens
        })),
        payments: order.payments.map((payment) => ({
          id: payment.id,
          method: payment.method,
          transactionId: payment.transactionId,
          price: payment.price,
          status: payment.status,
          createdAt: payment.createdAt
        }))
      }
    });
  } catch (error) {
    console.error("Order detail fetch error:", error);
    return res.status(500).json({ message: "Unable to fetch order details" });
  }
});

module.exports = router;
