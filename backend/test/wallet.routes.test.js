const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/wallet.routes");
const authRequiredPath = require.resolve("../src/middlewares/auth-required.middleware");
const rateLimitPath = require.resolve("../src/middlewares/rate-limit.middleware");
const walletServicePath = require.resolve("../src/services/wallet.service");
const cdpAuthServicePath = require.resolve("../src/services/cdp-auth.service");

const authUser = {
  id: 42,
  email: "collector@example.com",
  verified: true,
  isActive: true
};

async function startWalletApp(t, { user = authUser, serviceOverrides = {} } = {}) {
  const calls = {
    listWallets: 0,
    getLatestConsent: 0,
    recordConsent: []
  };

  class WalletError extends Error {
    constructor(message, code = "WALLET_ERROR", status = 400) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authRequiredPath]: {
      authRequired(req, _res, next) {
        if (!user) {
          return _res
            .status(401)
            .json({ message: "Authentication required", code: "UNAUTHORIZED" });
        }
        req.user = user;
        return next();
      }
    },
    [rateLimitPath]: {
      walletWriteRateLimit(_req, _res, next) {
        next();
      }
    },
    [walletServicePath]: {
      WalletError,
      async listWallets() {
        calls.listWallets += 1;
        return serviceOverrides.wallets || [];
      },
      async getLatestConsent() {
        calls.getLatestConsent += 1;
        return serviceOverrides.consent || { accepted: true, createdAt: new Date().toISOString() };
      },
      async recordConsent(_currentUser, accepted) {
        calls.recordConsent.push(accepted);
        return { accepted, createdAt: new Date().toISOString() };
      },
      async startCreation() {
        return { id: 1, status: "PENDING" };
      },
      async issueCdpToken() {
        return { token: "cdp-token" };
      },
      async completeCreation() {
        return { id: 1, status: "ACTIVE" };
      },
      async markCreationFailed() {
        return { id: 1, status: "FAILED" };
      },
      async retryCreation() {
        return { id: 1, status: "PENDING" };
      }
    },
    [cdpAuthServicePath]: {
      CdpAuthError: class extends Error {},
      getJwks() {
        return { keys: [{ kid: "test-key" }] };
      }
    }
  });

  const app = express();
  app.use(express.json());
  app.use(router);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    restore();
    server.close();
  });

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    calls
  };
}

test("GET /wallets/me returns the authenticated wallet workspace", async (t) => {
  const { baseUrl, calls } = await startWalletApp(t, {
    serviceOverrides: {
      wallets: [{ id: 1, status: "ACTIVE", address: "0xabc" }],
      consent: { accepted: true, createdAt: "2026-07-20T10:00:00.000Z" }
    }
  });

  const response = await fetch(`${baseUrl}/wallets/me`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.wallets[0].status, "ACTIVE");
  assert.equal(body.consent.accepted, true);
  assert.equal(calls.listWallets, 1);
  assert.equal(calls.getLatestConsent, 1);
});

test("POST /wallets/consent rejects a missing consent decision", async (t) => {
  const { baseUrl, calls } = await startWalletApp(t);

  const response = await fetch(`${baseUrl}/wallets/consent`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.code, "CONSENT_DECISION_REQUIRED");
  assert.equal(calls.recordConsent.length, 0);
});

test("POST /wallets/consent records an explicit accept decision", async (t) => {
  const { baseUrl, calls } = await startWalletApp(t);

  const response = await fetch(`${baseUrl}/wallets/consent`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accepted: true })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.consent.accepted, true);
  assert.deepEqual(calls.recordConsent, [true]);
});
