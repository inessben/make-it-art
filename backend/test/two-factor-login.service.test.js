const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { test } = require("node:test");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const servicePath = require.resolve("../src/services/two-factor-login.service");
const envPath = require.resolve("../src/config/env");
const userRepositoryPath = require.resolve("../src/repositories/user.repository");
const loginCodeRepositoryPath =
  require.resolve("../src/repositories/login-verification-code.repository");
const rememberedDeviceRepositoryPath =
  require.resolve("../src/repositories/remembered-device.repository");
const mailServicePath = require.resolve("../src/services/mail.service");
const sessionServicePath = require.resolve("../src/services/session.service");
const argon2Path = require.resolve("argon2");

const activeUser = {
  id: 42,
  email: "artist@example.com",
  username: "Ada",
  passwordHash: "hashed-password",
  verified: true,
  isActive: true
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function buildEnv(overrides = {}) {
  const { defaultAdmin: defaultAdminOverrides, ...envOverrides } = overrides;
  const defaultAdmin = {
    email: "admin@art.com",
    bypassLoginCode: false,
    ...(defaultAdminOverrides || {})
  };

  return {
    nodeEnv: "test",
    ...envOverrides,
    defaultAdmin
  };
}

function loadService(overrides = {}) {
  const calls = {
    createCode: [],
    createDevice: [],
    createSession: [],
    findByEmail: [],
    findById: [],
    findValidCodeByHash: [],
    findValidDeviceByHash: [],
    markCodeAsUsed: [],
    markUnusedCodesAsUsed: [],
    sendLoginCodeEmail: [],
    updateDeviceExpiry: [],
    verifyPassword: []
  };

  const user = Object.prototype.hasOwnProperty.call(overrides, "user")
    ? overrides.user
    : activeUser;

  const session = overrides.session || {
    accessToken: "access-token",
    refreshToken: "refresh-token"
  };

  const modules = {
    [envPath]: buildEnv(overrides.env),
    [userRepositoryPath]: {
      async findByEmail(email) {
        calls.findByEmail.push(email);
        return user;
      },
      async findById(id) {
        calls.findById.push(id);
        return overrides.currentUser || user;
      }
    },
    [loginCodeRepositoryPath]: {
      async createCode(payload) {
        calls.createCode.push(payload);
        return { id: 101, ...payload };
      },
      async findValidCodeByHash(payload) {
        calls.findValidCodeByHash.push(payload);
        return overrides.loginCode || null;
      },
      async markCodeAsUsed(id) {
        calls.markCodeAsUsed.push(id);
        return { id };
      },
      async markUnusedCodesAsUsed(userId) {
        calls.markUnusedCodesAsUsed.push(userId);
        return { count: 1 };
      }
    },
    [rememberedDeviceRepositoryPath]: {
      async createDevice(payload) {
        calls.createDevice.push(payload);
        return { id: 202, ...payload };
      },
      async findValidDeviceByHash(tokenHash) {
        calls.findValidDeviceByHash.push(tokenHash);
        return overrides.rememberedDevice || null;
      },
      async updateDeviceExpiry(payload) {
        calls.updateDeviceExpiry.push(payload);
        return { id: payload.deviceId, expiresAt: payload.expiresAt };
      }
    },
    [mailServicePath]: {
      async sendLoginCodeEmail(payload) {
        calls.sendLoginCodeEmail.push(payload);
      }
    },
    [sessionServicePath]: {
      async createSession(sessionUser) {
        calls.createSession.push(sessionUser);
        return session;
      }
    },
    [argon2Path]: {
      async verify(passwordHash, password) {
        calls.verifyPassword.push({ passwordHash, password });
        return overrides.isValidPassword ?? true;
      }
    }
  };

  const { moduleExports, restore } = loadModuleWithMocks(servicePath, modules);

  return {
    calls,
    restore,
    service: moduleExports
  };
}

test("startLoginWithCode normalizes email and rejects unknown users", async (t) => {
  const { calls, restore, service } = loadService({ user: null });
  t.after(restore);

  await assert.rejects(
    () =>
      service.startLoginWithCode({
        email: " Artist@Example.COM ",
        password: "secret"
      }),
    /Invalid credentials/
  );

  assert.deepEqual(calls.findByEmail, ["artist@example.com"]);
  assert.deepEqual(calls.verifyPassword, []);
  assert.deepEqual(calls.createCode, []);
});

test("startLoginWithCode rejects unverified or inactive users before password verification", async (t) => {
  const { calls, restore, service } = loadService({
    user: {
      ...activeUser,
      verified: false
    }
  });
  t.after(restore);

  await assert.rejects(
    () =>
      service.startLoginWithCode({
        email: activeUser.email,
        password: "secret"
      }),
    /Email not verified/
  );

  assert.deepEqual(calls.verifyPassword, []);
  assert.deepEqual(calls.createCode, []);
});

test("startLoginWithCode rejects invalid passwords", async (t) => {
  const { calls, restore, service } = loadService({ isValidPassword: false });
  t.after(restore);

  await assert.rejects(
    () =>
      service.startLoginWithCode({
        email: activeUser.email,
        password: "bad-password"
      }),
    /Invalid credentials/
  );

  assert.deepEqual(calls.verifyPassword, [
    {
      passwordHash: activeUser.passwordHash,
      password: "bad-password"
    }
  ]);
  assert.deepEqual(calls.createCode, []);
  assert.deepEqual(calls.sendLoginCodeEmail, []);
});

test("startLoginWithCode creates and emails a login code for valid credentials", async (t) => {
  t.mock.method(crypto, "randomInt", () => 123456);
  t.mock.method(crypto, "randomBytes", (size) => Buffer.alloc(size, 2));

  const { calls, restore, service } = loadService();
  t.after(restore);

  const beforeCall = Date.now();
  const result = await service.startLoginWithCode({
    email: activeUser.email,
    password: "valid-password"
  });

  const challengeToken = "02".repeat(32);
  const codeHash = sha256(`${challengeToken}:123456`);
  const expiresAt = calls.createCode[0].expiresAt.getTime();

  assert.deepEqual(result, {
    bypassCode: false,
    challengeToken
  });
  assert.deepEqual(calls.markUnusedCodesAsUsed, [activeUser.id]);
  assert.equal(calls.createCode[0].userId, activeUser.id);
  assert.equal(calls.createCode[0].codeHash, codeHash);
  assert.ok(expiresAt >= beforeCall + 1000 * 60 * 10);
  assert.ok(expiresAt <= Date.now() + 1000 * 60 * 10 + 1000);
  assert.deepEqual(calls.sendLoginCodeEmail, [
    {
      to: activeUser.email,
      username: activeUser.username,
      code: "123456"
    }
  ]);
  assert.deepEqual(calls.createSession, []);
});

test("startLoginWithCode bypasses email code for the configured default admin", async (t) => {
  const { calls, restore, service } = loadService({
    env: {
      defaultAdmin: {
        email: "admin@art.com",
        bypassLoginCode: true
      }
    },
    user: {
      ...activeUser,
      email: "admin@art.com"
    }
  });
  t.after(restore);

  const result = await service.startLoginWithCode({
    email: " Admin@Art.COM ",
    password: "valid-password"
  });

  assert.deepEqual(result, {
    accessToken: "access-token",
    bypassCode: true,
    refreshToken: "refresh-token",
    user: {
      ...activeUser,
      email: "admin@art.com"
    }
  });
  assert.equal(calls.createSession.length, 1);
  assert.deepEqual(calls.createCode, []);
  assert.deepEqual(calls.sendLoginCodeEmail, []);
});

test("startLoginWithCode bypasses email code for a valid remembered device", async (t) => {
  const rememberDeviceToken = "remember-device-token";
  const { calls, restore, service } = loadService({
    rememberedDevice: {
      id: 12,
      userId: activeUser.id,
      user: {
        verified: true,
        isActive: true
      }
    }
  });
  t.after(restore);

  const result = await service.startLoginWithCode({
    email: activeUser.email,
    password: "valid-password",
    rememberDeviceToken
  });

  assert.deepEqual(calls.findValidDeviceByHash, [sha256(rememberDeviceToken)]);
  assert.equal(result.bypassCode, true);
  assert.equal(result.accessToken, "access-token");
  assert.equal(result.rememberDeviceToken, rememberDeviceToken);
  assert.deepEqual(calls.createCode, []);
  assert.deepEqual(calls.sendLoginCodeEmail, []);
  assert.deepEqual(calls.updateDeviceExpiry, [
    {
      deviceId: 12,
      expiresAt: calls.updateDeviceExpiry[0].expiresAt
    }
  ]);
  assert.ok(calls.updateDeviceExpiry[0].expiresAt instanceof Date);
});

test("startLoginWithCode falls back to email code when remembered device is not for the user", async (t) => {
  t.mock.method(crypto, "randomInt", () => 234567);
  t.mock.method(crypto, "randomBytes", (size) => Buffer.alloc(size, 4));

  const { calls, restore, service } = loadService({
    rememberedDevice: {
      userId: 999,
      user: {
        verified: true,
        isActive: true
      }
    }
  });
  t.after(restore);

  const result = await service.startLoginWithCode({
    email: activeUser.email,
    password: "valid-password",
    rememberDeviceToken: "other-user-device"
  });

  assert.deepEqual(result, {
    bypassCode: false,
    challengeToken: "04".repeat(32)
  });
  assert.equal(calls.createCode.length, 1);
  assert.equal(calls.sendLoginCodeEmail.length, 1);
  assert.deepEqual(calls.createSession, []);
});

test("verifyLoginCode rejects invalid or expired login codes", async (t) => {
  const { calls, restore, service } = loadService();
  t.after(restore);

  await assert.rejects(
    () =>
      service.verifyLoginCode({
        challengeToken: "challenge",
        code: "123456",
        rememberDevice: false
      }),
    /Invalid or expired login code/
  );

  assert.deepEqual(calls.findValidCodeByHash, [
    {
      userId: undefined,
      codeHash: sha256("challenge:123456")
    }
  ]);
  assert.deepEqual(calls.markCodeAsUsed, []);
  assert.deepEqual(calls.createSession, []);
});

test("verifyLoginCode marks the code as used and creates a session", async (t) => {
  const { calls, restore, service } = loadService({
    loginCode: {
      id: 7,
      user: activeUser
    }
  });
  t.after(restore);

  const result = await service.verifyLoginCode({
    challengeToken: "challenge",
    code: "123456",
    rememberDevice: false
  });

  assert.deepEqual(result, {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    rememberDeviceToken: null,
    user: activeUser
  });
  assert.deepEqual(calls.markCodeAsUsed, [7]);
  assert.deepEqual(calls.createSession, [activeUser]);
  assert.deepEqual(calls.createDevice, []);
});

test("verifyLoginCode creates a remembered device token when requested", async (t) => {
  t.mock.method(crypto, "randomBytes", (size) => Buffer.alloc(size, 3));

  const { calls, restore, service } = loadService({
    loginCode: {
      id: 8,
      user: activeUser
    }
  });
  t.after(restore);

  const result = await service.verifyLoginCode({
    challengeToken: "challenge",
    code: "123456",
    rememberDevice: true
  });

  const rememberDeviceToken = "03".repeat(32);

  assert.equal(result.rememberDeviceToken, rememberDeviceToken);
  assert.deepEqual(calls.createDevice, [
    {
      userId: activeUser.id,
      tokenHash: sha256(rememberDeviceToken),
      expiresAt: calls.createDevice[0].expiresAt
    }
  ]);
  assert.ok(calls.createDevice[0].expiresAt instanceof Date);
});

test("login cookie options use the expected lifetimes and secure flag", (t) => {
  const { restore, service } = loadService({
    env: {
      nodeEnv: "production"
    }
  });
  t.after(restore);

  assert.deepEqual(service.getLoginChallengeCookieOptions(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 1000 * 60 * 10,
    path: "/"
  });
  assert.deepEqual(service.getClearLoginChallengeCookieOptions(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/"
  });
  assert.deepEqual(service.getRememberDeviceCookieOptions(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 1000 * 60 * 60 * 24 * 30,
    path: "/"
  });
  assert.deepEqual(service.getClearRememberDeviceCookieOptions(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/"
  });
});
