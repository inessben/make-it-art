const ORDER_STATUS = Object.freeze({
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAYMENT_PROCESSING: "PAYMENT_PROCESSING",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_REVIEW: "PAYMENT_REVIEW",
  PAID: "PAID",
  CANCELED: "CANCELED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  REFUNDED: "REFUNDED"
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  CANCELED: "CANCELED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  REFUNDED: "REFUNDED"
});

const orderTransitions = new Map([
  [
    ORDER_STATUS.PENDING_PAYMENT,
    new Set([
      ORDER_STATUS.PAYMENT_PROCESSING,
      ORDER_STATUS.PAYMENT_FAILED,
      ORDER_STATUS.PAYMENT_REVIEW,
      ORDER_STATUS.PAID,
      ORDER_STATUS.CANCELED
    ])
  ],
  [
    ORDER_STATUS.PAYMENT_PROCESSING,
    new Set([
      ORDER_STATUS.PAYMENT_FAILED,
      ORDER_STATUS.PAYMENT_REVIEW,
      ORDER_STATUS.PAID,
      ORDER_STATUS.CANCELED
    ])
  ],
  [
    ORDER_STATUS.PAYMENT_FAILED,
    new Set([
      ORDER_STATUS.PENDING_PAYMENT,
      ORDER_STATUS.PAYMENT_PROCESSING,
      ORDER_STATUS.PAYMENT_REVIEW,
      ORDER_STATUS.PAID,
      ORDER_STATUS.CANCELED
    ])
  ],
  [
    ORDER_STATUS.PAYMENT_REVIEW,
    new Set([
      ORDER_STATUS.PAYMENT_FAILED,
      ORDER_STATUS.PAID,
      ORDER_STATUS.CANCELED,
      ORDER_STATUS.REFUNDED
    ])
  ],
  [ORDER_STATUS.PAID, new Set([ORDER_STATUS.PARTIALLY_REFUNDED, ORDER_STATUS.REFUNDED])],
  [ORDER_STATUS.PARTIALLY_REFUNDED, new Set([ORDER_STATUS.REFUNDED])],
  [ORDER_STATUS.CANCELED, new Set()],
  [ORDER_STATUS.REFUNDED, new Set()]
]);

const paymentTransitions = new Map([
  [
    PAYMENT_STATUS.PENDING,
    new Set([
      PAYMENT_STATUS.PROCESSING,
      PAYMENT_STATUS.SUCCEEDED,
      PAYMENT_STATUS.FAILED,
      PAYMENT_STATUS.CANCELED
    ])
  ],
  [
    PAYMENT_STATUS.PROCESSING,
    new Set([PAYMENT_STATUS.SUCCEEDED, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELED])
  ],
  [
    PAYMENT_STATUS.FAILED,
    new Set([
      PAYMENT_STATUS.PENDING,
      PAYMENT_STATUS.PROCESSING,
      PAYMENT_STATUS.SUCCEEDED,
      PAYMENT_STATUS.CANCELED
    ])
  ],
  [PAYMENT_STATUS.SUCCEEDED, new Set([PAYMENT_STATUS.PARTIALLY_REFUNDED, PAYMENT_STATUS.REFUNDED])],
  [PAYMENT_STATUS.PARTIALLY_REFUNDED, new Set([PAYMENT_STATUS.REFUNDED])],
  [PAYMENT_STATUS.CANCELED, new Set()],
  [PAYMENT_STATUS.REFUNDED, new Set()]
]);

function canTransition(transitions, from, to) {
  if (from === to) {
    return true;
  }

  return transitions.get(from)?.has(to) ?? false;
}

function assertTransition(transitions, entity, from, to) {
  if (!transitions.has(from)) {
    throw new Error(`Unknown ${entity} status: ${from}`);
  }

  if (!transitions.has(to)) {
    throw new Error(`Unknown ${entity} status: ${to}`);
  }

  if (!canTransition(transitions, from, to)) {
    throw new Error(`Invalid ${entity} status transition: ${from} -> ${to}`);
  }
}

function canTransitionOrder(from, to) {
  return canTransition(orderTransitions, from, to);
}

function assertOrderTransition(from, to) {
  assertTransition(orderTransitions, "order", from, to);
}

function canTransitionPayment(from, to) {
  return canTransition(paymentTransitions, from, to);
}

function assertPaymentTransition(from, to) {
  assertTransition(paymentTransitions, "payment", from, to);
}

module.exports = {
  ORDER_STATUS,
  PAYMENT_STATUS,
  canTransitionOrder,
  assertOrderTransition,
  canTransitionPayment,
  assertPaymentTransition
};
