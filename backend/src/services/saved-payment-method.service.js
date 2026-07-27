const prisma = require("../lib/prisma");
const env = require("../config/env");
const { getStripeClient } = require("../lib/stripe");

const PAYMENT_METHOD_ID_PATTERN = /^pm_[A-Za-z0-9]+$/;
const CUSTOMER_ID_PATTERN = /^cus_[A-Za-z0-9]+$/;

class SavedPaymentMethodError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "SavedPaymentMethodError";
    this.code = code;
    this.status = status;
  }
}

function stripeId(value) {
  return typeof value === "string" ? value : value?.id;
}

function providerErrorCode(error) {
  const value = error?.code || error?.type;
  return typeof value === "string" && value.length <= 80 ? value : "STRIPE_REQUEST_FAILED";
}

function isMissingStripeResource(error) {
  return error?.code === "resource_missing";
}

async function loadUser(userId, prismaClient) {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, stripeCustomerId: true }
  });

  if (!user) {
    throw new SavedPaymentMethodError("PAYMENT_CUSTOMER_NOT_FOUND", "User account not found", 404);
  }

  return user;
}

async function getOrCreateStripeCustomer({
  userId,
  stripeClient = getStripeClient(),
  prismaClient = prisma
}) {
  let user = await loadUser(userId, prismaClient);
  let replacedCustomerId = null;

  if (user.stripeCustomerId) {
    try {
      const existingCustomer = await stripeClient.customers.retrieve(user.stripeCustomerId);
      if (!existingCustomer?.deleted && CUSTOMER_ID_PATTERN.test(existingCustomer?.id || "")) {
        return existingCustomer.id;
      }
    } catch (error) {
      if (!isMissingStripeResource(error)) throw error;
    }

    replacedCustomerId = user.stripeCustomerId;
    await prismaClient.user.updateMany({
      where: { id: user.id, stripeCustomerId: user.stripeCustomerId },
      data: { stripeCustomerId: null }
    });
    user = await loadUser(userId, prismaClient);
    if (user.stripeCustomerId) return user.stripeCustomerId;
  }

  const customer = await stripeClient.customers.create(
    {
      email: user.email || undefined,
      metadata: {
        make_it_art_user_id: String(user.id),
        merchant_of_record: "MAKE_IT_ART"
      }
    },
    {
      idempotencyKey: replacedCustomerId
        ? `make_it_art_customer_${user.id}_after_${replacedCustomerId}`
        : `make_it_art_customer_${user.id}`
    }
  );

  if (!CUSTOMER_ID_PATTERN.test(customer?.id || "")) {
    throw new SavedPaymentMethodError(
      "STRIPE_CUSTOMER_RESPONSE_INVALID",
      "Payment provider returned an invalid customer",
      503
    );
  }

  await prismaClient.user.updateMany({
    where: { id: user.id, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id }
  });

  const synchronizedUser = await loadUser(userId, prismaClient);
  return synchronizedUser.stripeCustomerId || customer.id;
}

async function createPaymentElementCustomerSession({
  customerId,
  stripeClient = getStripeClient()
}) {
  if (!CUSTOMER_ID_PATTERN.test(customerId || "")) {
    throw new SavedPaymentMethodError(
      "INVALID_STRIPE_CUSTOMER",
      "Payment customer is unavailable",
      503
    );
  }

  const session = await stripeClient.customerSessions.create({
    customer: customerId,
    components: {
      payment_element: {
        enabled: true,
        features: {
          payment_method_redisplay: "enabled",
          payment_method_redisplay_limit: 5,
          // Removal goes through our authenticated, CSRF-protected endpoint so consent
          // revocation and the security audit remain synchronized with Stripe.
          payment_method_remove: "disabled",
          payment_method_save: "enabled",
          payment_method_save_usage: "on_session"
        }
      }
    }
  });

  if (typeof session?.client_secret !== "string" || !session.client_secret) {
    throw new SavedPaymentMethodError(
      "STRIPE_CUSTOMER_SESSION_INVALID",
      "Payment provider returned an invalid customer session",
      503
    );
  }

  return session.client_secret;
}

async function tryCreatePaymentCustomerContext({
  userId,
  stripeClient = getStripeClient(),
  prismaClient = prisma
}) {
  let customerId;

  try {
    customerId = await getOrCreateStripeCustomer({ userId, stripeClient, prismaClient });
  } catch (error) {
    return {
      customerId: null,
      customerSessionClientSecret: null,
      errorCode: providerErrorCode(error)
    };
  }

  try {
    return {
      customerId,
      customerSessionClientSecret: await createPaymentElementCustomerSession({
        customerId,
        stripeClient
      }),
      errorCode: null
    };
  } catch (error) {
    return {
      customerId,
      customerSessionClientSecret: null,
      errorCode: providerErrorCode(error)
    };
  }
}

function serializeCard(paymentMethod) {
  const card = paymentMethod.card || {};

  return {
    id: paymentMethod.id,
    brand:
      typeof card.display_brand === "string"
        ? card.display_brand
        : typeof card.brand === "string"
          ? card.brand
          : "card",
    last4: /^\d{4}$/.test(card.last4 || "") ? card.last4 : "****",
    expMonth: Number.isSafeInteger(card.exp_month) ? card.exp_month : null,
    expYear: Number.isSafeInteger(card.exp_year) ? card.exp_year : null
  };
}

async function listSavedPaymentMethods({
  userId,
  stripeClient = getStripeClient(),
  prismaClient = prisma
}) {
  const user = await loadUser(userId, prismaClient);
  if (!user.stripeCustomerId) return [];

  let response;
  try {
    response = await stripeClient.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
      limit: 10
    });
  } catch (error) {
    if (isMissingStripeResource(error)) return [];
    throw error;
  }

  return (response?.data || [])
    .filter(
      (paymentMethod) =>
        PAYMENT_METHOD_ID_PATTERN.test(paymentMethod?.id || "") &&
        stripeId(paymentMethod.customer) === user.stripeCustomerId &&
        paymentMethod.allow_redisplay === "always"
    )
    .map(serializeCard);
}

async function revokeConsentAndAudit({ userId, paymentMethodId, prismaClient }) {
  const now = new Date();

  await prismaClient.$transaction([
    prismaClient.savedPaymentMethodConsent.updateMany({
      where: { userId, providerPaymentMethodId: paymentMethodId, revokedAt: null },
      data: { revokedAt: now }
    }),
    prismaClient.auditLog.create({
      data: {
        userId,
        action: "SAVED_PAYMENT_METHOD_REMOVED",
        entityType: "STRIPE_PAYMENT_METHOD",
        entityId: paymentMethodId,
        createdAt: now
      }
    })
  ]);
}

async function removeSavedPaymentMethod({
  userId,
  paymentMethodId,
  stripeClient = getStripeClient(),
  prismaClient = prisma
}) {
  if (!PAYMENT_METHOD_ID_PATTERN.test(paymentMethodId || "")) {
    throw new SavedPaymentMethodError("PAYMENT_METHOD_NOT_FOUND", "Payment method not found", 404);
  }

  const user = await loadUser(userId, prismaClient);
  if (!user.stripeCustomerId) {
    throw new SavedPaymentMethodError("PAYMENT_METHOD_NOT_FOUND", "Payment method not found", 404);
  }

  let paymentMethod;
  try {
    paymentMethod = await stripeClient.paymentMethods.retrieve(paymentMethodId);
  } catch (error) {
    if (isMissingStripeResource(error)) {
      throw new SavedPaymentMethodError(
        "PAYMENT_METHOD_NOT_FOUND",
        "Payment method not found",
        404
      );
    }
    throw error;
  }

  if (
    paymentMethod?.type !== "card" ||
    stripeId(paymentMethod.customer) !== user.stripeCustomerId
  ) {
    throw new SavedPaymentMethodError("PAYMENT_METHOD_NOT_FOUND", "Payment method not found", 404);
  }

  await stripeClient.paymentMethods.detach(paymentMethodId);
  await revokeConsentAndAudit({ userId, paymentMethodId, prismaClient });

  return { removed: true };
}

async function recordSavedPaymentMethodConsent(transaction, paymentIntent, payment) {
  const paymentMethodId = stripeId(paymentIntent.payment_method);
  const customerId = stripeId(paymentIntent.customer);

  if (
    paymentIntent.setup_future_usage !== "on_session" ||
    !PAYMENT_METHOD_ID_PATTERN.test(paymentMethodId || "") ||
    !payment.order.user?.stripeCustomerId ||
    customerId !== payment.order.user.stripeCustomerId
  ) {
    return false;
  }

  await transaction.savedPaymentMethodConsent.upsert({
    where: {
      userId_providerPaymentMethodId: {
        userId: payment.order.userId,
        providerPaymentMethodId: paymentMethodId
      }
    },
    create: {
      userId: payment.order.userId,
      paymentId: payment.id,
      providerPaymentMethodId: paymentMethodId,
      purpose: "FUTURE_ON_SESSION_PURCHASES",
      termsVersion: env.stripe.savedPaymentMethodConsentVersion,
      acceptedAt: new Date()
    },
    update: {
      paymentId: payment.id,
      termsVersion: env.stripe.savedPaymentMethodConsentVersion,
      acceptedAt: new Date(),
      revokedAt: null
    }
  });

  return true;
}

module.exports = {
  CUSTOMER_ID_PATTERN,
  PAYMENT_METHOD_ID_PATTERN,
  SavedPaymentMethodError,
  createPaymentElementCustomerSession,
  getOrCreateStripeCustomer,
  listSavedPaymentMethods,
  recordSavedPaymentMethodConsent,
  removeSavedPaymentMethod,
  tryCreatePaymentCustomerContext
};
