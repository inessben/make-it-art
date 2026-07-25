const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const prisma = require("../lib/prisma");

const router = express.Router();

function formatAmount(amount, currency = "EUR") {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    return null;
  }

  return `${(amount / 100).toFixed(2)} ${currency}`;
}

function getLegacyTotal(order) {
  if (order.totalToken !== null && order.totalToken !== undefined) {
    return order.totalToken;
  }

  return Number.isSafeInteger(order.totalAmount) ? order.totalAmount / 100 : 0;
}

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
        publicId: order.publicId,
        number: `ORD-${String(order.id).padStart(6, "0")}`,
        status: order.status || "Processing",
        totalToken: getLegacyTotal(order),
        totalAmount: order.totalAmount,
        currency: order.currency,
        createdAt: order.createdAt,
        itemCount: order.items.length,
        artworks: order.items.map((item) => ({
          id: item.artwork.id,
          title: item.artwork.title,
          priceTokens: item.priceTokens || formatAmount(item.unitAmount, item.currency),
          unitAmount: item.unitAmount,
          currency: item.currency
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
        publicId: order.publicId,
        number: `ORD-${String(order.id).padStart(6, "0")}`,
        status: order.status || "Processing",
        totalToken: getLegacyTotal(order),
        totalAmount: order.totalAmount,
        currency: order.currency,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          artworkId: item.artworkId,
          artworkTitle: item.artwork.title,
          priceTokens: item.priceTokens || formatAmount(item.unitAmount, item.currency),
          unitAmount: item.unitAmount,
          currency: item.currency
        })),
        payments: order.payments.map((payment) => ({
          id: payment.id,
          method: payment.method,
          transactionId: payment.transactionId || payment.providerPaymentId || null,
          providerPaymentId: payment.providerPaymentId,
          price: payment.price || formatAmount(payment.amount, payment.currency),
          amount: payment.amount,
          currency: payment.currency,
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
