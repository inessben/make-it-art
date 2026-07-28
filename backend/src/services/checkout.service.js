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
const { isExclusiveArtworkLicenseType } = require("../constants/artwork-license-types");
const { cancelSupersededCheckouts, CheckoutRecoveryError } = require("./checkout-recovery.service");
const { reconcilePaymentIntent } = require("./payment-monitoring.service");
const { tryCreatePaymentCustomerContext } = require("./saved-payment-method.service");

const orderRepository = require("../repositories/order.repository");
const notificationRepository = require("../repositories/notification.repository");
const { sendArtistSaleEmail } = require("./mail.service");
const { parsePriceValue } = require("../utils/serialize-marketplace");
const { computeNetRevenue, formatOrderReference } = require("../utils/commerce");

/**
 * Stripe-based checkout flow and alternative "simple" checkout flow are merged here due to conflict.
 * This file supports both: see exported functions below.
 */

// Stripe checkout flow functions

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
    include: { order: true }
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
      include: { payments: true }
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
      const reservableItems = cartSummary.items.filter((item) =>
        isExclusiveArtworkLicenseType(item.licenseType)
      );
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
              licenseType: item.licenseType,
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
          ...(reservableItems.length > 0
            ? {
                reservations: {
                  create: reservableItems.map((item) => ({
                    artworkId: item.artworkId,
                    quantity: item.quantity,
                    expiresAt
                  }))
                }
              }
            : {}),
          payments: {
            create: {
              checkoutVersion: 1,
              idempotencyKey,
              amount: cartSummary.totalAmount,
              currency: cartSummary.currency
            }
          }
        },
        include: { payments: true }
      });

      for (const item of reservableItems) {
        const reservation = await transaction.artwork.updateMany({
          where: {
            id: item.artworkId,
            licenseType: "EXCLUSIVE",
            visibility: "PUBLISHED",
            saleStatus: "AVAILABLE",
            isSold: false,
            stockQuantity: 1,
            reservedQuantity: 0
          },
          data: {
            reservedQuantity: 1
          }
        });

        if (item.quantity !== 1 || reservation.count !== 1) {
          throw new CheckoutError(
            "EXCLUSIVE_ARTWORK_UNAVAILABLE",
            "This exclusive artwork is already reserved or sold",
            409
          );
        }
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

function stripeId(value) {
  return typeof value === "string" ? value : value?.id;
}

function assertStripeIntentMatchesOrder(paymentIntent, order, expectedCustomerId) {
  const intentCustomerId = stripeId(paymentIntent.customer);

  return (
    paymentIntent.amount === order.totalAmount &&
    paymentIntent.currency === order.currency.toLowerCase() &&
    paymentIntent.metadata?.order_id === order.publicId &&
    (!intentCustomerId || !expectedCustomerId || intentCustomerId === expectedCustomerId)
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
  const customerContext = await tryCreatePaymentCustomerContext({
    userId: order.userId,
    stripeClient,
    prismaClient: prisma
  });

  if (customerContext.errorCode) {
    console.warn("Stripe saved payment methods are unavailable for this checkout", {
      code: customerContext.errorCode
    });
  }

  try {
    if (payment.providerPaymentId) {
      paymentIntent = await stripeClient.paymentIntents.retrieve(payment.providerPaymentId);
    } else {
      paymentIntent = await stripeClient.paymentIntents.create(
        {
          amount: order.totalAmount,
          currency: order.currency.toLowerCase(),
          receipt_email: order.billingSnapshot?.email || undefined,
          ...(customerContext.customerId ? { customer: customerContext.customerId } : {}),
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

  if (!assertStripeIntentMatchesOrder(paymentIntent, order, customerContext.customerId)) {
    await markOrderForReview(order.id);
    throw new CheckoutError(
      "CHECKOUT_REVIEW_REQUIRED",
      "Payment details could not be verified",
      409
    );
  }

  const requiresConfirmation = isPaymentIntentReusable(paymentIntent.status);
  const intentCustomerId = stripeId(paymentIntent.customer);
  const customerSessionClientSecret =
    requiresConfirmation && intentCustomerId && intentCustomerId === customerContext.customerId
      ? customerContext.customerSessionClientSecret
      : null;

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
    clientSecret: requiresConfirmation ? paymentIntent.client_secret : null,
    customerSessionClientSecret,
    savedPaymentMethodsAvailable: Boolean(customerSessionClientSecret)
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
    clientSecret: paymentState.clientSecret,
    customerSessionClientSecret: paymentState.customerSessionClientSecret,
    savedPaymentMethodsAvailable: paymentState.savedPaymentMethodsAvailable
  };
}

// "Simple" custom checkout flow (artwork & notification system)

function normalizeCheckoutItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items
    .map((item) => ({
      artworkId: Number.parseInt(item.artworkId, 10),
      quantity: Math.max(1, Math.floor(Number(item.quantity || 1)))
    }))
    .filter((item) => Number.isInteger(item.artworkId) && item.artworkId > 0);
}

async function createCheckout({ userId, items, paymentMethod, billingEmail }) {
  const normalizedItems = normalizeCheckoutItems(items);

  if (normalizedItems.length === 0) {
    throw new Error("CHECKOUT_EMPTY");
  }

  const artworkIds = [...new Set(normalizedItems.map((item) => item.artworkId))];
  const artworks = await prisma.artwork.findMany({
    where: {
      id: {
        in: artworkIds
      }
    },
    include: {
      artist: {
        include: {
          user: true
        }
      }
    }
  });

  if (artworks.length !== artworkIds.length) {
    throw new Error("ARTWORK_NOT_FOUND");
  }

  const artworkById = new Map(artworks.map((artwork) => [artwork.id, artwork]));
  const lineItems = [];
  let totalAmount = 0;

  for (const item of normalizedItems) {
    const artwork = artworkById.get(item.artworkId);

    if (!artwork) {
      throw new Error("ARTWORK_NOT_FOUND");
    }

    if (artwork.artist?.userId === userId) {
      throw new Error("CANNOT_BUY_OWN_ARTWORK");
    }

    if (artwork.visibility !== "PUBLISHED") {
      throw new Error("ARTWORK_NOT_AVAILABLE");
    }

    if (artwork.licenseType === "EXCLUSIVE" && artwork.isSold) {
      throw new Error("ARTWORK_ALREADY_SOLD");
    }

    if (artwork.licenseType === "EXCLUSIVE") {
      throw new Error("EXCLUSIVE_CHECKOUT_REQUIRES_SECURE_FLOW");
    }

    const unitPrice = parsePriceValue(artwork.price || artwork.priceTokens);

    if (unitPrice === null || unitPrice <= 0) {
      throw new Error("INVALID_ARTWORK_PRICE");
    }

    const lineTotal = unitPrice * item.quantity;
    totalAmount += lineTotal;

    for (let index = 0; index < item.quantity; index += 1) {
      lineItems.push({
        artworkId: artwork.id,
        artwork,
        licenseType: artwork.licenseType || "PERSONAL",
        quantity: 1,
        unitPrice,
        lineTotal: unitPrice
      });
    }
  }

  const checkoutResult = await orderRepository.createCheckoutOrder({
    userId,
    lineItems: lineItems.map((lineItem) => ({
      artworkId: lineItem.artworkId,
      licenseType: lineItem.licenseType,
      unitPrice: lineItem.unitPrice
    })),
    paymentMethod: paymentMethod || "card",
    totalAmount
  });

  const buyer = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      username: true,
      email: true
    }
  });

  const buyerLabel = buyer?.username || buyer?.email || "Un collectionneur";
  const notificationsByArtistUser = new Map();

  for (const lineItem of lineItems) {
    const artistUserId = lineItem.artwork.artist?.userId;

    if (!artistUserId) {
      continue;
    }

    const existing = notificationsByArtistUser.get(artistUserId) || {
      artistUserId,
      artistEmail: lineItem.artwork.artist?.user?.email || null,
      artistDisplayName:
        lineItem.artwork.artist?.displayName ||
        lineItem.artwork.artist?.user?.username ||
        "Artiste",
      artworks: [],
      grossAmount: 0
    };

    existing.artworks.push(lineItem.artwork.title || "Oeuvre");
    existing.grossAmount += lineItem.lineTotal;
    notificationsByArtistUser.set(artistUserId, existing);
  }

  for (const notificationData of notificationsByArtistUser.values()) {
    const artworkLabel =
      notificationData.artworks.length === 1
        ? `"${notificationData.artworks[0]}"`
        : `${notificationData.artworks.length} oeuvres`;
    const orderReference = formatOrderReference(checkoutResult.order.id);

    await notificationRepository.createNotification({
      userId: notificationData.artistUserId,
      type: "sale",
      title: "Nouvelle vente",
      message: `${buyerLabel} a achete ${artworkLabel} pour EUR ${notificationData.grossAmount.toFixed(2)}.`,
      payload: {
        orderId: checkoutResult.order.id,
        orderReference,
        grossAmount: notificationData.grossAmount,
        buyer: {
          id: buyer?.id || userId,
          username: buyer?.username || null,
          email: billingEmail || buyer?.email || null
        },
        artworkTitles: notificationData.artworks
      }
    });

    if (notificationData.artistEmail) {
      try {
        await sendArtistSaleEmail({
          to: notificationData.artistEmail,
          artistName: notificationData.artistDisplayName,
          orderReference,
          artworkTitles: notificationData.artworks,
          grossAmount: notificationData.grossAmount,
          netAmount: computeNetRevenue(notificationData.grossAmount),
          buyerLabel,
          salesUrl: `${env.appBaseUrl}/artist/sales`
        });
      } catch (error) {
        console.error("Artist sale email error:", error);
      }
    }
  }

  return {
    order: checkoutResult.order,
    payment: checkoutResult.payment,
    totalAmount,
    billingEmail: billingEmail || buyer?.email || null
  };
}

module.exports = {
  CheckoutError,
  RESERVATION_DURATION_MS,
  deriveIdempotencyKey,
  initializeCheckout,
  createCheckout
};
