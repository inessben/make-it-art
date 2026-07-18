const crypto = require("node:crypto");
const prisma = require("../lib/prisma");
const { getStripeClient } = require("../lib/stripe");
const { canTransitionOrder, canTransitionPayment } = require("../domain/payment-state");
const { getCartSummary } = require("./cart.service");

const OPEN_ORDER_STATUSES = ["PENDING_PAYMENT", "PAYMENT_PROCESSING", "PAYMENT_FAILED"];
const REUSABLE_PAYMENT_INTENT_STATUSES = [
  "requires_payment_method",
  "requires_confirmation",
  "requires_action"
];

class CheckoutRecoveryError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.name = "CheckoutRecoveryError";
    this.code = code;
    this.status = status;
  }
}

function cancellationIdempotencyKey(paymentIntentId, reason) {
  const digest = crypto.createHash("sha256").update(`${paymentIntentId}:${reason}`).digest("hex");
  return `cancel_${digest}`;
}

function intentMatchesOrder(intent, order) {
  return (
    intent.id === order.payments[0]?.providerPaymentId &&
    intent.amount === order.totalAmount &&
    intent.currency === order.currency.toLowerCase() &&
    intent.metadata?.order_id === order.publicId
  );
}

async function finalizeLocalCancellation({ prismaClient, order, reason, providerStatus }) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prismaClient.$transaction(
        async (transaction) => {
          await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${order.publicId}, 8))::text AS lock`;
          const lockedOrder = await transaction.order.findUnique({
            where: { id: order.id },
            include: { reservations: true, payments: { orderBy: { checkoutVersion: "desc" } } }
          });

          if (!lockedOrder || !OPEN_ORDER_STATUSES.includes(lockedOrder.status)) {
            return false;
          }

          for (const reservation of lockedOrder.reservations.filter(
            (candidate) => candidate.status === "ACTIVE"
          )) {
            const released = await transaction.artwork.updateMany({
              where: {
                id: reservation.artworkId,
                reservedQuantity: { gte: reservation.quantity }
              },
              data: { reservedQuantity: { decrement: reservation.quantity } }
            });

            if (released.count !== 1) {
              throw new CheckoutRecoveryError(
                "INVENTORY_RELEASE_CONFLICT",
                "The reservation could not be released safely",
                500
              );
            }
          }

          const payment = lockedOrder.payments[0] || null;
          await transaction.inventoryReservation.updateMany({
            where: { orderId: lockedOrder.id, status: "ACTIVE" },
            data: { status: reason === "expired" ? "EXPIRED" : "RELEASED" }
          });
          await transaction.order.update({
            where: { id: lockedOrder.id },
            data: { status: "CANCELED", canceledAt: new Date() }
          });

          const transitions = [
            {
              orderId: lockedOrder.id,
              paymentId: payment?.id || null,
              stripeEventId: `system:${reason}:${lockedOrder.publicId}`,
              stripeObjectId: payment?.providerPaymentId || "not-created",
              entityType: "ORDER",
              previousStatus: lockedOrder.status,
              nextStatus: "CANCELED",
              reasonCode: `CHECKOUT_${reason.toUpperCase()}`
            }
          ];

          if (payment && canTransitionPayment(payment.status, "CANCELED")) {
            await transaction.payment.update({
              where: { id: payment.id },
              data: {
                status: "CANCELED",
                providerStatus,
                canceledAt: new Date()
              }
            });
            transitions.push({
              orderId: lockedOrder.id,
              paymentId: payment.id,
              stripeEventId: `system:${reason}:${lockedOrder.publicId}`,
              stripeObjectId: payment.providerPaymentId || "not-created",
              entityType: "PAYMENT",
              previousStatus: payment.status,
              nextStatus: "CANCELED",
              reasonCode: `CHECKOUT_${reason.toUpperCase()}`
            });
          }

          await transaction.financialTransition.createMany({
            data: transitions,
            skipDuplicates: true
          });
          return true;
        },
        { isolationLevel: "Serializable" }
      );
    } catch (error) {
      if (error?.code !== "P2034" || attempt === 3) {
        throw error;
      }
    }
  }
}

async function cancelOrderSafely({
  order,
  reason,
  stripeClient = getStripeClient(),
  prismaClient = prisma
}) {
  const payment = order.payments[0] || null;
  let providerStatus = "canceled";

  if (payment?.providerPaymentId) {
    let intent;
    try {
      intent = await stripeClient.paymentIntents.retrieve(payment.providerPaymentId);

      if (intent.status === "succeeded") {
        return { canceled: false, protectedPayment: true, status: intent.status };
      }

      if (intent.status !== "canceled") {
        intent = await stripeClient.paymentIntents.cancel(
          payment.providerPaymentId,
          { cancellation_reason: "abandoned" },
          { idempotencyKey: cancellationIdempotencyKey(payment.providerPaymentId, reason) }
        );
      }
      providerStatus = intent.status;
    } catch (error) {
      const recoveryError = new CheckoutRecoveryError(
        "STRIPE_CANCELLATION_UNCONFIRMED",
        "The previous payment could not be canceled safely",
        503
      );
      recoveryError.providerCode = error.code || error.type;
      throw recoveryError;
    }
  }

  const canceled = await finalizeLocalCancellation({
    prismaClient,
    order,
    reason,
    providerStatus
  });
  return { canceled, protectedPayment: false, status: providerStatus };
}

async function cancelSupersededCheckouts({
  userId,
  currentCartVersion,
  currentPricingFingerprint,
  stripeClient = getStripeClient(),
  prismaClient = prisma
}) {
  const obsoleteOrders = await prismaClient.order.findMany({
    where: {
      userId,
      NOT: {
        cartVersion: currentCartVersion,
        pricingFingerprint: currentPricingFingerprint
      },
      status: { in: OPEN_ORDER_STATUSES }
    },
    include: { payments: { orderBy: { checkoutVersion: "desc" } } }
  });
  let sameVersionCanceled = false;

  for (const order of obsoleteOrders) {
    const result = await cancelOrderSafely({
      order,
      reason: "superseded",
      stripeClient,
      prismaClient
    });
    if (result.protectedPayment) {
      throw new CheckoutRecoveryError(
        "PREVIOUS_PAYMENT_REQUIRES_RECONCILIATION",
        "A previous payment is already being completed",
        409
      );
    }
    if (result.canceled && order.cartVersion === currentCartVersion) {
      sameVersionCanceled = true;
    }
  }

  return { sameVersionCanceled };
}

async function resumeCheckout({
  userId,
  publicId,
  stripeClient = getStripeClient(),
  prismaClient = prisma,
  now = new Date()
}) {
  const order = await prismaClient.order.findFirst({
    where: { publicId, userId },
    include: { payments: { orderBy: { checkoutVersion: "desc" } } }
  });

  if (!order) return null;
  if (!OPEN_ORDER_STATUSES.includes(order.status)) {
    throw new CheckoutRecoveryError("CHECKOUT_NOT_RESUMABLE", "This order cannot be resumed", 409);
  }

  if (order.expiresAt <= now) {
    await cancelOrderSafely({ order, reason: "expired", stripeClient, prismaClient });
    throw new CheckoutRecoveryError("CHECKOUT_EXPIRED", "This checkout has expired", 409);
  }

  const cart = await getCartSummary(userId);
  if (cart.version !== order.cartVersion || cart.pricingFingerprint !== order.pricingFingerprint) {
    await cancelOrderSafely({ order, reason: "superseded", stripeClient, prismaClient });
    throw new CheckoutRecoveryError(
      "CHECKOUT_SNAPSHOT_CHANGED",
      "Your cart changed and must be reviewed again",
      409
    );
  }

  const payment = order.payments[0];
  if (!payment?.providerPaymentId) {
    throw new CheckoutRecoveryError(
      "CHECKOUT_RECOVERY_PENDING",
      "Payment initialization is still being recovered",
      503
    );
  }

  let intent;
  try {
    intent = await stripeClient.paymentIntents.retrieve(payment.providerPaymentId);
  } catch (error) {
    const recoveryError = new CheckoutRecoveryError(
      "STRIPE_UNAVAILABLE",
      "Payment provider is temporarily unavailable",
      503
    );
    recoveryError.providerCode = error.code || error.type;
    throw recoveryError;
  }

  if (!intentMatchesOrder(intent, order)) {
    await prismaClient.order.updateMany({
      where: { id: order.id, status: { in: OPEN_ORDER_STATUSES } },
      data: { status: "PAYMENT_REVIEW" }
    });
    throw new CheckoutRecoveryError(
      "CHECKOUT_REVIEW_REQUIRED",
      "Payment details could not be verified",
      409
    );
  }

  if (intent.status === "canceled") {
    await cancelOrderSafely({ order, reason: "provider_canceled", stripeClient, prismaClient });
    throw new CheckoutRecoveryError("CHECKOUT_NOT_RESUMABLE", "This payment was canceled", 409);
  }

  const requiresConfirmation = REUSABLE_PAYMENT_INTENT_STATUSES.includes(intent.status);
  const nextPaymentStatus = intent.status === "processing" ? "PROCESSING" : payment.status;
  let nextOrderStatus = intent.status === "processing" ? "PAYMENT_PROCESSING" : order.status;
  if (requiresConfirmation && canTransitionOrder(order.status, "PENDING_PAYMENT")) {
    nextOrderStatus = "PENDING_PAYMENT";
  }

  await prismaClient.$transaction([
    prismaClient.payment.update({
      where: { id: payment.id },
      data: {
        providerStatus: intent.status,
        ...(requiresConfirmation && canTransitionPayment(payment.status, "PENDING")
          ? { status: "PENDING", failureCode: null }
          : {}),
        ...(nextPaymentStatus === "PROCESSING" ? { status: "PROCESSING" } : {})
      }
    }),
    prismaClient.order.update({
      where: { id: order.id },
      data: {
        ...(nextOrderStatus === "PENDING_PAYMENT" ? { status: "PENDING_PAYMENT" } : {}),
        ...(nextOrderStatus === "PAYMENT_PROCESSING" ? { status: "PAYMENT_PROCESSING" } : {})
      }
    })
  ]);

  return {
    orderId: order.publicId,
    orderStatus: nextOrderStatus,
    amount: order.totalAmount,
    currency: order.currency,
    paymentStatus: intent.status,
    requiresConfirmation,
    clientSecret: requiresConfirmation ? intent.client_secret : null
  };
}

async function expireStaleCheckouts({
  stripeClient = getStripeClient(),
  prismaClient = prisma,
  now = new Date()
} = {}) {
  const expiredOrders = await prismaClient.order.findMany({
    where: { expiresAt: { lte: now }, status: { in: OPEN_ORDER_STATUSES } },
    include: { payments: { orderBy: { checkoutVersion: "desc" } } },
    take: 100,
    orderBy: { expiresAt: "asc" }
  });
  const summary = { scanned: expiredOrders.length, canceled: 0, protected: 0, failed: 0 };

  for (const order of expiredOrders) {
    try {
      const result = await cancelOrderSafely({
        order,
        reason: "expired",
        stripeClient,
        prismaClient
      });
      if (result.protectedPayment) summary.protected += 1;
      else if (result.canceled) summary.canceled += 1;
    } catch (_error) {
      summary.failed += 1;
    }
  }

  return summary;
}

module.exports = {
  CheckoutRecoveryError,
  OPEN_ORDER_STATUSES,
  REUSABLE_PAYMENT_INTENT_STATUSES,
  cancelOrderSafely,
  cancelSupersededCheckouts,
  expireStaleCheckouts,
  intentMatchesOrder,
  resumeCheckout
};
