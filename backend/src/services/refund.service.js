const prisma = require("../lib/prisma");
const { getStripeClient } = require("../lib/stripe");

const REFUND_REASONS = Object.freeze({
  CUSTOMER_REQUEST: "requested_by_customer",
  DUPLICATE: "duplicate",
  FRAUDULENT: "fraudulent"
});

class RefundError extends Error {
  constructor(code, message, status, refund = null) {
    super(message);
    this.name = "RefundError";
    this.code = code;
    this.status = status;
    this.refund = refund;
  }
}

function serializeRefund(refund) {
  return {
    id: refund.publicId,
    status: refund.status,
    amount: refund.amount,
    currency: refund.currency,
    reason: refund.reasonCode,
    reference: refund.providerReference || null,
    createdAt: refund.createdAt,
    updatedAt: refund.updatedAt
  };
}

function validateRefundInput({ amount, reasonCode }) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new RefundError("INVALID_REFUND_AMOUNT", "Refund amount must be a positive integer", 400);
  }
  if (!Object.hasOwn(REFUND_REASONS, reasonCode)) {
    throw new RefundError("INVALID_REFUND_REASON", "Invalid refund reason", 400);
  }
}

function assertIdempotentRequestMatches(refund, input) {
  if (
    refund.order.publicId !== input.orderPublicId ||
    refund.requestedByUserId !== input.requestedByUserId ||
    refund.amount !== input.amount ||
    refund.reasonCode !== input.reasonCode
  ) {
    throw new RefundError(
      "IDEMPOTENCY_KEY_REUSED",
      "Idempotency-Key was already used for another refund request",
      409
    );
  }
}

async function findRefundByIdempotencyKey(prismaClient, idempotencyKey) {
  return prismaClient.refund.findUnique({
    where: { idempotencyKey },
    include: { order: { select: { publicId: true } } }
  });
}

async function reserveRefund(input, prismaClient) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prismaClient.$transaction(
        async (transaction) => {
          const existing = await findRefundByIdempotencyKey(transaction, input.idempotencyKey);
          if (existing) {
            assertIdempotentRequestMatches(existing, input);
            return { refund: existing, created: false };
          }

          await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.orderPublicId}, 0))::text AS lock`;

          const concurrentReplay = await findRefundByIdempotencyKey(
            transaction,
            input.idempotencyKey
          );
          if (concurrentReplay) {
            assertIdempotentRequestMatches(concurrentReplay, input);
            return { refund: concurrentReplay, created: false };
          }

          const order = await transaction.order.findUnique({
            where: { publicId: input.orderPublicId },
            select: { id: true, publicId: true, status: true }
          });
          if (!order) throw new RefundError("ORDER_NOT_FOUND", "Order not found", 404);
          if (!["PAID", "PARTIALLY_REFUNDED"].includes(order.status)) {
            throw new RefundError("ORDER_NOT_REFUNDABLE", "Order is not refundable", 409);
          }

          const payment = await transaction.payment.findFirst({
            where: {
              orderId: order.id,
              status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED"] },
              providerPaymentId: { not: null }
            },
            include: {
              refunds: { where: { status: { in: ["PENDING", "SUCCEEDED"] } } }
            },
            orderBy: { checkoutVersion: "desc" }
          });
          if (!payment) {
            throw new RefundError("PAYMENT_NOT_REFUNDABLE", "Payment is not refundable", 409);
          }

          const reservedAmount = payment.refunds.reduce(
            (total, refund) => total + refund.amount,
            0
          );
          if (input.amount > payment.amount - reservedAmount) {
            throw new RefundError(
              "REFUND_AMOUNT_EXCEEDS_BALANCE",
              "Refund amount exceeds the refundable balance",
              409
            );
          }

          const refund = await transaction.refund.create({
            data: {
              orderId: order.id,
              paymentId: payment.id,
              requestedByUserId: input.requestedByUserId,
              idempotencyKey: input.idempotencyKey,
              amount: input.amount,
              currency: payment.currency,
              reasonCode: input.reasonCode
            },
            include: { order: { select: { publicId: true } } }
          });
          await transaction.auditLog.create({
            data: {
              userId: input.requestedByUserId,
              action: "REFUND_REQUESTED",
              entityType: "ORDER",
              entityId: order.publicId,
              ipAddress: input.ipAddress,
              createdAt: new Date()
            }
          });
          return { refund, created: true, providerPaymentId: payment.providerPaymentId };
        },
        { isolationLevel: "Serializable" }
      );
    } catch (error) {
      if (error.code === "P2034" && attempt < 3) continue;
      if (error.code === "P2002") {
        const existing = await findRefundByIdempotencyKey(prismaClient, input.idempotencyKey);
        if (existing) {
          assertIdempotentRequestMatches(existing, input);
          return { refund: existing, created: false };
        }
      }
      throw error;
    }
  }
}

async function requestRefund({
  orderPublicId,
  requestedByUserId,
  idempotencyKey,
  amount,
  reasonCode,
  ipAddress,
  prismaClient = prisma,
  stripeClient
}) {
  validateRefundInput({ amount, reasonCode });
  const input = {
    orderPublicId,
    requestedByUserId,
    idempotencyKey,
    amount,
    reasonCode,
    ipAddress
  };
  const reservation = await reserveRefund(input, prismaClient);

  if (reservation.refund.providerRefundId || reservation.refund.status !== "PENDING") {
    return { refund: serializeRefund(reservation.refund), created: reservation.created };
  }

  const payment = reservation.providerPaymentId
    ? { providerPaymentId: reservation.providerPaymentId }
    : await prismaClient.payment.findUnique({
        where: { id: reservation.refund.paymentId },
        select: { providerPaymentId: true }
      });

  try {
    const stripeRefund = await (stripeClient || getStripeClient()).refunds.create(
      {
        payment_intent: payment.providerPaymentId,
        amount: reservation.refund.amount,
        reason: REFUND_REASONS[reservation.refund.reasonCode],
        metadata: {
          local_refund_id: reservation.refund.publicId,
          order_id: reservation.refund.order.publicId
        }
      },
      { idempotencyKey: `refund:${reservation.refund.idempotencyKey}` }
    );

    const updated = await prismaClient.refund.update({
      where: { id: reservation.refund.id },
      data: {
        providerRefundId: stripeRefund.id,
        providerStatus: stripeRefund.status || "pending",
        failureCode: null
      }
    });
    return { refund: serializeRefund(updated), created: reservation.created };
  } catch (_error) {
    const pending = await prismaClient.refund.update({
      where: { id: reservation.refund.id },
      data: { failureCode: "PROVIDER_RESPONSE_UNKNOWN" }
    });
    throw new RefundError(
      "REFUND_PROVIDER_PENDING",
      "Refund status is uncertain; retry only with the same Idempotency-Key",
      502,
      serializeRefund(pending)
    );
  }
}

module.exports = {
  REFUND_REASONS,
  RefundError,
  requestRefund,
  serializeRefund,
  validateRefundInput
};
