const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { test } = require("node:test");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const servicePath = require.resolve("../src/services/google-oauth.service");
const envPath = require.resolve("../src/config/env");
const userRepositoryPath = require.resolve("../src/repositories/user.repository");
const sessionServicePath = require.resolve("../src/services/session.service");
const argon2Path = require.resolve("argon2");

const env = {
  nodeEnv: "test",
  jwtSecret: "test-jwt-secret",
  googleOAuth: {
    authorizationUrl: "https://accounts.google.test/o/oauth2/v2/auth",
    clientId: "google-client-id",
    clientSecret: "google-client-secret",
    redirectUri: "http://localhost/api/auth/google/callback",
    tokenUrl: "https://oauth2.google.test/token",
    userInfoUrl: "https://openidconnect.google.test/userinfo",
    stateCookieName: "mia_google_oauth_state",
    linkCookieName: "mia_google_oauth_link"
  }
};

const passwordUser = {
  id: 42,
  email: "artist@example.com",
  username: "Ada",
  passwordHash: "password-hash",
  verified: true,
  isActive: true
};

const googleProfile = {
  email: "artist@example.com",
  name: "Ada Lovelace",
  subject: "google-subject"
};

function loadService(overrides = {}) {
  const calls = {
    createOAuthUser: [],
    createSession: [],
    findByEmail: [],
    findById: [],
    findByOAuthProvider: [],
    linkOAuthProvider: [],
    verifyPassword: []
  };

  const session = {
    accessToken: "access-token",
    refreshToken: "refresh-token"
  };

  const modules = {
    [envPath]: {
      ...env,
      ...(overrides.env || {}),
      googleOAuth: {
        ...env.googleOAuth,
        ...(overrides.env?.googleOAuth || {})
      }
    },
    [userRepositoryPath]: {
      async findByOAuthProvider(provider, subject) {
        calls.findByOAuthProvider.push({ provider, subject });
        return overrides.linkedUser || null;
      },
      async findByEmail(email) {
        calls.findByEmail.push(email);
        return Object.prototype.hasOwnProperty.call(overrides, "emailUser")
          ? overrides.emailUser
          : null;
      },
      async createOAuthUser(payload) {
        calls.createOAuthUser.push(payload);
        return {
          id: 99,
          ...payload
        };
      },
      async findById(id) {
        calls.findById.push(id);
        return Object.prototype.hasOwnProperty.call(overrides, "userById")
          ? overrides.userById
          : passwordUser;
      },
      async linkOAuthProvider(userId, payload) {
        calls.linkOAuthProvider.push({ userId, payload });
        return {
          ...passwordUser,
          ...payload
        };
      }
    },
    [sessionServicePath]: {
      async createSession(user) {
        calls.createSession.push(user);
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

test("getGoogleAuthorizationUrl builds a Google OAuth URL with state", (t) => {
  t.mock.method(crypto, "randomBytes", (size) => Buffer.alloc(size, 5));

  const { restore, service } = loadService();
  t.after(restore);

  const result = service.getGoogleAuthorizationUrl();
  const authorizationUrl = new URL(result.authorizationUrl);

  assert.equal(result.state, "05".repeat(32));
  assert.equal(
    authorizationUrl.origin + authorizationUrl.pathname,
    env.googleOAuth.authorizationUrl
  );
  assert.equal(authorizationUrl.searchParams.get("client_id"), env.googleOAuth.clientId);
  assert.equal(authorizationUrl.searchParams.get("redirect_uri"), env.googleOAuth.redirectUri);
  assert.equal(authorizationUrl.searchParams.get("response_type"), "code");
  assert.equal(authorizationUrl.searchParams.get("scope"), "openid email profile");
  assert.equal(authorizationUrl.searchParams.get("state"), result.state);
});

test("getGoogleAuthorizationUrl rejects missing Google configuration", (t) => {
  const { restore, service } = loadService({
    env: {
      googleOAuth: {
        clientId: "",
        clientSecret: ""
      }
    }
  });
  t.after(restore);

  assert.throws(() => service.getGoogleAuthorizationUrl(), {
    code: "GOOGLE_OAUTH_NOT_CONFIGURED"
  });
});

test("Google OAuth temporary cookie options use expected security defaults", (t) => {
  const { restore, service } = loadService({
    env: {
      nodeEnv: "production"
    }
  });
  t.after(restore);

  assert.deepEqual(service.getGoogleOAuthStateCookieOptions(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 1000 * 60 * 10,
    path: "/"
  });
  assert.deepEqual(service.getClearGoogleOAuthStateCookieOptions(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/"
  });
  assert.deepEqual(service.getGoogleOAuthLinkCookieOptions(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 1000 * 60 * 10,
    path: "/"
  });
  assert.deepEqual(service.getClearGoogleOAuthLinkCookieOptions(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/"
  });
});

test("authenticateGoogleProfile logs in a user already linked to Google", async (t) => {
  const linkedUser = {
    ...passwordUser,
    oauthProvider: "google",
    oauthSubject: googleProfile.subject
  };
  const { calls, restore, service } = loadService({ linkedUser });
  t.after(restore);

  const result = await service.authenticateGoogleProfile(googleProfile);

  assert.equal(result.status, "authenticated");
  assert.equal(result.user, linkedUser);
  assert.equal(result.accessToken, "access-token");
  assert.deepEqual(calls.findByOAuthProvider, [
    {
      provider: "google",
      subject: googleProfile.subject
    }
  ]);
  assert.deepEqual(calls.findByEmail, []);
});

test("authenticateGoogleProfile rejects disabled linked users", async (t) => {
  const { restore, service } = loadService({
    linkedUser: {
      ...passwordUser,
      isActive: false,
      oauthProvider: "google",
      oauthSubject: googleProfile.subject
    }
  });
  t.after(restore);

  await assert.rejects(() => service.authenticateGoogleProfile(googleProfile), {
    code: "GOOGLE_ACCOUNT_DISABLED"
  });
});

test("authenticateGoogleProfile asks for password when email exists but is not linked", async (t) => {
  const { restore, service } = loadService({ emailUser: passwordUser });
  t.after(restore);

  const result = await service.authenticateGoogleProfile(googleProfile);
  const payload = jwt.verify(result.linkToken, env.jwtSecret);

  assert.equal(result.status, "requires_password");
  assert.equal(result.email, passwordUser.email);
  assert.equal(payload.userId, passwordUser.id);
  assert.equal(payload.email, passwordUser.email);
  assert.equal(payload.provider, "google");
  assert.equal(payload.subject, googleProfile.subject);
});

test("authenticateGoogleProfile rejects emails already linked to another OAuth account", async (t) => {
  const { restore, service } = loadService({
    emailUser: {
      ...passwordUser,
      oauthProvider: "google",
      oauthSubject: "another-google-subject"
    }
  });
  t.after(restore);

  await assert.rejects(() => service.authenticateGoogleProfile(googleProfile), {
    code: "GOOGLE_EMAIL_ALREADY_LINKED"
  });
});

test("authenticateGoogleProfile creates a verified active account when email does not exist", async (t) => {
  const { calls, restore, service } = loadService();
  t.after(restore);

  const result = await service.authenticateGoogleProfile(googleProfile);

  assert.equal(result.status, "authenticated");
  assert.equal(result.user.email, googleProfile.email);
  assert.equal(result.user.username, googleProfile.name);
  assert.equal(result.user.verified, true);
  assert.equal(result.user.isActive, true);
  assert.equal(result.user.oauthProvider, "google");
  assert.equal(result.user.oauthSubject, googleProfile.subject);
  assert.equal(calls.createOAuthUser.length, 1);
  assert.equal(calls.createSession.length, 1);
});

test("authenticateGoogleProfile falls back to the email prefix when Google name is absent", async (t) => {
  const { calls, restore, service } = loadService();
  t.after(restore);

  await service.authenticateGoogleProfile({
    ...googleProfile,
    name: ""
  });

  assert.equal(calls.createOAuthUser[0].username, "artist");
});

test("linkGoogleAccountWithPassword links an existing account after a valid password", async (t) => {
  const { calls, restore, service } = loadService({ emailUser: passwordUser });
  t.after(restore);

  const pending = await service.authenticateGoogleProfile(googleProfile);
  const result = await service.linkGoogleAccountWithPassword({
    linkToken: pending.linkToken,
    password: "Password1!"
  });

  assert.equal(result.status, "authenticated");
  assert.deepEqual(calls.verifyPassword, [
    {
      passwordHash: passwordUser.passwordHash,
      password: "Password1!"
    }
  ]);
  assert.deepEqual(calls.linkOAuthProvider, [
    {
      userId: passwordUser.id,
      payload: {
        oauthProvider: "google",
        oauthSubject: googleProfile.subject
      }
    }
  ]);
});

test("linkGoogleAccountWithPassword rejects missing link data", async (t) => {
  const { restore, service } = loadService();
  t.after(restore);

  await assert.rejects(
    () =>
      service.linkGoogleAccountWithPassword({
        linkToken: "",
        password: ""
      }),
    {
      code: "GOOGLE_LINK_REQUIRED"
    }
  );
});

test("linkGoogleAccountWithPassword does not link when password is invalid", async (t) => {
  const { calls, restore, service } = loadService({
    emailUser: passwordUser,
    isValidPassword: false
  });
  t.after(restore);

  const pending = await service.authenticateGoogleProfile(googleProfile);

  await assert.rejects(
    () =>
      service.linkGoogleAccountWithPassword({
        linkToken: pending.linkToken,
        password: "Wrong1!"
      }),
    {
      code: "GOOGLE_LINK_INVALID_PASSWORD"
    }
  );

  assert.deepEqual(calls.linkOAuthProvider, []);
});

test("linkGoogleAccountWithPassword rejects invalid or expired link tokens", async (t) => {
  const { restore, service } = loadService();
  t.after(restore);

  await assert.rejects(
    () =>
      service.linkGoogleAccountWithPassword({
        linkToken: "not-a-valid-jwt",
        password: "Password1!"
      }),
    {
      code: "GOOGLE_LINK_INVALID"
    }
  );
});

test("linkGoogleAccountWithPassword logs in when the account is already linked", async (t) => {
  const { calls, restore, service } = loadService({
    emailUser: passwordUser,
    userById: {
      ...passwordUser,
      oauthProvider: "google",
      oauthSubject: googleProfile.subject
    }
  });
  t.after(restore);

  const pending = await service.authenticateGoogleProfile(googleProfile);
  const result = await service.linkGoogleAccountWithPassword({
    linkToken: pending.linkToken,
    password: "Password1!"
  });

  assert.equal(result.status, "authenticated");
  assert.deepEqual(calls.verifyPassword, []);
  assert.deepEqual(calls.linkOAuthProvider, []);
});

test("linkGoogleAccountWithPassword refuses accounts that cannot verify a password", async (t) => {
  const { restore, service } = loadService({
    emailUser: passwordUser,
    userById: {
      ...passwordUser,
      passwordHash: null
    }
  });
  t.after(restore);

  const pending = await service.authenticateGoogleProfile(googleProfile);

  await assert.rejects(
    () =>
      service.linkGoogleAccountWithPassword({
        linkToken: pending.linkToken,
        password: "Password1!"
      }),
    {
      code: "GOOGLE_LINK_NOT_ALLOWED"
    }
  );
});

test("authenticateGoogleCode exchanges the code and reads the Google profile", async (t) => {
  const fetchCalls = [];

  t.mock.method(globalThis, "fetch", async (url, options) => {
    fetchCalls.push({ url, options });

    if (url === env.googleOAuth.tokenUrl) {
      return Response.json({
        access_token: "google-access-token"
      });
    }

    return Response.json({
      sub: googleProfile.subject,
      email: "Artist@Example.com",
      email_verified: true,
      name: googleProfile.name
    });
  });

  const { restore, service } = loadService();
  t.after(restore);

  const result = await service.authenticateGoogleCode("authorization-code");

  assert.equal(result.status, "authenticated");
  assert.equal(fetchCalls[0].url, env.googleOAuth.tokenUrl);
  assert.equal(fetchCalls[1].url, env.googleOAuth.userInfoUrl);
  assert.equal(fetchCalls[1].options.headers.authorization, "Bearer google-access-token");
});

test("authenticateGoogleCode rejects invalid token and profile responses", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url === env.googleOAuth.tokenUrl) {
      return Response.json({});
    }

    return Response.json({});
  });

  const { restore, service } = loadService();
  t.after(restore);

  await assert.rejects(() => service.authenticateGoogleCode("authorization-code"), {
    code: "GOOGLE_TOKEN_RESPONSE_INVALID"
  });
});

test("fetchGoogleProfile rejects unverified Google emails", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      sub: googleProfile.subject,
      email: googleProfile.email,
      email_verified: false,
      name: googleProfile.name
    })
  );

  const { restore, service } = loadService();
  t.after(restore);

  await assert.rejects(() => service.fetchGoogleProfile("google-access-token"), {
    code: "GOOGLE_PROFILE_INVALID"
  });
});
