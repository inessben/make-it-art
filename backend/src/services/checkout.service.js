const crypto = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");
const prisma = require("../lib/prisma");
const env = require("../config/env");
const {
  LAUNCH_CUSTOMER_TYPE,
  LAUNCH_MARKET_COUNTRY,
  normalizeFrenchBillingDetails
} = require("../domain/commerce-policy");
const { isPaymentIntentReusable } = require("../domain/payment-intent-state");
const { getStripeClient } = require("../lib/stripe");
const { getCartSummary, withLockedPayableCart } = require("./cart.service");
const { cancelSupersededCheckouts, CheckoutRecoveryError } = require("./checkout-recovery.service");
const { reconcilePaymentIntent } = require("./payment-monitoring.service");

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
  idempotencyKey,
  billingSnapshot
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

    if (
      existingPayment.order.cartVersion !== expectedVersion ||
      existingPayment.order.pricingFingerprint !== expectedPricingFingerprint ||
      !isDeepStrictEqual(existingPayment.order.billingSnapshot, billingSnapshot)
    ) {
      throw new CheckoutError(
        "IDEMPOTENCY_KEY_REUSED",
        "Idempotency-Key was already used for another checkout snapshot",
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

    if (!isDeepStrictEqual(existingOrder.billingSnapshot, billingSnapshot)) {
      throw new CheckoutError(
        "BILLING_DETAILS_CHANGED",
        "Billing details changed and the existing checkout can no longer be reused",
        409
      );
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
          customerType: LAUNCH_CUSTOMER_TYPE,
          marketCountry: LAUNCH_MARKET_COUNTRY,
          billingSnapshot,
          subtotalAmount: cartSummary.subtotalAmount,
          discountAmount: cartSummary.discountAmount,
          subtotalExcludingTaxAmount: cartSummary.netAmount,
          taxAmount: cartSummary.taxAmount,
          taxRateBps: cartSummary.taxRateBps,
          taxBehavior: cartSummary.taxBehavior,
          feeAmount: 0,
          commissionAmount: cartSummary.commissionAmount,
          commissionRateBps: cartSummary.commissionRateBps,
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
              discountAmount: item.discountAmount,
              netAmount: item.netAmount,
              taxAmount: item.taxAmount,
              taxRateBps: item.taxRateBps,
              commissionAmount: item.commissionAmount,
              commissionRateBps: item.commissionRateBps,
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

async function renewCanceledCheckoutSnapshot({ userId, expectedVersion }) {
  return prisma.$transaction(async (transaction) => {
    const cart = await transaction.cart.findUnique({ where: { userId } });

    if (!cart) return null;

    await transaction.$queryRaw`SELECT "id" FROM "cart" WHERE "id" = ${cart.id} FOR UPDATE`;
    const lockedCart = await transaction.cart.findUnique({ where: { id: cart.id } });

    if (!lockedCart || lockedCart.version !== expectedVersion) return null;

    const canceledOrder = await transaction.order.findUnique({
      where: {
        cartId_cartVersion: {
          cartId: lockedCart.id,
          cartVersion: expectedVersion
        }
      },
      select: { status: true }
    });

    if (canceledOrder?.status !== "CANCELED") return null;

    const renewedCart = await transaction.cart.update({
      where: { id: lockedCart.id },
      data: { version: { increment: 1 } },
      select: { version: true }
    });

    return renewedCart.version;
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
          receipt_email: order.billingSnapshot?.email || undefined,
          ...(env.stripe.paymentMethodConfigurationId
            ? { payment_method_configuration: env.stripe.paymentMethodConfigurationId }
            : {}),
          metadata: {
            order_id: order.publicId,
            merchant_of_record: "MAKE_IT_ART",
            market_country: order.marketCountry,
            customer_type: order.customerType,
            tax_behavior: order.taxBehavior
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

  const requiresConfirmation = isPaymentIntentReusable(paymentIntent.status);

  if (requiresConfirmation && !paymentIntent.client_secret) {
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
      providerStatus: paymentIntent.status
    }
  });

  const reconciliation = await reconcilePaymentIntent({
    intent: paymentIntent,
    localPaymentStatus: payment.status,
    prismaClient: prisma
  });

  if (!reconciliation.reconciled) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: mapStripePaymentStatus(paymentIntent.status) }
    });
  }

  const synchronizedOrder = reconciliation.reconciled
    ? await prisma.order.findUnique({ where: { id: order.id } })
    : order;

  return {
    paymentIntent,
    orderStatus: synchronizedOrder.status,
    requiresConfirmation,
    clientSecret: requiresConfirmation ? paymentIntent.client_secret : null
  };
}

async function initializeCheckout({
  userId,
  cartVersion,
  pricingFingerprint,
  billingDetails,
  clientIdempotencyKey,
  stripeClient = getStripeClient()
}) {
  const buyer = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });
  if (!buyer) {
    throw new CheckoutError("CHECKOUT_BUYER_NOT_FOUND", "Buyer account is unavailable", 404);
  }
  const billingSnapshot = normalizeFrenchBillingDetails(billingDetails, {
    email: buyer.email
  });

  let currentCart = await getCartSummary(userId);
  let effectiveCartVersion = cartVersion;
  let effectivePricingFingerprint = pricingFingerprint;

  if (
    currentCart.version === cartVersion &&
    currentCart.pricingFingerprint === pricingFingerprint
  ) {
    const renewedVersion = await renewCanceledCheckoutSnapshot({
      userId,
      expectedVersion: cartVersion
    });

    if (renewedVersion) {
      effectiveCartVersion = renewedVersion;
      currentCart = await getCartSummary(userId);
      effectivePricingFingerprint = currentCart.pricingFingerprint;
    }
  }

  if (
    currentCart.version === effectiveCartVersion &&
    currentCart.pricingFingerprint === effectivePricingFingerprint
  ) {
    const superseded = await cancelSupersededCheckouts({
      userId,
      currentCartVersion: effectiveCartVersion,
      currentPricingFingerprint: effectivePricingFingerprint,
      stripeClient
    });

    if (superseded.sameVersionCanceled) {
      throw new CheckoutRecoveryError(
        "CHECKOUT_SNAPSHOT_CHANGED",
        "Your cart changed and must be reviewed again",
        409
      );
    }
  }

  const idempotencyScope =
    effectiveCartVersion === cartVersion
      ? clientIdempotencyKey
      : `${clientIdempotencyKey}:${effectiveCartVersion}`;
  const idempotencyKey = deriveIdempotencyKey(userId, idempotencyScope);
  const checkout = await createPendingCheckout({
    userId,
    expectedVersion: effectiveCartVersion,
    expectedPricingFingerprint: effectivePricingFingerprint,
    idempotencyKey,
    billingSnapshot
  });
  const paymentState = await createOrRetrievePaymentIntent(stripeClient, checkout);

  return {
    created: checkout.created,
    orderId: checkout.order.publicId,
    orderStatus: paymentState.orderStatus,
    amount: checkout.order.totalAmount,
    currency: checkout.order.currency,
    billingDetails: checkout.order.billingSnapshot,
    paymentStatus: paymentState.paymentIntent.status,
    requiresConfirmation: paymentState.requiresConfirmation,
    clientSecret: paymentState.clientSecret
  };
}

module.exports = {
  CheckoutError,
  RESERVATION_DURATION_MS,
  deriveIdempotencyKey,
  initializeCheckout
};
