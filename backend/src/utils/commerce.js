const ARTIST_NET_REVENUE_RATE = 0.93;

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
    return payment.status;
  }

  return "Pending";
}

function buildOrderStatus(order) {
  if (order?.status) {
    return order.status;
  }

  if (order?.payments?.some((payment) => payment.status === "Succeeded")) {
    return "Paid";
  }

  if (order?.payments?.some((payment) => payment.status === "Refunded")) {
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

module.exports = {
  ARTIST_NET_REVENUE_RATE,
  parseAmount,
  formatCurrencyAmount,
  buildPaymentStatus,
  buildOrderStatus,
  isPaidOrder,
  computeNetRevenue,
  formatOrderReference
};
