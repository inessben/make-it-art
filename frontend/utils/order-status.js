const ORDER_STATUS_PRESENTATION = Object.freeze({
  PENDING_PAYMENT: {
    tone: "pending",
    title: "Payment not completed",
    message: "Your order is reserved, but no payment has been confirmed yet.",
    action: { label: "Resume payment", to: "/checkout" },
    poll: false
  },
  PAYMENT_PROCESSING: {
    tone: "pending",
    title: "Payment verification in progress",
    message: "Your bank or Stripe is still processing the transaction. No action is required.",
    action: null,
    poll: true
  },
  PAID: {
    tone: "success",
    title: "Payment confirmed",
    message: "Stripe confirmed the payment and your order is now complete.",
    action: { label: "View order", to: null },
    poll: false
  },
  PAYMENT_FAILED: {
    tone: "error",
    title: "Payment not completed",
    message: "The payment was not confirmed. Your card was not accepted for this attempt.",
    action: { label: "Try again safely", to: "/checkout" },
    poll: false
  },
  PAYMENT_REVIEW: {
    tone: "warning",
    title: "Payment under review",
    message: "We detected an inconsistency and are checking it before granting access.",
    action: { label: "View my account", to: "/profile" },
    poll: false
  },
  CANCELED: {
    tone: "error",
    title: "Order canceled",
    message: "This order is no longer payable. Return to your cart to start a fresh checkout.",
    action: { label: "Return to cart", to: "/cart" },
    poll: false
  }
});

export function getOrderStatusPresentation(status) {
  return (
    ORDER_STATUS_PRESENTATION[status] || {
      tone: "warning",
      title: "Status temporarily unavailable",
      message: "Open your order history later or contact support if the issue persists.",
      action: { label: "View order history", to: "/orders" },
      poll: false
    }
  );
}

export function getOrderPollingDelay(attempt) {
  if (!Number.isSafeInteger(attempt) || attempt < 0) {
    throw new Error("Invalid polling attempt");
  }

  return Math.min(1500 * 2 ** attempt, 12000);
}

export const MAX_ORDER_POLL_ATTEMPTS = 5;
