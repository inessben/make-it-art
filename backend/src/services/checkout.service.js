const crypto = require("node:crypto");
const prisma = require("../lib/prisma");
const { getStripeClient } = require("../lib/stripe");
const { getCartSummary, withLockedPayableCart } = require("./cart.service");
const { cancelSupersededCheckouts, CheckoutRecoveryError } = require("./checkout-recovery.service");

const RESERVATION_DURATION_MS = 15 * 60 * 1000;
const STRIPE_MINIMUM_AMOUNT = 50;
const STRIPE_MAXIMUM_AMOUNT = 99999999;

class CheckoutError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "CheckoutError";
    this.code = code;
    this.status = status;
  }
}

function deriveIdempotencyKey(userId, clientKey) {
  const digest = crypto.createHash("sha256").update(`${userId}:${clientKey}`).digest("hex");

  return `checkout_${digest}`;
}

function mapStripePaymentStatus(providerStatus) {
  if (providerStatus === "processing") {
    return "PROCESSING";
  }

  if (providerStatus === "succeeded") {
    return "SUCCEEDED";
  }

  if (providerStatus === "canceled") {
    return "CANCELED";
  }

  return "PENDING";
}

function assertAmountSupported(amount) {
  if (amount < STRIPE_MINIMUM_AMOUNT || amount > STRIPE_MAXIMUM_AMOUNT) {
    throw new CheckoutError(
      "CHECKOUT_AMOUNT_UNSUPPORTED",
      "Cart total is outside the supported payment range",
      409
    );
  }
}

async function findCheckoutByIdempotencyKey(idempotencyKey) {
  return prisma.payment.findUnique({
    where: { idempotencyKey },
    include: {
      order: true
    }
  });
}

async function createPendingCheckout({
  userId,
  expectedVersion,
  expectedPricingFingerprint,
  idempotencyKey
}) {
  const existingPayment = await findCheckoutByIdempotencyKey(idempotencyKey);

  if (existingPayment) {
    if (existingPayment.order.userId !== userId) {
      throw new CheckoutError(
        "CHECKOUT_CONFLICT",
        "Checkout request conflicts with an existing operation",
        409
      );
    }

    return {
      order: existingPayment.order,
      payment: existingPayment,
      created: false
    };
  }

  const reuseExistingOrder = async (transaction, cartSummary, lockedCart) => {
    const existingOrder = await transaction.order.findUnique({
      where: {
        cartId_cartVersion: {
          cartId: lockedCart.id,
          cartVersion: cartSummary.version
        }
      },
      include: {
        payments: true
      }
    });

    if (!existingOrder) {
      return undefined;
    }

    const payment = existingOrder.payments[0];

    if (!payment) {
      throw new CheckoutError(
        "CHECKOUT_ALREADY_INITIALIZED",
        "This cart version already has a checkout operation",
        409
      );
    }

    return {
      order: existingOrder,
      payment,
      created: false
    };
  };

  return withLockedPayableCart(
    {
      userId,
      expectedVersion,
      expectedPricingFingerprint
    },
    async (transaction, cartSummary, lockedCart) => {
      assertAmountSupported(cartSummary.totalAmount);

      const expiresAt = new Date(Date.now() + RESERVATION_DURATION_MS);
      const order = await transaction.order.create({
        data: {
          userId,
          cartId: lockedCart.id,
          cartVersion: cartSummary.version,
          pricingFingerprint: cartSummary.pricingFingerprint,
          subtotalAmount: cartSummary.subtotalAmount,
          taxAmount: 0,
          feeAmount: 0,
          commissionAmount: cartSummary.commissionAmount,
          totalAmount: cartSummary.totalAmount,
          currency: cartSummary.currency,
          expiresAt,
          items: {
            create: cartSummary.items.map((item) => ({
              artworkId: item.artworkId,
              artworkTitle: item.title,
              artistName: item.artistName,
              quantity: item.quantity,
              unitAmount: item.unitAmount,
              subtotalAmount: item.subtotalAmount,
              commissionAmount: item.commissionAmount,
              currency: item.currency
            }))
          },
          reservations: {
            create: cartSummary.items.map((item) => ({
              artworkId: item.artworkId,
              quantity: item.quantity,
              expiresAt
            }))
          },
          payments: {
            create: {
              checkoutVersion: 1,
              idempotencyKey,
              amount: cartSummary.totalAmount,
              currency: cartSummary.currency
            }
          }
        },
        include: {
          payments: true
        }
      });

      for (const item of cartSummary.items) {
        await transaction.artwork.update({
          where: { id: item.artworkId },
          data: {
            reservedQuantity: { increment: item.quantity }
          }
        });
      }

      return {
        order,
        payment: order.payments[0],
        created: true
      };
    },
    { beforePayabilityCheck: reuseExistingOrder }
  );
}

function assertStripeIntentMatchesOrder(paymentIntent, order) {
  return (
    paymentIntent.amount === order.totalAmount &&
    paymentIntent.currency === order.currency.toLowerCase() &&
    paymentIntent.metadata?.order_id === order.publicId
  );
}

async function markOrderForReview(orderId) {
  await prisma.order.updateMany({
    where: {
      id: orderId,
      status: {
        in: ["PENDING_PAYMENT", "PAYMENT_PROCESSING", "PAYMENT_FAILED"]
      }
    },
    data: {
      status: "PAYMENT_REVIEW"
    }
  });
}

async function createOrRetrievePaymentIntent(stripeClient, checkout) {
  const { order, payment } = checkout;
  let paymentIntent;

  try {
    if (payment.providerPaymentId) {
      paymentIntent = await stripeClient.paymentIntents.retrieve(payment.providerPaymentId);
    } else {
      paymentIntent = await stripeClient.paymentIntents.create(
        {
          amount: order.totalAmount,
          currency: order.currency.toLowerCase(),
          automatic_payment_methods: {
            enabled: true
          },
          capture_method: "automatic",
          metadata: {
            order_id: order.publicId
          }
        },
        {
          idempotencyKey: payment.idempotencyKey
        }
      );
    }
  } catch (error) {
    if (error instanceof CheckoutError) {
      throw error;
    }

    const checkoutError = new CheckoutError(
      "STRIPE_UNAVAILABLE",
      "Payment provider is temporarily unavailable",
      503
    );
    checkoutError.providerCode = error.code || error.type;
    throw checkoutError;
  }

  if (!assertStripeIntentMatchesOrder(paymentIntent, order)) {
    await markOrderForReview(order.id);
    throw new CheckoutError(
      "CHECKOUT_REVIEW_REQUIRED",
      "Payment details could not be verified",
      409
    );
  }

  if (!paymentIntent.client_secret) {
    throw new CheckoutError(
      "STRIPE_RESPONSE_INVALID",
      "Payment provider returned an incomplete response",
      503
    );
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerPaymentId: paymentIntent.id,
      providerStatus: paymentIntent.status,
      status: mapStripePaymentStatus(paymentIntent.status)
    }
  });

  return paymentIntent;
}

async function initializeCheckout({
  userId,
  cartVersion,
  pricingFingerprint,
  clientIdempotencyKey,
  stripeClient = getStripeClient()
}) {
  const currentCart = await getCartSummary(userId);
  if (
    currentCart.version === cartVersion &&
    currentCart.pricingFingerprint === pricingFingerprint
  ) {
    const superseded = await cancelSupersededCheckouts({
      userId,
      currentCartVersion: cartVersion,
      currentPricingFingerprint: pricingFingerprint,
      stripeClient
    });

    if (superseded.sameVersionCanceled) {
      await prisma.cart.update({
        where: { userId },
        data: { version: { increment: 1 } }
      });
      throw new CheckoutRecoveryError(
        "CHECKOUT_SNAPSHOT_CHANGED",
        "Your cart changed and must be reviewed again",
        409
      );
    }
  }

  const idempotencyKey = deriveIdempotencyKey(userId, clientIdempotencyKey);
  const checkout = await createPendingCheckout({
    userId,
    expectedVersion: cartVersion,
    expectedPricingFingerprint: pricingFingerprint,
    idempotencyKey
  });
  const paymentIntent = await createOrRetrievePaymentIntent(stripeClient, checkout);

  return {
    created: checkout.created,
    orderId: checkout.order.publicId,
    orderStatus: checkout.order.status,
    amount: checkout.order.totalAmount,
    currency: checkout.order.currency,
    paymentStatus: paymentIntent.status,
    clientSecret: paymentIntent.client_secret
  };
}

module.exports = {
  CheckoutError,
  RESERVATION_DURATION_MS,
  deriveIdempotencyKey,
  initializeCheckout
};
