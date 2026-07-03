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
const googleOAuthServicePath = require.resolve("../src/services/google-oauth.service");
const serializeAuthUserPath = require.resolve("../src/utils/serialize-auth-user");
const envPath = require.resolve("../src/config/env");
const argon2Path = require.resolve("argon2");

class GoogleOAuthError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const env = {
  appBaseUrl: "http://localhost",
  nodeEnv: "production",
  sessionCookieName: "mia_session",
  refreshCookieName: "mia_refresh",
  loginCodeCookieName: "mia_login_challenge",
  rememberDeviceCookieName: "mia_remember_device",
  googleOAuth: {
    stateCookieName: "mia_google_oauth_state",
    linkCookieName: "mia_google_oauth_link"
  }
};

const authUser = {
  id: 42,
  email: "artist@example.com",
  username: "Ada"
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
    authenticateGoogleCode: [],
    linkGoogleAccountWithPassword: []
  };

  const googleOAuthService = {
    GoogleOAuthError,
    getGoogleAuthorizationUrl() {
      if (overrides.googleAuthorizationError) {
        throw new Error(overrides.googleAuthorizationError);
      }

      return {
        authorizationUrl: "https://accounts.google.test/oauth?client_id=test-client",
        state: "state-token"
      };
    },
    async authenticateGoogleCode(code) {
      calls.authenticateGoogleCode.push(code);

      if (overrides.authenticateGoogleCodeError) {
        throw new Error(overrides.authenticateGoogleCodeError);
      }

      return (
        overrides.authenticateGoogleCodeResult || {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          status: "authenticated",
          user: authUser
        }
      );
    },
    async linkGoogleAccountWithPassword(payload) {
      calls.linkGoogleAccountWithPassword.push(payload);

      if (overrides.linkGoogleAccountError) {
        throw new GoogleOAuthError(
          overrides.linkGoogleAccountError.message,
          overrides.linkGoogleAccountError.code
        );
      }

      return {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        status: "authenticated",
        user: authUser
      };
    },
    getGoogleOAuthStateCookieOptions: cookieOptions,
    getClearGoogleOAuthStateCookieOptions: cookieOptions,
    getGoogleOAuthLinkCookieOptions: cookieOptions,
    getClearGoogleOAuthLinkCookieOptions: cookieOptions
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
    [twoFactorLoginServicePath]: {
      startLoginWithCode: async () => undefined,
      verifyLoginCode: async () => undefined,
      getLoginChallengeCookieOptions: cookieOptions,
      getClearLoginChallengeCookieOptions: cookieOptions,
      getRememberDeviceCookieOptions: cookieOptions,
      getClearRememberDeviceCookieOptions: cookieOptions
    },
    [googleOAuthServicePath]: googleOAuthService,
    [serializeAuthUserPath]: {
      serializeAuthUser(user) {
        return {
          id: user.id,
          email: user.email
        };
      }
    },
    [envPath]: env,
    [argon2Path]: {}
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

async function request(baseUrl, path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
}

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const setCookie = headers.get("set-cookie");

  return setCookie ? [setCookie] : [];
}

test("GET /auth/google redirects to Google and stores the OAuth state", async (t) => {
  const { baseUrl } = await startAuthRoutesApp(t);

  const response = await request(baseUrl, "/auth/google");
  const cookies = getSetCookieHeaders(response.headers);

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "https://accounts.google.test/oauth?client_id=test-client"
  );
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_google_oauth_state=state-token")));
});

test("GET /auth/google redirects back with an unavailable message when not configured", async (t) => {
  const { baseUrl } = await startAuthRoutesApp(t, {
    googleAuthorizationError: "missing config"
  });

  const response = await request(baseUrl, "/auth/google");

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "http://localhost/login?google=unavailable");
});

test("GET /auth/google/callback handles user cancellation", async (t) => {
  const { baseUrl, calls } = await startAuthRoutesApp(t);

  const response = await request(baseUrl, "/auth/google/callback?error=access_denied");

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "http://localhost/login?google=cancelled");
  assert.deepEqual(calls.authenticateGoogleCode, []);
});

test("GET /auth/google/callback rejects state mismatches", async (t) => {
  const { baseUrl, calls } = await startAuthRoutesApp(t);

  const response = await request(baseUrl, "/auth/google/callback?code=code&state=state-token", {
    headers: {
      cookie: "mia_google_oauth_state=other-state"
    }
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "http://localhost/login?google=error");
  assert.deepEqual(calls.authenticateGoogleCode, []);
});

test("GET /auth/google/callback logs in successful OAuth users", async (t) => {
  const { baseUrl, calls } = await startAuthRoutesApp(t);

  const response = await request(baseUrl, "/auth/google/callback?code=code&state=state-token", {
    headers: {
      cookie: "mia_google_oauth_state=state-token"
    }
  });
  const cookies = getSetCookieHeaders(response.headers);

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "http://localhost/profile");
  assert.deepEqual(calls.authenticateGoogleCode, ["code"]);
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_session=access-token")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_refresh=refresh-token")));
});

test("GET /auth/google/callback redirects admins to the admin dashboard", async (t) => {
  const { baseUrl } = await startAuthRoutesApp(t, {
    authenticateGoogleCodeResult: {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      status: "authenticated",
      user: {
        ...authUser,
        role: "admin"
      }
    }
  });

  const response = await request(baseUrl, "/auth/google/callback?code=code&state=state-token", {
    headers: {
      cookie: "mia_google_oauth_state=state-token"
    }
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "http://localhost/admin");
});

test("GET /auth/google/callback redirects to password linking when required", async (t) => {
  const { baseUrl } = await startAuthRoutesApp(t, {
    authenticateGoogleCodeResult: {
      email: "artist@example.com",
      linkToken: "link-token",
      status: "requires_password"
    }
  });

  const response = await request(baseUrl, "/auth/google/callback?code=code&state=state-token", {
    headers: {
      cookie: "mia_google_oauth_state=state-token"
    }
  });
  const cookies = getSetCookieHeaders(response.headers);

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "http://localhost/login?googleLink=required&email=artist%40example.com"
  );
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_google_oauth_link=link-token")));
});

test("POST /auth/google/link requires the pending link cookie and password", async (t) => {
  const { baseUrl, calls } = await startAuthRoutesApp(t);

  const response = await request(baseUrl, "/auth/google/link", {
    method: "POST",
    body: JSON.stringify({})
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.message, "Google sign-in session and password are required");
  assert.deepEqual(calls.linkGoogleAccountWithPassword, []);
});

test("POST /auth/google/link refuses incorrect passwords", async (t) => {
  const { baseUrl, calls } = await startAuthRoutesApp(t, {
    linkGoogleAccountError: {
      code: "GOOGLE_LINK_INVALID_PASSWORD",
      message: "Password is incorrect"
    }
  });

  const response = await request(baseUrl, "/auth/google/link", {
    method: "POST",
    headers: {
      cookie: "mia_google_oauth_link=link-token"
    },
    body: JSON.stringify({
      password: "Wrong1!"
    })
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.message, "Password is incorrect");
  assert.deepEqual(calls.linkGoogleAccountWithPassword, [
    {
      linkToken: "link-token",
      password: "Wrong1!"
    }
  ]);
});

test("POST /auth/google/link links the account and creates session cookies", async (t) => {
  const { baseUrl } = await startAuthRoutesApp(t);

  const response = await request(baseUrl, "/auth/google/link", {
    method: "POST",
    headers: {
      cookie: "mia_google_oauth_link=link-token"
    },
    body: JSON.stringify({
      password: "Password1!"
    })
  });
  const body = await response.json();
  const cookies = getSetCookieHeaders(response.headers);

  assert.equal(response.status, 200);
  assert.equal(body.message, "Google account linked successfully");
  assert.equal(body.redirectTo, "/profile");
  assert.deepEqual(body.user, {
    id: authUser.id,
    email: authUser.email
  });
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_session=access-token")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_refresh=refresh-token")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("mia_google_oauth_link=")));
});
