const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadModuleWithMocks } = require("./helpers/mock-require");
const servicePath = require.resolve("../src/services/wallet.service");
const repositoryPath = require.resolve("../src/repositories/wallet.repository");
const cdpPath = require.resolve("../src/services/cdp-auth.service");
const envPath = require.resolve("../src/config/env");
const user = { id: 42, verified: true, isActive: true };
const pending = {
  id: 1,
  userId: 42,
  address: null,
  provider: "COINBASE_CDP",
  network: "BASE",
  origin: "EMBEDDED",
  status: "PENDING",
  lastErrorCode: null
};
function loadService(changes = {}) {
  const repo = {
    async createConsent(data) {
      return { ...data, createdAt: new Date() };
    },
    async findLatestConsent() {
      return { accepted: true, createdAt: new Date(), revokedAt: null };
    },
    async findByIdempotencyKey() {
      return null;
    },
    async findActiveEmbeddedWallet() {
      return null;
    },
    async createPending() {
      return pending;
    },
    async findByIdForUser() {
      return pending;
    },
    async activate({ address }) {
      return { ...pending, address: address.toLowerCase(), status: "ACTIVE" };
    },
    async markFailed({ errorCode }) {
      return { ...pending, status: "FAILED", lastErrorCode: errorCode };
    },
    async prepareRetry() {
      return pending;
    },
    async listForUser() {
      return [];
    },
    ...changes.repo
  };
  const cdp = {
    CdpAuthError: class extends Error {},
    createUserToken() {
      return "token";
    },
    async validateEndUserAccessToken() {
      return {};
    },
    resultBelongsToUser() {
      return true;
    }
  };
  return loadModuleWithMocks(servicePath, {
    [repositoryPath]: repo,
    [cdpPath]: cdp,
    [envPath]: { cdp: { projectId: "project-test" } }
  });
}
test("wallet creation refuses an unverified user", async () => {
  const loaded = loadService();
  try {
    await assert.rejects(
      loaded.moduleExports.startCreation({ ...user, verified: false }, "1234567890abcdef"),
      (error) => error.code === "EMAIL_NOT_VERIFIED"
    );
  } finally {
    loaded.restore();
  }
});
test("wallet creation requires explicit consent", async () => {
  const loaded = loadService({
    repo: {
      async findLatestConsent() {
        return { accepted: false };
      }
    }
  });
  try {
    await assert.rejects(
      loaded.moduleExports.startCreation(user, "1234567890abcdef"),
      (error) => error.code === "CONSENT_REQUIRED"
    );
  } finally {
    loaded.restore();
  }
});
test("wallet creation is idempotent", async () => {
  const loaded = loadService({
    repo: {
      async findByIdempotencyKey() {
        return pending;
      },
      async createPending() {
        throw new Error("unexpected creation");
      }
    }
  });
  try {
    assert.equal((await loaded.moduleExports.startCreation(user, "1234567890abcdef")).id, 1);
  } finally {
    loaded.restore();
  }
});
test("wallet completion validates and persists the Coinbase address", async () => {
  const loaded = loadService();
  try {
    const result = await loaded.moduleExports.completeCreation(user, 1, {
      accessToken: "access",
      address: "0x1111111111111111111111111111111111111111"
    });
    assert.equal(result.status, "ACTIVE");
  } finally {
    loaded.restore();
  }
});
test("failed wallet creation can be retried", async () => {
  const loaded = loadService({
    repo: {
      async findByIdForUser() {
        return { ...pending, status: "FAILED" };
      }
    }
  });
  try {
    assert.equal((await loaded.moduleExports.retryCreation(user, 1)).status, "PENDING");
  } finally {
    loaded.restore();
  }
});

test("duplicate wallet address is returned as a controlled conflict", async () => {
  const loaded = loadService({
    repo: {
      async activate() {
        const error = new Error("duplicate");
        error.code = "P2002";
        throw error;
      }
    }
  });
  try {
    await assert.rejects(
      loaded.moduleExports.completeCreation(user, 1, {
        accessToken: "access",
        address: "0x1111111111111111111111111111111111111111"
      }),
      (error) => error.code === "WALLET_ADDRESS_CONFLICT" && error.status === 409
    );
  } finally {
    loaded.restore();
  }
});

test("wallet service responses never expose CDP secrets or access tokens", async () => {
  const loaded = loadService();
  try {
    const result = await loaded.moduleExports.completeCreation(user, 1, {
      accessToken: "sensitive-access-token",
      address: "0x1111111111111111111111111111111111111111"
    });
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("sensitive-access-token"), false);
    assert.equal(serialized.includes("api-secret"), false);
  } finally {
    loaded.restore();
  }
});
