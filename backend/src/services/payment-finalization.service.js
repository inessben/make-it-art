const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");
const env = require("../config/env");
const { isFranceB2COrder } = require("../domain/commerce-policy");
const { isTransactionWriteConflict, waitForTransactionRetry } = require("../lib/transaction-retry");
const { canTransitionOrder, canTransitionPayment } = require("../domain/payment-state");
const { recordSavedPaymentMethodConsent } = require("./saved-payment-method.service");

const EVENT_TARGETS = Object.freeze({
  "payment_intent.processing": {
    orderStatus: "PAYMENT_PROCESSING",
    paymentStatus: "PROCESSING"
  },
  "payment_intent.succeeded": {
    orderStatus: "PAID",
    paymentStatus: "SUCCEEDED"
  },
  "payment_intent.payment_failed": {
    orderStatus: "PAYMENT_FAILED",
    paymentStatus: "FAILED"
  },
  "payment_intent.canceled": {
    orderStatus: "CANCELED",
    paymentStatus: "CANCELED"
  }
});

const FULFILLMENT_TASK_TYPES = Object.freeze([
  "NOTIFY_ARTIST_SALE",
  "SEND_PAYMENT_CONFIRMATION",
  "GRANT_DOWNLOAD_RIGHTS",
  "GENERATE_CERTIFICATE",
  "ISSUE_SALE_INVOICE"
]);

const RETRYABLE_CHARGE_ROTATION_PAYMENT_STATUSES = new Set(["PENDING", "PROCESSING", "FAILED"]);
const RETRYABLE_CHARGE_ROTATION_ORDER_STATUSES = new Set([
  "PENDING_PAYMENT",
  "PAYMENT_PROCESSING",
  "PAYMENT_FAILED"
]);

class PaymentFinalizationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PaymentFinalizationError";
    this.code = code;
  }
}

function stripeId(value) {
  return typeof value === "string" ? value : value?.id;
}

function canRotateProviderCharge(payment) {
  return (
    RETRYABLE_CHARGE_ROTATION_PAYMENT_STATUSES.has(payment.status) &&
    RETRYABLE_CHARGE_ROTATION_ORDER_STATUSES.has(payment.order.status)
  );
}

function validatePaymentIntent(paymentIntent, payment) {
  const errors = [];
  const expectedCurrency = payment.currency.toLowerCase();
  const paymentIntentCustomerId = stripeId(paymentIntent.customer);
  const expectedCustomerId = payment.order.user?.stripeCustomerId;

  if (paymentIntent.id !== payment.providerPaymentId) errors.push("PAYMENT_INTENT_ID_MISMATCH");
  if (
    payment.providerChargeId &&
    stripeId(paymentIntent.latest_charge) &&
    stripeId(paymentIntent.latest_charge) !== payment.providerChargeId &&
    !canRotateProviderCharge(payment)
  ) {
    errors.push("PAYMENT_CHARGE_ID_MISMATCH");
  }
  if (paymentIntent.amount !== payment.amount) errors.push("PAYMENT_AMOUNT_MISMATCH");
  if (paymentIntent.currency !== expectedCurrency) errors.push("PAYMENT_CURRENCY_MISMATCH");
  if (paymentIntent.metadata?.order_id !== payment.order.publicId) {
    errors.push("PAYMENT_ORDER_MISMATCH");
  }
  if (
    paymentIntentCustomerId &&
    expectedCustomerId &&
    paymentIntentCustomerId !== expectedCustomerId
  ) {
    errors.push("PAYMENT_CUSTOMER_MISMATCH");
  }
  if (paymentIntent.setup_future_usage && paymentIntent.setup_future_usage !== "on_session") {
    errors.push("PAYMENT_SETUP_FUTURE_USAGE_UNSUPPORTED");
  }
  if (!isFranceB2COrder(payment.order)) {
    errors.push("PAYMENT_COMMERCE_POLICY_MISMATCH");
  }
  if (
    payment.order.billingSnapshot?.customerType !== "B2C" ||
    payment.order.billingSnapshot?.address?.country !== "FR"
  ) {
    errors.push("PAYMENT_BILLING_SNAPSHOT_MISMATCH");
  }
  if (
    !Number.isSafeInteger(payment.order.taxRateBps) ||
    payment.order.taxRateBps <= 0 ||
    payment.order.subtotalExcludingTaxAmount + payment.order.taxAmount !== payment.order.totalAmount
  ) {
    errors.push("PAYMENT_TAX_SNAPSHOT_MISMATCH");
  }
  if (paymentIntent.status === "succeeded" && paymentIntent.amount_received !== payment.amount) {
    errors.push("PAYMENT_RECEIVED_AMOUNT_MISMATCH");
  }

  return errors;
}

function transitionAudit({ event, payment, entityType, previousStatus, nextStatus }) {
  return {
    orderId: payment.orderId,
    paymentId: payment.id,
    stripeEventId: event.id,
    stripeObjectId: event.data.object.id,
    entityType,
    previousStatus,
    nextStatus,
    reasonCode: event.type
  };
}

async function consumeReservations(transaction, payment) {
  const activeReservations = payment.order.reservations.filter(
    (reservation) => reservation.status === "ACTIVE"
  );

  for (const reservation of activeReservations) {
    let updated = await transaction.artwork.updateMany({
      where: {
        id: reservation.artworkId,
        licenseType: "EXCLUSIVE",
        saleStatus: "AVAILABLE",
        isSold: false,
        stockQuantity: reservation.quantity,
        reservedQuantity: reservation.quantity
      },
      data: {
        stockQuantity: 0,
        reservedQuantity: 0,
        saleStatus: "SOLD_OUT",
        isSold: true
      }
    });

    if (updated.count === 0) {
      updated = await transaction.artwork.updateMany({
        where: {
          id: reservation.artworkId,
          licenseType: { not: "EXCLUSIVE" },
          stockQuantity: { gte: reservation.quantity },
          reservedQuantity: { gte: reservation.quantity }
        },
        data: {
          stockQuantity: { decrement: reservation.quantity },
          reservedQuantity: { decrement: reservation.quantity }
        }
      });
    }

    if (updated.count !== 1) {
      throw new PaymentFinalizationError(
        "INVENTORY_FINALIZATION_CONFLICT",
        "Inventory cannot be finalized safely"
      );
    }
  }

  await transaction.inventoryReservation.updateMany({
    where: { orderId: payment.orderId, status: "ACTIVE" },
    data: { status: "CONSUMED" }
  });
}

async function removePurchasedItemsFromCart(transaction, payment) {
  const { order } = payment;

  await transaction.$queryRaw(
    Prisma.sql`SELECT "id" FROM "cart" WHERE "id" = ${order.cartId} FOR UPDATE`
  );

  const cart = await transaction.cart.findUnique({
    where: { id: order.cartId },
    include: { items: true }
  });

  if (!cart) return;

  if (cart.version === order.cartVersion) {
    const removed = await transaction.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    if (removed.count > 0) {
      await transaction.cart.update({
        where: { id: cart.id },
        data: { version: { increment: 1 } }
      });
    }

    return;
  }

  let cartChanged = false;

  for (const orderItem of order.items) {
    const cartItem = cart.items.find((item) => item.artworkId === orderItem.artworkId);

    if (!cartItem) continue;

    const remainingQuantity = cartItem.quantity - orderItem.quantity;

    if (remainingQuantity > 0) {
      await transaction.cartItem.update({
        where: { id: cartItem.id },
        data: { quantity: remainingQuantity }
      });
    } else {
      await transaction.cartItem.delete({ where: { id: cartItem.id } });
    }

    cartChanged = true;
  }

  if (cartChanged) {
    await transaction.cart.update({
      where: { id: cart.id },
      data: { version: { increment: 1 } }
    });
  }
}

async function releaseReservations(transaction, payment) {
  const activeReservations = payment.order.reservations.filter(
    (reservation) => reservation.status === "ACTIVE"
  );

  for (const reservation of activeReservations) {
    const updated = await transaction.artwork.updateMany({
      where: {
        id: reservation.artworkId,
        reservedQuantity: { gte: reservation.quantity }
      },
      data: { reservedQuantity: { decrement: reservation.quantity } }
    });

    if (updated.count !== 1) {
      throw new PaymentFinalizationError(
        "INVENTORY_RELEASE_CONFLICT",
        "Inventory cannot be released safely"
      );
    }
  }

  await transaction.inventoryReservation.updateMany({
    where: { orderId: payment.orderId, status: "ACTIVE" },
    data: { status: "RELEASED" }
  });
}

async function flagPaymentForReview(transaction, event, payment, validationErrors) {
  const currentOrderStatus = payment.order.status;
  const nextOrderStatus = canTransitionOrder(currentOrderStatus, "PAYMENT_REVIEW")
    ? "PAYMENT_REVIEW"
    : currentOrderStatus;

  if (nextOrderStatus !== currentOrderStatus) {
    await transaction.order.update({
      where: { id: payment.orderId },
      data: { status: nextOrderStatus }
    });
    await transaction.financialTransition.create({
      data: transitionAudit({
        event,
        payment,
        entityType: "ORDER",
        previousStatus: currentOrderStatus,
        nextStatus: nextOrderStatus
      })
    });
  }

  await transaction.paymentOperatorAlert.create({
    data: {
      orderId: payment.orderId,
      paymentId: payment.id,
      stripeEventId: event.id,
      stripeObjectId: event.data.object.id,
      code: validationErrors.sort().join("+")
    }
  });
}

async function enqueueFulfillment(transaction, payment) {
  const taskTypes = env.commerce.commissionInvoicingEnabled
    ? [...FULFILLMENT_TASK_TYPES, "ISSUE_COMMISSION_INVOICES"]
    : FULFILLMENT_TASK_TYPES;
  await transaction.fulfillmentTask.createMany({
    data: taskTypes.map((taskType) => ({
      orderId: payment.orderId,
      taskType,
      taskKey: `order:${payment.order.publicId}:${taskType}`
    })),
    skipDuplicates: true
  });
}

async function applyPaymentEvent(transaction, event, payment) {
  const paymentIntent = event.data.object;
  const target = EVENT_TARGETS[event.type];
  const validationErrors = validatePaymentIntent(paymentIntent, payment);

  if (validationErrors.length > 0) {
    await flagPaymentForReview(transaction, event, payment, validationErrors);
    return { outcome: "review", validationErrors };
  }

  const providerChargeId = stripeId(paymentIntent.latest_charge);
  if (providerChargeId && providerChargeId !== payment.providerChargeId) {
    await transaction.payment.update({
      where: { id: payment.id },
      data: { providerChargeId }
    });
  }

  const currentPaymentStatus = payment.status;
  const currentOrderStatus = payment.order.status;
  const nextPaymentStatus = canTransitionPayment(currentPaymentStatus, target.paymentStatus)
    ? target.paymentStatus
    : currentPaymentStatus;
  const nextOrderStatus = canTransitionOrder(currentOrderStatus, target.orderStatus)
    ? target.orderStatus
    : currentOrderStatus;

  if (
    event.type === "payment_intent.succeeded" &&
    nextOrderStatus === "PAID" &&
    nextPaymentStatus === "SUCCEEDED" &&
    currentOrderStatus !== "PAID"
  ) {
    await consumeReservations(transaction, payment);
    await removePurchasedItemsFromCart(transaction, payment);
  }

  if (event.type === "payment_intent.canceled" && nextOrderStatus === "CANCELED") {
    await releaseReservations(transaction, payment);
  }

  if (nextPaymentStatus !== currentPaymentStatus) {
    await transaction.payment.update({
      where: { id: payment.id },
      data: {
        status: nextPaymentStatus,
        providerStatus: paymentIntent.status,
        failureCode:
          event.type === "payment_intent.payment_failed"
            ? paymentIntent.last_payment_error?.code || "PAYMENT_FAILED"
            : null,
        ...(nextPaymentStatus === "SUCCEEDED" ? { succeededAt: new Date() } : {}),
        ...(nextPaymentStatus === "FAILED" ? { failedAt: new Date() } : {}),
        ...(nextPaymentStatus === "CANCELED" ? { canceledAt: new Date() } : {})
      }
    });
    await transaction.financialTransition.create({
      data: transitionAudit({
        event,
        payment,
        entityType: "PAYMENT",
        previousStatus: currentPaymentStatus,
        nextStatus: nextPaymentStatus
      })
    });
  }

  if (nextOrderStatus !== currentOrderStatus) {
    await transaction.order.update({
      where: { id: payment.orderId },
      data: {
        status: nextOrderStatus,
        ...(nextOrderStatus === "PAID" ? { paidAt: new Date() } : {}),
        ...(nextOrderStatus === "CANCELED" ? { canceledAt: new Date() } : {})
      }
    });
    await transaction.financialTransition.create({
      data: transitionAudit({
        event,
        payment,
        entityType: "ORDER",
        previousStatus: currentOrderStatus,
        nextStatus: nextOrderStatus
      })
    });
  }

  if (nextOrderStatus === "PAID") {
    if (event.type === "payment_intent.succeeded") {
      await recordSavedPaymentMethodConsent(transaction, paymentIntent, payment);
    }
    await enqueueFulfillment(transaction, payment);
  }

  return {
    outcome:
      nextOrderStatus === currentOrderStatus && nextPaymentStatus === currentPaymentStatus
        ? "ignored_transition"
        : "applied"
  };
}

async function persistFailedEvent(prismaClient, event, error) {
  await prismaClient.stripeWebhookEvent.upsert({
    where: { eventId: event.id },
    create: {
      eventId: event.id,
      eventType: event.type,
      stripeObjectId: event.data.object.id,
      status: "FAILED",
      attemptCount: 1,
      lastErrorCode: error.code || "PAYMENT_EVENT_PROCESSING_FAILED"
    },
    update: {
      status: "FAILED",
      attemptCount: { increment: 1 },
      lastErrorCode: error.code || "PAYMENT_EVENT_PROCESSING_FAILED"
    }
  });
}

async function processStripePaymentEvent({ event, prismaClient = prisma }) {
  if (!EVENT_TARGETS[event.type] || !event.data?.object?.id) {
    throw new PaymentFinalizationError("INVALID_PAYMENT_EVENT", "Invalid payment event");
  }

  let lastError;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await prismaClient.$transaction(
        async (transaction) => {
          await transaction.stripeWebhookEvent.upsert({
            where: { eventId: event.id },
            create: {
              eventId: event.id,
              eventType: event.type,
              stripeObjectId: event.data.object.id
            },
            update: {}
          });

          // All events for the same PaymentIntent are serialized, including
          // distinct and out-of-order Stripe event IDs.
          await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${event.data.object.id}, 0))::text AS lock`;

          const storedEvent = await transaction.stripeWebhookEvent.findUnique({
            where: { eventId: event.id }
          });

          if (storedEvent.status === "PROCESSED") {
            return { duplicate: true, outcome: "already_processed" };
          }

          const payment = await transaction.payment.findUnique({
            where: { providerPaymentId: event.data.object.id },
            include: {
              order: {
                include: {
                  reservations: true,
                  items: true,
                  user: { select: { stripeCustomerId: true } }
                }
              }
            }
          });

          if (!payment) {
            await transaction.stripeWebhookEvent.update({
              where: { eventId: event.id },
              data: {
                status: "FAILED",
                attemptCount: { increment: 1 },
                lastErrorCode: "PAYMENT_NOT_FOUND"
              }
            });
            return { duplicate: false, outcome: "retry", retryable: true };
          }

          const result = await applyPaymentEvent(transaction, event, payment);
          await transaction.stripeWebhookEvent.update({
            where: { eventId: event.id },
            data: {
              paymentId: payment.id,
              status: "PROCESSED",
              attemptCount: { increment: 1 },
              lastErrorCode: null,
              processedAt: new Date()
            }
          });

          return { duplicate: false, ...result };
        },
        { isolationLevel: "Serializable" }
      );
    } catch (error) {
      lastError = error;
      if (!isTransactionWriteConflict(error) || attempt === 5) break;
      await waitForTransactionRetry(attempt);
    }
  }

  await persistFailedEvent(prismaClient, event, lastError);
  throw lastError;
}

module.exports = {
  EVENT_TARGETS,
  FULFILLMENT_TASK_TYPES,
  PaymentFinalizationError,
  consumeReservations,
  processStripePaymentEvent,
  validatePaymentIntent
};
