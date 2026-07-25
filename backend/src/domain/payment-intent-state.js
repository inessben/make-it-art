const REUSABLE_PAYMENT_INTENT_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action"
]);

function isPaymentIntentReusable(status) {
  return REUSABLE_PAYMENT_INTENT_STATUSES.has(status);
}

module.exports = {
  REUSABLE_PAYMENT_INTENT_STATUSES,
  isPaymentIntentReusable
};
