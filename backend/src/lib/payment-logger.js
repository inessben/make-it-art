const SENSITIVE_PATTERN =
  /(client_secret|authorization|cookie|set-cookie|password|card|cvc|iban|email|address|name)/i;
const SECRET_VALUE_PATTERN =
  /((?:sk|rk|pk)_(?:test|live|restricted)_[A-Za-z0-9]+|whsec_[A-Za-z0-9_]+|pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+)/i;
const ALLOWED_FIELDS = new Set([
  "event",
  "code",
  "status",
  "previousStatus",
  "nextStatus",
  "durationMs",
  "count",
  "eventId",
  "paymentIntentId",
  "orderId",
  "supportReference"
]);

function sanitizePaymentLog(details = {}) {
  const sanitized = {};
  for (const [key, value] of Object.entries(details)) {
    if (!ALLOWED_FIELDS.has(key) || SENSITIVE_PATTERN.test(key)) continue;
    if (typeof value === "string" && SECRET_VALUE_PATTERN.test(value)) {
      sanitized[key] = "[REDACTED]";
    } else if (["string", "number", "boolean"].includes(typeof value)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function logPaymentEvent(event, details = {}, level = "info") {
  const payload = sanitizePaymentLog({ event, ...details });
  const writer = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  writer("payment_event", payload);
}

module.exports = { logPaymentEvent, sanitizePaymentLog };
