const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRICING_FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/i;
const SENSITIVE_VALUE_PATTERN =
  /(pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+|[spr]k_(?:test|live|restricted)_[A-Za-z0-9]+)/i;

export const CHECKOUT_ORDER_STORAGE_KEY = "mia.checkout.order";

export function isPublishableStripeKey(value) {
  return typeof value === "string" && /^pk_(?:test|live)_[A-Za-z0-9]+$/.test(value);
}

export function getCheckoutStorageKey(cart) {
  if (
    !cart ||
    !Number.isSafeInteger(cart.version) ||
    cart.version <= 0 ||
    !PRICING_FINGERPRINT_PATTERN.test(cart.pricingFingerprint || "")
  ) {
    throw new Error("Invalid cart checkout identity");
  }

  return `mia.checkout.idempotency.${cart.version}.${cart.pricingFingerprint.toLowerCase()}`;
}

export function getOrCreateIdempotencyKey(storage, cart, createUuid) {
  const storageKey = getCheckoutStorageKey(cart);
  const existingKey = storage.getItem(storageKey);

  if (existingKey && IDEMPOTENCY_KEY_PATTERN.test(existingKey)) {
    return existingKey.toLowerCase();
  }

  const newKey = createUuid();

  if (!IDEMPOTENCY_KEY_PATTERN.test(newKey)) {
    throw new Error("Secure UUID generation failed");
  }

  storage.setItem(storageKey, newKey.toLowerCase());
  return newKey.toLowerCase();
}

export function createSecureUuid(cryptoSource = globalThis.crypto) {
  if (!cryptoSource) {
    throw new Error("Secure browser cryptography is unavailable");
  }

  if (typeof cryptoSource.randomUUID === "function") {
    return cryptoSource.randomUUID();
  }

  const bytes = new Uint8Array(16);
  cryptoSource.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hexadecimal = [...bytes].map((value) => value.toString(16).padStart(2, "0"));

  return `${hexadecimal.slice(0, 4).join("")}-${hexadecimal.slice(4, 6).join("")}-${hexadecimal.slice(6, 8).join("")}-${hexadecimal.slice(8, 10).join("")}-${hexadecimal.slice(10).join("")}`;
}

export function buildPaymentReturnUrl({ configuredBaseUrl, currentOrigin, nodeEnv }) {
  let configuredUrl;

  try {
    configuredUrl = new URL(configuredBaseUrl);
  } catch {
    throw new Error("Invalid application payment return URL");
  }

  if (
    configuredUrl.username ||
    configuredUrl.password ||
    configuredUrl.search ||
    configuredUrl.hash ||
    configuredUrl.origin !== currentOrigin
  ) {
    throw new Error("Payment return origin is not allowed");
  }

  if (nodeEnv === "production" && configuredUrl.protocol !== "https:") {
    throw new Error("Payment return URL must use HTTPS");
  }

  return new URL("/payment/return", configuredUrl.origin).toString();
}

export function getSafePaymentError(error) {
  const message = typeof error?.message === "string" ? error.message.trim() : "";
  const supportReference =
    typeof error?.supportReference === "string" &&
    IDEMPOTENCY_KEY_PATTERN.test(error.supportReference)
      ? error.supportReference.toLowerCase()
      : "";

  const safeMessage =
    !message || message.length > 240 || SENSITIVE_VALUE_PATTERN.test(message)
      ? "The payment could not be confirmed. Please review your details and try again."
      : message;

  return supportReference ? `${safeMessage} Support reference: ${supportReference}.` : safeMessage;
}
