const assert = require("node:assert/strict");
const test = require("node:test");

const {
  SavedPaymentMethodError,
  listSavedPaymentMethods,
  recordSavedPaymentMethodConsent,
  removeSavedPaymentMethod,
  tryCreatePaymentCustomerContext
} = require("../src/services/saved-payment-method.service");

function createUserPrisma(initialUser = {}) {
  const user = {
    id: 42,
    email: "collector@example.test",
    stripeCustomerId: null,
    ...initialUser
  };

  return {
    user,
    client: {
      user: {
        async findUnique() {
          return { ...user };
        },
        async updateMany({ where, data }) {
          if (
            where.id === user.id &&
            (where.stripeCustomerId === undefined ||
              where.stripeCustomerId === user.stripeCustomerId)
          ) {
            Object.assign(user, data);
            return { count: 1 };
          }
          return { count: 0 };
        }
      }
    }
  };
}

test("checkout customer context creates then reuses one Stripe Customer", async () => {
  const prisma = createUserPrisma();
  const calls = { customers: 0, retrieves: 0, sessions: 0 };
  const stripeClient = {
    customers: {
      async create(parameters, options) {
        calls.customers += 1;
        assert.equal(parameters.metadata.make_it_art_user_id, "42");
        assert.equal(options.idempotencyKey, "make_it_art_customer_42");
        return { id: "cus_saved42", deleted: false };
      },
      async retrieve(id) {
        calls.retrieves += 1;
        return { id, deleted: false };
      }
    },
    customerSessions: {
      async create(parameters) {
        calls.sessions += 1;
        assert.equal(parameters.customer, "cus_saved42");
        assert.equal(
          parameters.components.payment_element.features.payment_method_save_usage,
          "on_session"
        );
        assert.equal(
          parameters.components.payment_element.features.payment_method_remove,
          "disabled"
        );
        return { client_secret: `cuss_saved${calls.sessions}_secret_test` };
      }
    }
  };

  const first = await tryCreatePaymentCustomerContext({
    userId: 42,
    stripeClient,
    prismaClient: prisma.client
  });
  const second = await tryCreatePaymentCustomerContext({
    userId: 42,
    stripeClient,
    prismaClient: prisma.client
  });

  assert.equal(first.customerId, "cus_saved42");
  assert.match(first.customerSessionClientSecret, /^cuss_/);
  assert.equal(second.customerId, "cus_saved42");
  assert.equal(calls.customers, 1);
  assert.equal(calls.retrieves, 1);
  assert.equal(calls.sessions, 2);
});

test("a deleted Stripe Customer is replaced without reusing its original idempotency result", async () => {
  const prisma = createUserPrisma({ stripeCustomerId: "cus_deleted42" });
  let creationOptions;
  const result = await tryCreatePaymentCustomerContext({
    userId: 42,
    prismaClient: prisma.client,
    stripeClient: {
      customers: {
        async retrieve() {
          return { id: "cus_deleted42", deleted: true };
        },
        async create(_parameters, options) {
          creationOptions = options;
          return { id: "cus_replacement42", deleted: false };
        }
      },
      customerSessions: {
        async create() {
          return { client_secret: "cuss_replacement42_secret_test" };
        }
      }
    }
  });

  assert.equal(result.customerId, "cus_replacement42");
  assert.equal(creationOptions.idempotencyKey, "make_it_art_customer_42_after_cus_deleted42");
});

test("Customer Session failure degrades without losing the Stripe Customer", async () => {
  const prisma = createUserPrisma({ stripeCustomerId: "cus_saved42" });
  const stripeClient = {
    customers: {
      async retrieve(id) {
        return { id, deleted: false };
      }
    },
    customerSessions: {
      async create() {
        const error = new Error("temporary failure");
        error.code = "api_connection_error";
        throw error;
      }
    }
  };

  const result = await tryCreatePaymentCustomerContext({
    userId: 42,
    stripeClient,
    prismaClient: prisma.client
  });

  assert.deepEqual(result, {
    customerId: "cus_saved42",
    customerSessionClientSecret: null,
    errorCode: "api_connection_error"
  });
});

test("saved card listing is owner-scoped and exposes only masked fields", async () => {
  const prisma = createUserPrisma({ stripeCustomerId: "cus_saved42" });
  const paymentMethods = await listSavedPaymentMethods({
    userId: 42,
    prismaClient: prisma.client,
    stripeClient: {
      paymentMethods: {
        async list(parameters) {
          assert.deepEqual(parameters, { customer: "cus_saved42", type: "card", limit: 10 });
          return {
            data: [
              {
                id: "pm_owner1",
                type: "card",
                customer: "cus_saved42",
                allow_redisplay: "always",
                card: { brand: "visa", last4: "4242", exp_month: 8, exp_year: 2031 }
              },
              {
                id: "pm_hidden1",
                type: "card",
                customer: "cus_saved42",
                allow_redisplay: "unspecified",
                card: { brand: "visa", last4: "0000", exp_month: 1, exp_year: 2030 }
              },
              {
                id: "pm_other1",
                type: "card",
                customer: "cus_other99",
                allow_redisplay: "always",
                card: { brand: "visa", last4: "9999", exp_month: 1, exp_year: 2030 }
              }
            ]
          };
        }
      }
    }
  });

  assert.deepEqual(paymentMethods, [
    { id: "pm_owner1", brand: "visa", last4: "4242", expMonth: 8, expYear: 2031 }
  ]);
  assert.doesNotMatch(JSON.stringify(paymentMethods), /cus_|client_secret|cvc/i);
});

test("a user cannot detach another Customer's payment method", async () => {
  const prisma = createUserPrisma({ stripeCustomerId: "cus_saved42" });
  let detached = false;

  await assert.rejects(
    removeSavedPaymentMethod({
      userId: 42,
      paymentMethodId: "pm_other1",
      prismaClient: prisma.client,
      stripeClient: {
        paymentMethods: {
          async retrieve() {
            return { id: "pm_other1", type: "card", customer: "cus_other99" };
          },
          async detach() {
            detached = true;
          }
        }
      }
    }),
    (error) => error instanceof SavedPaymentMethodError && error.status === 404
  );
  assert.equal(detached, false);
});

test("owner removal detaches the card, revokes consent and writes an audit entry", async () => {
  const prisma = createUserPrisma({ stripeCustomerId: "cus_saved42" });
  const calls = { detached: [], consent: [], audit: [] };
  prisma.client.savedPaymentMethodConsent = {
    async updateMany(payload) {
      calls.consent.push(payload);
      return { count: 1 };
    }
  };
  prisma.client.auditLog = {
    async create(payload) {
      calls.audit.push(payload);
      return payload.data;
    }
  };
  prisma.client.$transaction = async (operations) => Promise.all(operations);

  const result = await removeSavedPaymentMethod({
    userId: 42,
    paymentMethodId: "pm_owner1",
    prismaClient: prisma.client,
    stripeClient: {
      paymentMethods: {
        async retrieve() {
          return { id: "pm_owner1", type: "card", customer: "cus_saved42" };
        },
        async detach(id) {
          calls.detached.push(id);
        }
      }
    }
  });

  assert.deepEqual(result, { removed: true });
  assert.deepEqual(calls.detached, ["pm_owner1"]);
  assert.equal(calls.consent[0].where.userId, 42);
  assert.equal(calls.audit[0].data.action, "SAVED_PAYMENT_METHOD_REMOVED");
});

test("signed payment success records consent only for on-session reuse", async () => {
  const upserts = [];
  const transaction = {
    savedPaymentMethodConsent: {
      async upsert(payload) {
        upserts.push(payload);
      }
    }
  };
  const payment = {
    id: 7,
    order: {
      userId: 42,
      user: { stripeCustomerId: "cus_saved42" }
    }
  };

  assert.equal(
    await recordSavedPaymentMethodConsent(
      transaction,
      {
        setup_future_usage: null,
        payment_method: "pm_owner1",
        customer: "cus_saved42"
      },
      payment
    ),
    false
  );
  assert.equal(
    await recordSavedPaymentMethodConsent(
      transaction,
      {
        setup_future_usage: "on_session",
        payment_method: "pm_owner1",
        customer: "cus_saved42"
      },
      payment
    ),
    true
  );
  assert.equal(upserts.length, 1);
  assert.equal(upserts[0].create.purpose, "FUTURE_ON_SESSION_PURCHASES");
  assert.equal(upserts[0].create.userId, 42);
});
