const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { test } = require("node:test");
const { loadModuleWithMocks } = require("./helpers/mock-require");
const servicePath = require.resolve("../src/services/cdp-auth.service");
const envPath = require.resolve("../src/config/env");
const sdkPath = require.resolve("@coinbase/cdp-sdk/auth");
function loadService() {
  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" }
  });
  return loadModuleWithMocks(servicePath, {
    [envPath]: {
      cdp: {
        projectId: "project-test",
        authIssuer: "make-it-art",
        authAudience: "cdp",
        authKeyId: "auth-key",
        authPrivateKey: privateKey,
        apiKeyId: "api-key",
        apiKeySecret: "api-secret",
        requestTimeoutMs: 50
      }
    },
    [sdkPath]: {
      async generateJwt() {
        return "server-bearer";
      }
    }
  });
}
test("CDP JWT is short-lived, identifies the user and exposes a public JWKS", () => {
  const { moduleExports: service, restore } = loadService();
  try {
    const decoded = jwt.decode(service.createUserToken({ id: 42, verified: true }), {
      complete: true
    });
    assert.equal(decoded.header.alg, "RS256");
    assert.equal(decoded.payload.sub, "42");
    assert.ok(decoded.payload.exp - decoded.payload.iat <= 300);
    const jwk = service.getJwks().keys[0];
    assert.equal(jwk.kid, "auth-key");
    assert.equal(jwk.d, undefined);
  } finally {
    restore();
  }
});
test("CDP result must match both local identity and EVM address", () => {
  const { moduleExports: service, restore } = loadService();
  const address = "0x1111111111111111111111111111111111111111";
  try {
    assert.equal(
      service.resultBelongsToUser(
        { authenticationMethods: [{ type: "jwt", sub: "42" }], evmAccountObjects: [{ address }] },
        42,
        address
      ),
      true
    );
    assert.equal(
      service.resultBelongsToUser(
        { authenticationMethods: [{ type: "jwt", sub: "7" }], evmAccountObjects: [{ address }] },
        42,
        address
      ),
      false
    );
  } finally {
    restore();
  }
});

test("CDP JWT is rejected after its expiration", () => {
  const { moduleExports: service, restore } = loadService();
  try {
    const token = service.createUserToken({ id: 42, verified: true });
    const decoded = jwt.decode(token);
    const publicKey = crypto.createPublicKey({ key: service.getJwks().keys[0], format: "jwk" });
    assert.throws(
      () =>
        jwt.verify(token, publicKey, { algorithms: ["RS256"], clockTimestamp: decoded.exp + 1 }),
      (error) => error.name === "TokenExpiredError"
    );
  } finally {
    restore();
  }
});

test("CDP validation maps provider unavailability to a controlled error", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("network unavailable");
  };
  const { moduleExports: service, restore } = loadService();
  try {
    await assert.rejects(
      service.validateEndUserAccessToken("access-token"),
      (error) =>
        error.code === "CDP_VALIDATION_UNAVAILABLE" && !error.message.includes("api-secret")
    );
  } finally {
    global.fetch = originalFetch;
    restore();
  }
});

test("CDP validation aborts on timeout with a controlled error", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    });
  const { moduleExports: service, restore } = loadService();
  try {
    await assert.rejects(
      service.validateEndUserAccessToken("access-token"),
      (error) => error.code === "CDP_TIMEOUT"
    );
  } finally {
    global.fetch = originalFetch;
    restore();
  }
});
