const { getStripeClient } = require("../lib/stripe");
const { createPaymentElementCustomerSession } = require("../services/saved-payment-method.service");

const TEST_KEY_PATTERN = /^(sk|rk)_test_[A-Za-z0-9]+$/;
const PAYMENT_METHOD_PATTERN = /^pm_[A-Za-z0-9]+$/;
const CUSTOMER_PATTERN = /^cus_[A-Za-z0-9]+$/;
const CUSTOMER_SESSION_SECRET_PATTERN = /^cuss_[A-Za-z0-9_]+$/;

function assertSandboxWriteEnabled() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("This QA smoke test is forbidden in production");
  }

  if (!TEST_KEY_PATTERN.test(process.env.STRIPE_SECRET_KEY || "")) {
    throw new Error("A Stripe test-mode secret or restricted key is required");
  }

  if (process.env.PAYMENT_QA_ALLOW_STRIPE_WRITES !== "true") {
    throw new Error(
      "Set PAYMENT_QA_ALLOW_STRIPE_WRITES=true to acknowledge temporary Stripe sandbox writes"
    );
  }
}

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

async function detachIfNeeded(stripe, paymentMethodId) {
  if (!paymentMethodId) return;

  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod?.customer) await stripe.paymentMethods.detach(paymentMethodId);
  } catch (error) {
    if (error?.code !== "resource_missing") throw error;
  }
}

async function run() {
  assertSandboxWriteEnabled();

  const stripe = getStripeClient();
  let customerId = null;
  let paymentMethodId = null;
  let runError = null;

  try {
    const customer = await stripe.customers.create({
      metadata: {
        make_it_art_qa: "saved_payment_methods",
        disposable: "true"
      }
    });
    customerId = customer?.id || null;
    assertCondition(CUSTOMER_PATTERN.test(customerId || ""), "Stripe Customer creation failed");

    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: { token: "tok_visa" },
      metadata: { make_it_art_qa: "saved_payment_methods" }
    });
    paymentMethodId = paymentMethod?.id || null;
    assertCondition(
      PAYMENT_METHOD_PATTERN.test(paymentMethodId || ""),
      "Stripe PaymentMethod creation failed"
    );

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.paymentMethods.update(paymentMethodId, { allow_redisplay: "always" });

    const listed = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 10
    });
    const savedMethod = listed.data.find((candidate) => candidate.id === paymentMethodId);
    assertCondition(savedMethod, "The attached PaymentMethod was not listed");
    assertCondition(savedMethod.customer === customerId, "The PaymentMethod owner is inconsistent");
    assertCondition(savedMethod.allow_redisplay === "always", "Redisplay consent was not retained");
    assertCondition(savedMethod.card?.last4 === "4242", "The sandbox card was not recognized");

    const customerSessionSecret = await createPaymentElementCustomerSession({
      customerId,
      stripeClient: stripe
    });
    assertCondition(
      CUSTOMER_SESSION_SECRET_PATTERN.test(customerSessionSecret),
      "Stripe returned an unexpected Customer Session secret"
    );

    await stripe.paymentMethods.detach(paymentMethodId);
    const detached = await stripe.paymentMethods.retrieve(paymentMethodId);
    assertCondition(!detached.customer, "The PaymentMethod remained attached after deletion");

    console.log("Stripe sandbox saved payment method lifecycle passed");
  } catch (error) {
    runError = error;
  } finally {
    try {
      await detachIfNeeded(stripe, paymentMethodId);
      if (customerId) await stripe.customers.del(customerId);
    } catch (cleanupError) {
      if (!runError) runError = cleanupError;
    }
  }

  if (runError) throw runError;
}

run().catch((error) => {
  const safeCode = error?.code || error?.type || "QA_SAVED_PAYMENT_METHODS_FAILED";
  console.error(`Stripe sandbox saved payment method lifecycle failed (${safeCode})`);
  process.exitCode = 1;
});
