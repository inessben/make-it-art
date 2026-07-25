const ORDER_STATUS_PRESENTATION = Object.freeze({
  PENDING_PAYMENT: {
    tone: "pending",
    badgeLabel: "Paiement en attente",
    title: "Payment not completed",
    message: "Your order is reserved, but no payment has been confirmed yet.",
    action: { label: "Resume payment", to: "/checkout" },
    poll: false
  },
  PAYMENT_PROCESSING: {
    tone: "pending",
    badgeLabel: "Vérification en cours",
    title: "Payment verification in progress",
    message: "Your bank or Stripe is still processing the transaction. No action is required.",
    action: null,
    poll: true
  },
  PAID: {
    tone: "success",
    badgeLabel: "Payée",
    title: "Payment confirmed",
    message: "Stripe confirmed the payment and your order is now complete.",
    action: { label: "View order", to: null },
    poll: false
  },
  PAYMENT_FAILED: {
    tone: "error",
    badgeLabel: "Paiement refusé",
    title: "Payment not completed",
    message: "The payment was not confirmed. Your card was not accepted for this attempt.",
    action: { label: "Try again safely", to: "/checkout" },
    poll: false
  },
  PAYMENT_REVIEW: {
    tone: "warning",
    badgeLabel: "En cours d’examen",
    title: "Payment under review",
    message: "We detected an inconsistency and are checking it before granting access.",
    action: { label: "View my account", to: "/profile" },
    poll: false
  },
  CANCELED: {
    tone: "error",
    badgeLabel: "Annulée",
    title: "Order canceled",
    message: "This order is no longer payable. Return to your cart to start a fresh checkout.",
    action: { label: "Return to cart", to: "/cart" },
    poll: false
  },
  PARTIALLY_REFUNDED: {
    tone: "warning",
    badgeLabel: "Partiellement remboursée",
    title: "Order partially refunded",
    message: "A portion of this order has been returned to the original payment method.",
    action: null,
    poll: false
  },
  REFUNDED: {
    tone: "neutral",
    badgeLabel: "Remboursée",
    title: "Order refunded",
    message: "The full order amount was returned and its digital access has been revoked.",
    action: null,
    poll: false
  }
});

const PAYMENT_RETURN_STATUS_PRESENTATION = Object.freeze({
  PENDING_PAYMENT: {
    tone: "pending",
    title: "Payment confirmation in progress",
    message:
      "Your payment attempt was submitted. We are waiting for the signed server confirmation before completing your order.",
    action: null,
    poll: true
  }
});

const TERMINAL_CHECKOUT_STATUSES = new Set(["PAID", "CANCELED", "REFUNDED"]);

const REFUND_STATUS_PRESENTATION = Object.freeze({
  PENDING: {
    label: "Refund in progress",
    message: "Stripe is processing this refund. Your bank may need additional time."
  },
  SUCCEEDED: {
    label: "Refund confirmed",
    message: "Stripe confirmed that this amount was returned to the original payment method."
  },
  FAILED: {
    label: "Refund not completed",
    message: "This refund failed and did not reduce the paid amount. Support has been notified."
  }
});

const PAYMENT_STATUS_LABELS = Object.freeze({
  PENDING: "En attente",
  PROCESSING: "En cours",
  SUCCEEDED: "Confirmé",
  FAILED: "Échoué",
  CANCELED: "Annulé",
  PARTIALLY_REFUNDED: "Partiellement remboursé",
  REFUNDED: "Remboursé"
});

export function getOrderStatusPresentation(status) {
  return (
    ORDER_STATUS_PRESENTATION[status] || {
      tone: "warning",
      badgeLabel: "Statut indisponible",
      title: "Status temporarily unavailable",
      message: "Open your order history later or contact support if the issue persists.",
      action: { label: "View order history", to: "/orders" },
      poll: false
    }
  );
}

export function getPaymentReturnStatusPresentation(status) {
  return PAYMENT_RETURN_STATUS_PRESENTATION[status] || getOrderStatusPresentation(status);
}

export function getPaymentReturnActionTarget(action, orderId) {
  const safeOrderId =
    typeof orderId === "string" && orderId.trim() ? encodeURIComponent(orderId.trim()) : "";

  if (action?.to === "/checkout") {
    return safeOrderId ? `/checkout?order=${safeOrderId}` : "/orders";
  }

  if (action?.to) return action.to;

  return safeOrderId ? `/orders/${safeOrderId}` : "/orders";
}

export function getOrderPollingDelay(attempt) {
  if (!Number.isSafeInteger(attempt) || attempt < 0) {
    throw new Error("Invalid polling attempt");
  }

  return Math.min(1500 * 2 ** attempt, 12000);
}

export function shouldClearCheckoutStorage(status) {
  return TERMINAL_CHECKOUT_STATUSES.has(status);
}

export function getRefundStatusPresentation(status) {
  return (
    REFUND_STATUS_PRESENTATION[status] || {
      label: "Refund status unavailable",
      message: "Contact support with your order reference if this status does not update."
    }
  );
}

export function getPaymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] || "Indisponible";
}

export const MAX_ORDER_POLL_ATTEMPTS = 5;
