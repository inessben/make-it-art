import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPaymentReturnUrl,
  canMountPaymentElement,
  createSecureUuid,
  getCustomerSessionClientSecret,
  getOrCreateIdempotencyKey,
  getSafePaymentError,
  isPublishableStripeKey
} from "../utils/checkout-security.js";

test("a Customer Session secret is accepted only when saved methods are enabled", () => {
  const secret = "cuss_secret_public123";

  assert.equal(
    getCustomerSessionClientSecret({
      savedPaymentMethodsAvailable: true,
      customerSessionClientSecret: secret
    }),
    secret
  );
  assert.equal(
    getCustomerSessionClientSecret({
      savedPaymentMethodsAvailable: false,
      customerSessionClientSecret: secret
    }),
    null
  );
  assert.equal(
    getCustomerSessionClientSecret({
      savedPaymentMethodsAvailable: true,
      customerSessionClientSecret: "pi_test_123_secret_wrong_scope"
    }),
    null
  );
  assert.equal(
    getCustomerSessionClientSecret({
      savedPaymentMethodsAvailable: true,
      customerSessionClientSecret: "cuss_test_123_secret_outdated_shape"
    }),
    null
  );
});

test("the Payment Element mounts only for a reusable server-approved intent", () => {
  assert.equal(
    canMountPaymentElement({
      status: "requires_payment_method",
      requiresConfirmation: true,
      clientSecret: "pi_test_123_secret_public123"
    }),
    true
  );

  for (const status of ["succeeded", "processing", "canceled", "requires_capture"]) {
    assert.equal(
      canMountPaymentElement({
        status,
        requiresConfirmation: true,
        clientSecret: "pi_test_123_secret_public123"
      }),
      false
    );
  }

  assert.equal(
    canMountPaymentElement({
      status: "requires_action",
      requiresConfirmation: false,
      clientSecret: "pi_test_123_secret_public123"
    }),
    false
  );
  assert.equal(
    canMountPaymentElement({ status: "requires_action", requiresConfirmation: true }),
    false
  );
});

test("only Stripe publishable keys are accepted by the browser", () => {
  assert.equal(isPublishableStripeKey("pk_test_public123"), true);
  assert.equal(isPublishableStripeKey("pk_live_public123"), true);
  assert.equal(isPublishableStripeKey("sk_test_secret123"), false);
  assert.equal(isPublishableStripeKey("rk_live_restricted123"), false);
  assert.equal(isPublishableStripeKey(""), false);
});

test("the return URL is fixed to the configured application origin", () => {
  assert.equal(
    buildPaymentReturnUrl({
      configuredBaseUrl: "https://www.makeitart.io",
      currentOrigin: "https://www.makeitart.io",
      nodeEnv: "production"
    }),
    "https://www.makeitart.io/payment/return"
  );

  assert.throws(() =>
    buildPaymentReturnUrl({
      configuredBaseUrl: "https://evil.example",
      currentOrigin: "https://www.makeitart.io",
      nodeEnv: "production"
    })
  );
  assert.throws(() =>
    buildPaymentReturnUrl({
      configuredBaseUrl: "http://www.makeitart.io",
      currentOrigin: "http://www.makeitart.io",
      nodeEnv: "production"
    })
  );
});

test("checkout retries reuse one secure idempotency key", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  };
  const cart = {
    version: 4,
    pricingFingerprint: "a".repeat(64)
  };
  let generated = 0;
  const createUuid = () => {
    generated += 1;
    return "8c11aa36-8ad1-4a0d-92e8-753ef3458859";
  };

  assert.equal(
    getOrCreateIdempotencyKey(storage, cart, createUuid),
    "8c11aa36-8ad1-4a0d-92e8-753ef3458859"
  );
  assert.equal(
    getOrCreateIdempotencyKey(storage, cart, createUuid),
    "8c11aa36-8ad1-4a0d-92e8-753ef3458859"
  );
  assert.equal(generated, 1);
});

test("fallback UUID generation is RFC 4122 version 4", () => {
  const uuid = createSecureUuid({
    getRandomValues(bytes) {
      bytes.fill(0xab);
      return bytes;
    }
  });

  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("payment errors never expose a client secret", () => {
  assert.equal(
    getSafePaymentError({ message: "Failed for pi_123_secret_sensitive" }),
    "The payment could not be confirmed. Please review your details and try again."
  );
  assert.equal(
    getSafePaymentError({ message: "Your card was declined." }),
    "Your card was declined."
  );
  assert.equal(
    getSafePaymentError({ message: "Failed for cuss_secret_sensitive" }),
    "The payment could not be confirmed. Please review your details and try again."
  );
});

test("unexpected errors expose only a validated non-sensitive support reference", () => {
  const message = getSafePaymentError({
    message: "Payment is temporarily unavailable.",
    supportReference: "7d5cb6c9-bb37-4bb5-a5bd-fb43c982ae62"
  });
  assert.match(message, /7d5cb6c9-bb37-4bb5-a5bd-fb43c982ae62/);
  assert.doesNotMatch(
    getSafePaymentError({ message: "Failed", supportReference: "pi_test_secret_value" }),
    /pi_test_secret_value/
  );
});
