const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/saved-payment-method.routes");
const authRequiredPath = require.resolve("../src/middlewares/auth-required.middleware");
const csrfPath = require.resolve("../src/middlewares/csrf.middleware");
const rateLimitPath = require.resolve("../src/middlewares/rate-limit.middleware");
const servicePath = require.resolve("../src/services/saved-payment-method.service");

class SavedPaymentMethodError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function startApp(overrides = {}) {
  const calls = { list: [], remove: [] };
  const requireAuthentication = (req, res, next) => {
    if (req.headers.authorization !== "Bearer valid-session") {
      return res.status(401).json({ code: "AUTH_REQUIRED" });
    }

    req.user = { id: 42 };
    return next();
  };
  const requireCsrf = (req, res, next) => {
    if (req.headers["x-csrf-token"] !== "valid-csrf") {
      return res.status(403).json({ code: "CSRF_VALIDATION_FAILED" });
    }

    return next();
  };

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authRequiredPath]: { authRequired: requireAuthentication },
    [csrfPath]: { csrfProtection: requireCsrf },
    [rateLimitPath]: { securityRateLimit: (_req, _res, next) => next() },
    [servicePath]: {
      SavedPaymentMethodError,
      async listSavedPaymentMethods(input) {
        calls.list.push(input);
        return (
          overrides.paymentMethods || [
            { id: "pm_owner1", brand: "visa", last4: "4242", expMonth: 8, expYear: 2031 }
          ]
        );
      },
      async removeSavedPaymentMethod(input) {
        calls.remove.push(input);
        if (overrides.removalError) throw overrides.removalError;
        return { removed: true };
      }
    }
  });

  const app = express();
  app.use(express.json());
  app.use("/api/v1", router);

  const server = http.createServer(app);
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({
        baseUrl: `http://127.0.0.1:${server.address().port}/api/v1`,
        calls,
        async close() {
          restore();
          await new Promise((closeResolve) => server.close(closeResolve));
        }
      });
    });
  });
}

test("saved payment method listing requires authentication and returns masked no-store data", async () => {
  const app = await startApp();

  try {
    assert.equal((await fetch(`${app.baseUrl}/payment-methods`)).status, 401);

    const response = await fetch(`${app.baseUrl}/payment-methods`, {
      headers: { authorization: "Bearer valid-session" }
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(body, {
      paymentMethods: [
        { id: "pm_owner1", brand: "visa", last4: "4242", expMonth: 8, expYear: 2031 }
      ]
    });
    assert.deepEqual(app.calls.list, [{ userId: 42 }]);
    assert.doesNotMatch(JSON.stringify(body), /client_secret|customer|cvc|fingerprint/i);
  } finally {
    await app.close();
  }
});

test("saved payment method removal requires CSRF and remains owner-scoped", async () => {
  const app = await startApp();

  try {
    const withoutCsrf = await fetch(`${app.baseUrl}/payment-methods/pm_owner1`, {
      method: "DELETE",
      headers: { authorization: "Bearer valid-session" }
    });
    assert.equal(withoutCsrf.status, 403);
    assert.equal(app.calls.remove.length, 0);

    const response = await fetch(`${app.baseUrl}/payment-methods/pm_owner1`, {
      method: "DELETE",
      headers: {
        authorization: "Bearer valid-session",
        "x-csrf-token": "valid-csrf"
      }
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await response.json(), { removed: true });
    assert.deepEqual(app.calls.remove, [{ userId: 42, paymentMethodId: "pm_owner1" }]);
  } finally {
    await app.close();
  }
});

test("another customer's saved payment method is hidden behind a 404", async () => {
  const app = await startApp({
    removalError: new SavedPaymentMethodError(
      "Saved payment method not found",
      "SAVED_PAYMENT_METHOD_NOT_FOUND",
      404
    )
  });

  try {
    const response = await fetch(`${app.baseUrl}/payment-methods/pm_other1`, {
      method: "DELETE",
      headers: {
        authorization: "Bearer valid-session",
        "x-csrf-token": "valid-csrf"
      }
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      message: "Saved payment method not found",
      code: "SAVED_PAYMENT_METHOD_NOT_FOUND"
    });
  } finally {
    await app.close();
  }
});
