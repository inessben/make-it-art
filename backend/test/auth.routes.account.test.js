const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const cookieParser = require("cookie-parser");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/auth.routes");
const authServicePath = require.resolve("../src/services/auth.service");
const sessionServicePath = require.resolve("../src/services/session.service");
const rateLimitPath = require.resolve("../src/middlewares/rate-limit.middleware");
const authRequiredPath = require.resolve("../src/middlewares/auth-required.middleware");
const userRepositoryPath = require.resolve("../src/repositories/user.repository");
const twoFactorLoginServicePath = require.resolve("../src/services/two-factor-login.service");
const serializeAuthUserPath = require.resolve("../src/utils/serialize-auth-user");
const envPath = require.resolve("../src/config/env");
const argon2Path = require.resolve("argon2");

const env = {
  nodeEnv: "production",
  sessionCookieName: "mia_session",
  refreshCookieName: "mia_refresh",
  loginCodeCookieName: "mia_login_challenge",
  rememberDeviceCookieName: "mia_remember_device"
};

const authUser = {
  id: 42,
  email: "artist@example.com",
  username: "Ada Lovelace",
  bio: "Collector",
  phone: "0102030405",
  passwordHash: "current-password-hash"
};

function middleware(_req, _res, next) {
  next();
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  };
}

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    bio: user.bio,
    phone: user.phone
  };
}

async function startAuthRoutesApp(t, overrides = {}) {
  const calls = {
    registerUser: [],
    requestPasswordReset: [],
    resetPassword: [],
    resendVerificationEmail: [],
    revokeRefreshToken: [],
    rotateRefreshToken: [],
    updatePassword: [],
    updateUser: [],
    verifyCurrentPassword: [],
    verifyEmail: []
  };

  const authService = {
    async registerUser(payload) {
      calls.registerUser.push(payload);

      if (overrides.registerError) {
        throw new Error(overrides.registerError);
      }

      return overrides.registerUserResult || authUser;
    },
    async resendVerificationEmail(email) {
      calls.resendVerificationEmail.push(email);

      if (overrides.resendVerificationError) {
        throw new Error(overrides.resendVerificationError);
      }
    },
    async requestPasswordReset(email) {
      calls.requestPasswordReset.push(email);

      if (overrides.requestPasswordResetError) {
        throw new Error(overrides.requestPasswordResetError);
      }
    },
    async resetPassword(payload) {
      calls.resetPassword.push(payload);

      if (overrides.resetPasswordError) {
        throw new Error(overrides.resetPasswordError);
      }
    },
    async verifyEmail(token) {
      calls.verifyEmail.push(token);

      if (overrides.verifyEmailError) {
        throw new Error(overrides.verifyEmailError);
      }
    }
  };

  const sessionService = {
    getSessionCookieOptions: cookieOptions,
    getRefreshCookieOptions: cookieOptions,
    getClearSessionCookieOptions: cookieOptions,
    getClearRefreshCookieOptions: cookieOptions,
    async rotateRefreshToken(refreshToken) {
      calls.rotateRefreshToken.push(refreshToken);
      return overrides.rotateRefreshTokenResult || null;
    },
    async revokeRefreshToken(refreshToken) {
      calls.revokeRefreshToken.push(refreshToken);
    }
  };

  const userRepository = {
    async updateUser(userId, updates) {
      calls.updateUser.push({ userId, updates });

      if (overrides.updateUserError) {
        throw overrides.updateUserError;
      }

      return {
        ...authUser,
        ...updates
      };
    },
    async updatePassword(userId, passwordHash) {
      calls.updatePassword.push({ userId, passwordHash });
    }
  };

  const argon2 = {
    async verify(passwordHash, password) {
      calls.verifyCurrentPassword.push({ passwordHash, password });
      return overrides.isCurrentPasswordValid ?? true;
    },
    async hash(password) {
      if (overrides.hashError) {
        throw new Error(overrides.hashError);
      }

      return `hashed:${password}`;
    }
  };

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authServicePath]: authService,
    [sessionServicePath]: sessionService,
    [rateLimitPath]: {
      authRateLimit: middleware,
      strictAuthRateLimit: middleware
    },
    [authRequiredPath]: {
      authRequired(req, _res, next) {
        req.user = overrides.currentUser || authUser;
        next();
      }
    },
    [userRepositoryPath]: userRepository,
    [twoFactorLoginServicePath]: {
      startLoginWithCode: async () => undefined,
      verifyLoginCode: async () => undefined,
      getLoginChallengeCookieOptions: cookieOptions,
      getClearLoginChallengeCookieOptions: cookieOptions,
      getRememberDeviceCookieOptions: cookieOptions,
      getClearRememberDeviceCookieOptions: cookieOptions
    },
    [serializeAuthUserPath]: {
      serializeAuthUser: serializeUser
    },
    [envPath]: env,
    [argon2Path]: argon2
  });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(router);

  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  t.after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
    restore();
  });

  return {
    calls,
    baseUrl: `http://127.0.0.1:${server.address().port}`
  };
}

async function requestJson(baseUrl, method, path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

  const payload = await response.json();

  return {
    body: payload,
    headers: response.headers,
    status: response.status
  };
}

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const setCookie = headers.get("set-cookie");

  return setCookie ? [setCookie] : [];
}

test("POST /auth/register requires all fields", async (t) => {
  const { baseUrl, calls } = await startAuthRoutesApp(t);

  const response = await requestJson(baseUrl, "POST", "/auth/register", {
    username: "Ada"
  });

  assert.equal(response.status, 400);
  assert.equal(
    response.body.message,
    "Username, email, phone, password and confirmation are required"
  );
  assert.deepEqual(calls.registerUser, []);
});

test("POST /auth/register rejects weak passwords", async (t) => {
  const { baseUrl, calls } = await startAuthRoutesApp(t);

  const response = await requestJson(baseUrl, "POST", "/auth/register", {
    username: "Ada",
    email: "artist@example.com",
    phone: "0102030405",
    password: "short",
    confirmPassword: "short"
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Password must be at least 8 characters");
  assert.deepEqual(calls.registerUser, []);
});

test("POST /auth/register rejects mismatched password confirmation", async (t) => {
  const { baseUrl, calls } = await startAuthRoutesApp(t);

  const response = await requestJson(baseUrl, "POST", "/auth/register", {
    username: "Ada",
    email: "artist@example.com",
    phone: "0102030405",
    password: "Password1!",
    confirmPassword: "Password2!"
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Passwords do not match");
  assert.deepEqual(calls.registerUser, []);
});

test("POST /auth/register creates an account", async (t) => {
  const { baseUrl, calls } = await startAuthRoutesApp(t);

  const response = await requestJson(baseUrl, "POST", "/auth/register", {
    username: "Ada",
    email: "artist@example.com",
    phone: "0102030405",
    password: "Password1!",
    confirmPassword: "Password1!"
  });

  assert.equal(response.status, 201);
  assert.equal(
    response.body.message,
    "Account created. Please verify your email before logging in."
  );
  assert.deepEqual(response.body.user, {
    id: authUser.id,
    email: authUser.email,
    username: authUser.username,
    phone: authUser.phone
  });
  assert.deepEqual(calls.registerUser, [
    {
      username: "Ada",
      email: "artist@example.com",
      phone: "0102030405",
      password: "Password1!"
    }
  ]);
});

test("POST /auth/register maps duplicate emails to 409", async (t) => {
  const { baseUrl } = await startAuthRoutesApp(t, {
    registerError: "Email already in use"
  });

  const response = await requestJson(baseUrl, "POST", "/auth/register", {
    username: "Ada",
    email: "artist@example.com",
    phone: "0102030405",
    password: "Password1!",
    confirmPassword: "Password1!"
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.message, "Email already in use");
});

test("POST /auth/register maps unexpected errors to 500", async (t) => {
  t.mock.method(console, "error", () => {});

  const { baseUrl } = await startAuthRoutesApp(t, {
    registerError: "database unavailable"
  });

  const response = await requestJson(baseUrl, "POST", "/auth/register", {
    username: "Ada",
    email: "artist@example.com",
    phone: "0102030405",
    password: "Password1!",
    confirmPassword: "Password1!"
  });

  assert.equal(response.status, 500);
  assert.equal(response.body.message, "Registration failed");
  assert.equal(response.body.error, "database unavailable");
});

test("POST /auth/resend-verification-email validates email and handles service outcomes", async (t) => {
  const missingEmailApp = await startAuthRoutesApp(t);
  const missingEmailResponse = await requestJson(
    missingEmailApp.baseUrl,
    "POST",
    "/auth/resend-verification-email",
    {}
  );

  assert.equal(missingEmailResponse.status, 400);
  assert.equal(missingEmailResponse.body.message, "Email is required");

  const successApp = await startAuthRoutesApp(t);
  const successResponse = await requestJson(
    successApp.baseUrl,
    "POST",
    "/auth/resend-verification-email",
    {
      email: "artist@example.com"
    }
  );

  assert.equal(successResponse.status, 200);
  assert.equal(successResponse.body.message, "Verification email sent. Please check your inbox.");
  assert.deepEqual(successApp.calls.resendVerificationEmail, ["artist@example.com"]);

  const verifiedApp = await startAuthRoutesApp(t, {
    resendVerificationError: "Email already verified"
  });
  const verifiedResponse = await requestJson(
    verifiedApp.baseUrl,
    "POST",
    "/auth/resend-verification-email",
    {
      email: "artist@example.com"
    }
  );

  assert.equal(verifiedResponse.status, 409);
  assert.equal(verifiedResponse.body.message, "Email is already verified.");
});

test("GET /auth/verify-email validates token and maps success or failure", async (t) => {
  const missingTokenApp = await startAuthRoutesApp(t);
  const missingTokenResponse = await requestJson(
    missingTokenApp.baseUrl,
    "GET",
    "/auth/verify-email"
  );

  assert.equal(missingTokenResponse.status, 400);
  assert.equal(missingTokenResponse.body.message, "Verification token is required");

  const successApp = await startAuthRoutesApp(t);
  const successResponse = await requestJson(
    successApp.baseUrl,
    "GET",
    "/auth/verify-email?token=verification-token"
  );

  assert.equal(successResponse.status, 200);
  assert.equal(successResponse.body.message, "Email verified successfully");
  assert.deepEqual(successApp.calls.verifyEmail, ["verification-token"]);

  const failureApp = await startAuthRoutesApp(t, {
    verifyEmailError: "Invalid token"
  });
  const failureResponse = await requestJson(
    failureApp.baseUrl,
    "GET",
    "/auth/verify-email?token=bad-token"
  );

  assert.equal(failureResponse.status, 400);
  assert.equal(failureResponse.body.message, "Invalid or expired verification token");
});

test("GET /auth/me returns the authenticated user", async (t) => {
  const { baseUrl } = await startAuthRoutesApp(t);

  const response = await requestJson(baseUrl, "GET", "/auth/me");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user, serializeUser(authUser));
});

test("PATCH /auth/me validates payload and updates profile fields", async (t) => {
  const missingFieldsApp = await startAuthRoutesApp(t);
  const missingFieldsResponse = await requestJson(
    missingFieldsApp.baseUrl,
    "PATCH",
    "/auth/me",
    {}
  );

  assert.equal(missingFieldsResponse.status, 400);
  assert.equal(missingFieldsResponse.body.message, "No profile fields provided to update");

  const successApp = await startAuthRoutesApp(t);
  const successResponse = await requestJson(successApp.baseUrl, "PATCH", "/auth/me", {
    username: "Grace Hopper",
    email: " Grace@Example.COM ",
    bio: "Engineer"
  });

  assert.equal(successResponse.status, 200);
  assert.equal(successResponse.body.user.email, "grace@example.com");
  assert.deepEqual(successApp.calls.updateUser, [
    {
      userId: authUser.id,
      updates: {
        username: "Grace Hopper",
        email: "grace@example.com",
        bio: "Engineer"
      }
    }
  ]);

  const duplicateEmailApp = await startAuthRoutesApp(t, {
    updateUserError: {
      code: "P2002"
    }
  });
  const duplicateEmailResponse = await requestJson(duplicateEmailApp.baseUrl, "PATCH", "/auth/me", {
    email: "used@example.com"
  });

  assert.equal(duplicateEmailResponse.status, 409);
  assert.equal(duplicateEmailResponse.body.message, "Email is already in use");
});

test("PATCH /auth/password validates fields before changing the password", async (t) => {
  const missingFieldsApp = await startAuthRoutesApp(t);
  const missingFieldsResponse = await requestJson(
    missingFieldsApp.baseUrl,
    "PATCH",
    "/auth/password",
    {
      currentPassword: "Current1!"
    }
  );

  assert.equal(missingFieldsResponse.status, 400);
  assert.equal(
    missingFieldsResponse.body.message,
    "Current password, new password and confirmation are required"
  );

  const mismatchApp = await startAuthRoutesApp(t);
  const mismatchResponse = await requestJson(mismatchApp.baseUrl, "PATCH", "/auth/password", {
    currentPassword: "Current1!",
    newPassword: "Password1!",
    confirmPassword: "Password2!"
  });

  assert.equal(mismatchResponse.status, 400);
  assert.equal(mismatchResponse.body.message, "Passwords do not match");

  const weakPasswordApp = await startAuthRoutesApp(t);
  const weakPasswordResponse = await requestJson(
    weakPasswordApp.baseUrl,
    "PATCH",
    "/auth/password",
    {
      currentPassword: "Current1!",
      newPassword: "password",
      confirmPassword: "password"
    }
  );

  assert.equal(weakPasswordResponse.status, 400);
  assert.equal(
    weakPasswordResponse.body.message,
    "Password must contain at least one uppercase letter"
  );

  const unchangedPasswordApp = await startAuthRoutesApp(t);
  const unchangedPasswordResponse = await requestJson(
    unchangedPasswordApp.baseUrl,
    "PATCH",
    "/auth/password",
    {
      currentPassword: "Password1!",
      newPassword: "Password1!",
      confirmPassword: "Password1!"
    }
  );

  assert.equal(unchangedPasswordResponse.status, 400);
  assert.equal(
    unchangedPasswordResponse.body.message,
    "New password must be different from current password"
  );
});

test("PATCH /auth/password rejects invalid current password and accepts valid changes", async (t) => {
  const invalidCurrentApp = await startAuthRoutesApp(t, {
    isCurrentPasswordValid: false
  });
  const invalidCurrentResponse = await requestJson(
    invalidCurrentApp.baseUrl,
    "PATCH",
    "/auth/password",
    {
      currentPassword: "Wrong1!",
      newPassword: "Password1!",
      confirmPassword: "Password1!"
    }
  );

  assert.equal(invalidCurrentResponse.status, 401);
  assert.equal(invalidCurrentResponse.body.message, "Current password is incorrect");

  const successApp = await startAuthRoutesApp(t);
  const successResponse = await requestJson(successApp.baseUrl, "PATCH", "/auth/password", {
    currentPassword: "Current1!",
    newPassword: "Password1!",
    confirmPassword: "Password1!"
  });

  assert.equal(successResponse.status, 200);
  assert.equal(successResponse.body.message, "Password updated successfully");
  assert.deepEqual(successApp.calls.verifyCurrentPassword, [
    {
      passwordHash: authUser.passwordHash,
      password: "Current1!"
    }
  ]);
  assert.deepEqual(successApp.calls.updatePassword, [
    {
      userId: authUser.id,
      passwordHash: "hashed:Password1!"
    }
  ]);
});

test("POST /auth/logout revokes refresh token and clears auth cookies", async (t) => {
  const { baseUrl, calls } = await startAuthRoutesApp(t);

  const response = await requestJson(
    baseUrl,
    "POST",
    "/auth/logout",
    {},
    {
      cookie: "mia_refresh=refresh-token"
    }
  );

  const cookies = getSetCookieHeaders(response.headers);

  assert.equal(response.status, 200);
  assert.equal(response.body.message, "Logged out");
  assert.deepEqual(calls.revokeRefreshToken, ["refresh-token"]);
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_session=")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_refresh=")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_login_challenge=")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_remember_device=")));
});

test("POST /auth/forgot-password validates email and keeps responses generic", async (t) => {
  const missingEmailApp = await startAuthRoutesApp(t);
  const missingEmailResponse = await requestJson(
    missingEmailApp.baseUrl,
    "POST",
    "/auth/forgot-password",
    {}
  );

  assert.equal(missingEmailResponse.status, 400);
  assert.equal(missingEmailResponse.body.message, "Email is required");

  const successApp = await startAuthRoutesApp(t);
  const successResponse = await requestJson(successApp.baseUrl, "POST", "/auth/forgot-password", {
    email: "artist@example.com"
  });

  assert.equal(successResponse.status, 200);
  assert.equal(
    successResponse.body.message,
    "If this email exists, a password reset link has been sent."
  );
  assert.deepEqual(successApp.calls.requestPasswordReset, ["artist@example.com"]);

  const failureApp = await startAuthRoutesApp(t, {
    requestPasswordResetError: "email service down"
  });
  const failureResponse = await requestJson(failureApp.baseUrl, "POST", "/auth/forgot-password", {
    email: "artist@example.com"
  });

  assert.equal(failureResponse.status, 200);
  assert.equal(
    failureResponse.body.message,
    "If this email exists, a password reset link has been sent."
  );
});

test("POST /auth/reset-password validates input and resets valid passwords", async (t) => {
  const missingFieldsApp = await startAuthRoutesApp(t);
  const missingFieldsResponse = await requestJson(
    missingFieldsApp.baseUrl,
    "POST",
    "/auth/reset-password",
    {
      token: "reset-token"
    }
  );

  assert.equal(missingFieldsResponse.status, 400);
  assert.equal(missingFieldsResponse.body.message, "Token, password and confirmation are required");

  const mismatchApp = await startAuthRoutesApp(t);
  const mismatchResponse = await requestJson(mismatchApp.baseUrl, "POST", "/auth/reset-password", {
    token: "reset-token",
    password: "Password1!",
    confirmPassword: "Password2!"
  });

  assert.equal(mismatchResponse.status, 400);
  assert.equal(mismatchResponse.body.message, "Passwords do not match");

  const successApp = await startAuthRoutesApp(t);
  const successResponse = await requestJson(successApp.baseUrl, "POST", "/auth/reset-password", {
    token: "reset-token",
    password: "Password1!",
    confirmPassword: "Password1!"
  });

  assert.equal(successResponse.status, 200);
  assert.equal(successResponse.body.message, "Password reset successfully. You can now log in.");
  assert.deepEqual(successApp.calls.resetPassword, [
    {
      token: "reset-token",
      password: "Password1!"
    }
  ]);

  const failureApp = await startAuthRoutesApp(t, {
    resetPasswordError: "Invalid token"
  });
  const failureResponse = await requestJson(failureApp.baseUrl, "POST", "/auth/reset-password", {
    token: "bad-token",
    password: "Password1!",
    confirmPassword: "Password1!"
  });

  assert.equal(failureResponse.status, 400);
  assert.equal(failureResponse.body.message, "Invalid or expired reset link");
});

test("POST /auth/refresh validates refresh token and rotates valid sessions", async (t) => {
  const missingTokenApp = await startAuthRoutesApp(t);
  const missingTokenResponse = await requestJson(
    missingTokenApp.baseUrl,
    "POST",
    "/auth/refresh",
    {}
  );

  assert.equal(missingTokenResponse.status, 401);
  assert.equal(missingTokenResponse.body.message, "Not authenticated");

  const invalidTokenApp = await startAuthRoutesApp(t);
  const invalidTokenResponse = await requestJson(
    invalidTokenApp.baseUrl,
    "POST",
    "/auth/refresh",
    {},
    {
      cookie: "mia_refresh=expired-token"
    }
  );

  assert.equal(invalidTokenResponse.status, 401);
  assert.equal(invalidTokenResponse.body.message, "Invalid or expired session");
  assert.deepEqual(invalidTokenApp.calls.rotateRefreshToken, ["expired-token"]);

  const successApp = await startAuthRoutesApp(t, {
    rotateRefreshTokenResult: {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token"
    }
  });
  const successResponse = await requestJson(
    successApp.baseUrl,
    "POST",
    "/auth/refresh",
    {},
    {
      cookie: "mia_refresh=refresh-token"
    }
  );

  const cookies = getSetCookieHeaders(successResponse.headers);

  assert.equal(successResponse.status, 200);
  assert.equal(successResponse.body.message, "Session refreshed");
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_session=new-access-token")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_refresh=new-refresh-token")));
});
