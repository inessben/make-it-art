const ARTIST_NET_REVENUE_RATE = 0.93;
const ORDER_STATUS_LABELS = Object.freeze({
  PENDING_PAYMENT: "Pending",
  PAYMENT_PROCESSING: "Processing",
  PAYMENT_FAILED: "Failed",
  PAYMENT_REVIEW: "Under review",
  PAID: "Paid",
  CANCELED: "Canceled",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded"
});

const PAYMENT_STATUS_LABELS = Object.freeze({
  PENDING: "Pending",
  PROCESSING: "Processing",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  CANCELED: "Canceled",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded"
});

function parseAmount(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalizedValue = String(value)
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const parsedValue = Number.parseFloat(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatCurrencyAmount(value) {
  return `EUR ${value.toFixed(2)}`;
}

function buildPaymentStatus(payment) {
  if (payment?.status) {
    return PAYMENT_STATUS_LABELS[payment.status] || payment.status;
  }

  return "Pending";
}

function buildOrderStatus(order) {
  if (order?.status) {
    return ORDER_STATUS_LABELS[order.status] || order.status;
  }

  if (order?.payments?.some((payment) => buildPaymentStatus(payment) === "Succeeded")) {
    return "Paid";
  }

  if (order?.payments?.some((payment) => buildPaymentStatus(payment) === "Refunded")) {
    return "Refunded";
  }

  return "Pending";
}

function isPaidOrder(order) {
  return buildOrderStatus(order) === "Paid";
}

function computeNetRevenue(grossAmount) {
  return grossAmount * ARTIST_NET_REVENUE_RATE;
}

function formatOrderReference(orderId) {
  return `#ORD-${String(orderId).padStart(4, "0")}`;
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function valueFromMinorUnits(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    return null;
  }

  return value / 100;
}

function getPaymentAmountValue(payment) {
  const amountValue = valueFromMinorUnits(payment?.amount);

  if (amountValue !== null) {
    return amountValue;
  }

  return parseAmount(payment?.price);
}

function getOrderAmountValue(order) {
  const amountValue = valueFromMinorUnits(order?.totalAmount);

  if (amountValue !== null) {
    return amountValue;
  }

  if (Array.isArray(order?.payments)) {
    return roundCurrency(
      order.payments.reduce((sum, payment) => sum + getPaymentAmountValue(payment), 0)
    );
  }

  return 0;
}

function getOrderItemGrossAmountValue(orderItem) {
  const subtotalAmountValue = valueFromMinorUnits(orderItem?.subtotalAmount);

  if (subtotalAmountValue !== null) {
    return subtotalAmountValue;
  }

  if (Number.isSafeInteger(orderItem?.unitAmount) && orderItem.unitAmount >= 0) {
    const quantity =
      Number.isSafeInteger(orderItem?.quantity) && orderItem.quantity > 0 ? orderItem.quantity : 1;

    return roundCurrency((orderItem.unitAmount * quantity) / 100);
  }

  return roundCurrency(parseAmount(orderItem?.priceTokens));
}

function getOrderItemNetAmountValue(
  orderItem,
  grossAmount = getOrderItemGrossAmountValue(orderItem)
) {
  const netAmountValue = valueFromMinorUnits(orderItem?.netAmount);

  if (netAmountValue !== null) {
    return netAmountValue;
  }

  return roundCurrency(grossAmount / 1.2);
}

function getOrderItemCommissionAmountValue(
  orderItem,
  netAmount = getOrderItemNetAmountValue(orderItem)
) {
  const commissionAmountValue = valueFromMinorUnits(orderItem?.commissionAmount);

  if (commissionAmountValue !== null) {
    return commissionAmountValue;
  }

  return roundCurrency((netAmount * 7) / 100);
}

function getRefundAmountValue(refund) {
  const amountValue = valueFromMinorUnits(refund?.amount);

  if (amountValue !== null) {
    return amountValue;
  }

  return parseAmount(refund?.amount);
}

function getRefundBreakdown(order) {
  const payments = Array.isArray(order?.payments) ? order.payments : [];

  return payments.reduce(
    (summary, payment) => {
      const refunds = Array.isArray(payment?.refunds) ? payment.refunds : [];

      if (refunds.length > 0) {
        for (const refund of refunds) {
          const amountValue = getRefundAmountValue(refund);

          if (refund?.status === "SUCCEEDED") {
            summary.refundedAmount += amountValue;
          } else if (refund?.status === "PENDING") {
            summary.pendingRefundAmount += amountValue;
          }
        }

        return summary;
      }

      const refundedAmountValue = valueFromMinorUnits(payment?.refundedAmount);

      if (refundedAmountValue !== null && refundedAmountValue > 0) {
        summary.refundedAmount += refundedAmountValue;
        return summary;
      }

      if (payment?.status === "REFUNDED") {
        summary.refundedAmount += getPaymentAmountValue(payment);
      }

      return summary;
    },
    {
      refundedAmount: 0,
      pendingRefundAmount: 0
    }
  );
}

module.exports = {
  ARTIST_NET_REVENUE_RATE,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  parseAmount,
  formatCurrencyAmount,
  buildPaymentStatus,
  buildOrderStatus,
  isPaidOrder,
  computeNetRevenue,
  formatOrderReference,
  getPaymentAmountValue,
  getOrderAmountValue,
  getOrderItemGrossAmountValue,
  getOrderItemNetAmountValue,
  getOrderItemCommissionAmountValue,
  getRefundBreakdown
};
