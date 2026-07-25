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

const env = {
  nodeEnv: "production",
  sessionCookieName: "mia_session",
  refreshCookieName: "mia_refresh",
  loginCodeCookieName: "mia_login_challenge",
  rememberDeviceCookieName: "mia_remember_device"
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

async function startAuthRoutesApp(t, overrides = {}) {
  const calls = {
    startLoginWithCode: [],
    verifyLoginCode: []
  };

  const twoFactorLoginService = {
    async startLoginWithCode(payload) {
      calls.startLoginWithCode.push(payload);

      if (overrides.startLoginError) {
        throw new Error(overrides.startLoginError);
      }

      return overrides.startLoginResult;
    },
    async verifyLoginCode(payload) {
      calls.verifyLoginCode.push(payload);

      if (overrides.verifyLoginError) {
        throw new Error(overrides.verifyLoginError);
      }

      return overrides.verifyLoginResult;
    },
    getLoginChallengeCookieOptions: cookieOptions,
    getClearLoginChallengeCookieOptions: cookieOptions,
    getRememberDeviceCookieOptions: cookieOptions,
    getClearRememberDeviceCookieOptions: cookieOptions
  };

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authServicePath]: {
      registerUser: async () => undefined,
      resendVerificationEmail: async () => undefined,
      requestPasswordReset: async () => undefined,
      resetPassword: async () => undefined,
      verifyEmail: async () => undefined
    },
    [sessionServicePath]: {
      getSessionCookieOptions: cookieOptions,
      getRefreshCookieOptions: cookieOptions,
      getClearSessionCookieOptions: cookieOptions,
      getClearRefreshCookieOptions: cookieOptions,
      rotateRefreshToken: async () => null,
      revokeRefreshToken: async () => undefined
    },
    [rateLimitPath]: {
      authRateLimit: middleware,
      strictAuthRateLimit: middleware
    },
    [authRequiredPath]: {
      authRequired: middleware
    },
    [userRepositoryPath]: {},
    [twoFactorLoginServicePath]: twoFactorLoginService,
    [serializeAuthUserPath]: {
      serializeAuthUser(user) {
        return {
          id: user.id,
          email: user.email
        };
      }
    },
    [envPath]: env
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

async function postJson(baseUrl, path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
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

test("POST /auth/login requires email and password", async (t) => {
  const { baseUrl, calls } = await startAuthRoutesApp(t);

  const response = await postJson(baseUrl, "/auth/login", {
    email: "artist@example.com"
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Email and password are required");
  assert.deepEqual(calls.startLoginWithCode, []);
});

test("POST /auth/login returns a challenge cookie when an email code is required", async (t) => {
  const { baseUrl, calls } = await startAuthRoutesApp(t, {
    startLoginResult: {
      bypassCode: false,
      challengeToken: "challenge-token"
    }
  });

  const response = await postJson(baseUrl, "/auth/login", {
    email: "artist@example.com",
    password: "Password1!"
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    message: "Login code sent. Please check your email.",
    requiresCode: true
  });
  assert.deepEqual(calls.startLoginWithCode, [
    {
      email: "artist@example.com",
      password: "Password1!",
      rememberDeviceToken: undefined
    }
  ]);
  assert.ok(
    getSetCookieHeaders(response.headers).some((cookie) =>
      cookie.startsWith("mia_login_challenge=challenge-token")
    )
  );
});

test("POST /auth/login creates session cookies when code is bypassed", async (t) => {
  const user = {
    id: 42,
    email: "artist@example.com"
  };
  const { baseUrl } = await startAuthRoutesApp(t, {
    startLoginResult: {
      accessToken: "access-token",
      bypassCode: true,
      refreshToken: "refresh-token",
      user
    }
  });

  const response = await postJson(
    baseUrl,
    "/auth/login",
    {
      email: user.email,
      password: "Password1!"
    },
    {
      cookie: "mia_remember_device=remember-token"
    }
  );

  const cookies = getSetCookieHeaders(response.headers);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    message: "Login successful",
    requiresCode: false,
    redirectTo: "/",
    user
  });
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_session=access-token")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_refresh=refresh-token")));
});

test("POST /auth/login refreshes the remembered-device cookie when the device bypasses email code", async (t) => {
  const user = {
    id: 42,
    email: "artist@example.com"
  };
  const { baseUrl } = await startAuthRoutesApp(t, {
    startLoginResult: {
      accessToken: "access-token",
      bypassCode: true,
      refreshToken: "refresh-token",
      rememberDeviceToken: "remember-token",
      user
    }
  });

  const response = await postJson(
    baseUrl,
    "/auth/login",
    {
      email: user.email,
      password: "Password1!"
    },
    {
      cookie: "mia_remember_device=remember-token"
    }
  );

  const cookies = getSetCookieHeaders(response.headers);

  assert.equal(response.status, 200);
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_remember_device=remember-token")));
});

test("POST /auth/login maps unverified users to 403", async (t) => {
  const { baseUrl } = await startAuthRoutesApp(t, {
    startLoginError: "Email not verified"
  });

  const response = await postJson(baseUrl, "/auth/login", {
    email: "artist@example.com",
    password: "Password1!"
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.message, "Please verify your email before logging in.");
});

test("POST /auth/login maps invalid credentials to 401", async (t) => {
  const { baseUrl } = await startAuthRoutesApp(t, {
    startLoginError: "Invalid credentials"
  });

  const response = await postJson(baseUrl, "/auth/login", {
    email: "artist@example.com",
    password: "wrong-password"
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.message, "Invalid credentials");
});

test("POST /auth/verify-login-code requires a challenge cookie and code", async (t) => {
  const { baseUrl, calls } = await startAuthRoutesApp(t);

  const response = await postJson(baseUrl, "/auth/verify-login-code", {
    code: "123456"
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Login code is required");
  assert.deepEqual(calls.verifyLoginCode, []);
});

test("POST /auth/verify-login-code creates session cookies and a remembered device cookie", async (t) => {
  const user = {
    id: 42,
    email: "artist@example.com"
  };
  const { baseUrl, calls } = await startAuthRoutesApp(t, {
    verifyLoginResult: {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      rememberDeviceToken: "remember-token",
      user
    }
  });

  const response = await postJson(
    baseUrl,
    "/auth/verify-login-code",
    {
      code: "123456",
      rememberDevice: true
    },
    {
      cookie: "mia_login_challenge=challenge-token"
    }
  );

  const cookies = getSetCookieHeaders(response.headers);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    message: "Login successful",
    redirectTo: "/",
    user
  });
  assert.equal(calls.verifyLoginCode[0].challengeToken, "challenge-token");
  assert.equal(calls.verifyLoginCode[0].code, "123456");
  assert.equal(calls.verifyLoginCode[0].rememberDevice, true);
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_login_challenge=")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_session=access-token")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_refresh=refresh-token")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_remember_device=remember-token")));
});

test("POST /auth/verify-login-code maps invalid codes to 401", async (t) => {
  const { baseUrl } = await startAuthRoutesApp(t, {
    verifyLoginError: "Invalid or expired login code"
  });

  const response = await postJson(
    baseUrl,
    "/auth/verify-login-code",
    {
      code: "123456",
      rememberDevice: false
    },
    {
      cookie: "mia_login_challenge=challenge-token"
    }
  );

  assert.equal(response.status, 401);
  assert.equal(response.body.message, "Invalid or expired login code");
});

test("POST /auth/login redirects admin users to the admin dashboard", async (t) => {
  const adminUser = {
    id: 7,
    email: "admin@example.com",
    role: "admin"
  };
  const { baseUrl } = await startAuthRoutesApp(t, {
    startLoginResult: {
      accessToken: "access-token",
      bypassCode: true,
      refreshToken: "refresh-token",
      user: adminUser
    }
  });

  const response = await postJson(baseUrl, "/auth/login", {
    email: adminUser.email,
    password: "Password1!"
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.redirectTo, "/admin");
});
