const crypto = require("crypto");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const userRepository = require("../repositories/user.repository");
const { createSession } = require("./session.service");

const GOOGLE_PROVIDER = "google";
const GOOGLE_AUTH_SCOPE = "openid email profile";
const GOOGLE_LINK_TOKEN_EXPIRES_IN = "10m";
const GOOGLE_LINK_COOKIE_MAX_AGE_MS = 1000 * 60 * 10;
const GOOGLE_STATE_COOKIE_MAX_AGE_MS = 1000 * 60 * 10;

class GoogleOAuthError extends Error {
  constructor(message, code = "GOOGLE_OAUTH_ERROR") {
    super(message);
    this.name = "GoogleOAuthError";
    this.code = code;
  }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function buildUsername(profile) {
  if (profile.name) {
    return profile.name;
  }

  return profile.email.split("@")[0];
}

function isGoogleOAuthConfigured() {
  return Boolean(env.googleOAuth.clientId && env.googleOAuth.clientSecret);
}

function assertGoogleOAuthConfigured() {
  if (!isGoogleOAuthConfigured()) {
    throw new GoogleOAuthError(
      "Google OAuth is not configured",
      "GOOGLE_OAUTH_NOT_CONFIGURED",
    );
  }
}

function getGoogleOAuthStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: GOOGLE_STATE_COOKIE_MAX_AGE_MS,
    path: "/",
  };
}

function getClearGoogleOAuthStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/",
  };
}

function getGoogleOAuthLinkCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: GOOGLE_LINK_COOKIE_MAX_AGE_MS,
    path: "/",
  };
}

function getClearGoogleOAuthLinkCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/",
  };
}

function createGoogleOAuthState() {
  return crypto.randomBytes(32).toString("hex");
}

function getGoogleAuthorizationUrl() {
  assertGoogleOAuthConfigured();

  const state = createGoogleOAuthState();
  const authorizationUrl = new URL(env.googleOAuth.authorizationUrl);

  authorizationUrl.searchParams.set("client_id", env.googleOAuth.clientId);
  authorizationUrl.searchParams.set(
    "redirect_uri",
    env.googleOAuth.redirectUri,
  );
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", GOOGLE_AUTH_SCOPE);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("prompt", "select_account");

  return {
    authorizationUrl: authorizationUrl.toString(),
    state,
  };
}

async function exchangeAuthorizationCode(code) {
  assertGoogleOAuthConfigured();

  const response = await fetch(env.googleOAuth.tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.googleOAuth.clientId,
      client_secret: env.googleOAuth.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: env.googleOAuth.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new GoogleOAuthError(
      "Google token exchange failed",
      "GOOGLE_TOKEN_EXCHANGE_FAILED",
    );
  }

  const payload = await response.json();

  if (!payload.access_token) {
    throw new GoogleOAuthError(
      "Google token response is invalid",
      "GOOGLE_TOKEN_RESPONSE_INVALID",
    );
  }

  return payload.access_token;
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch(env.googleOAuth.userInfoUrl, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new GoogleOAuthError(
      "Google profile request failed",
      "GOOGLE_PROFILE_REQUEST_FAILED",
    );
  }

  const payload = await response.json();

  if (!payload.sub || !payload.email || payload.email_verified === false) {
    throw new GoogleOAuthError(
      "Google profile is invalid",
      "GOOGLE_PROFILE_INVALID",
    );
  }

  return {
    email: normalizeEmail(payload.email),
    name: payload.name || "",
    subject: payload.sub,
  };
}

function createGoogleLinkToken({ email, subject, userId }) {
  return jwt.sign(
    {
      type: "google_oauth_link",
      email,
      provider: GOOGLE_PROVIDER,
      subject,
      userId,
    },
    env.jwtSecret,
    {
      expiresIn: GOOGLE_LINK_TOKEN_EXPIRES_IN,
    },
  );
}

function verifyGoogleLinkToken(linkToken) {
  try {
    const payload = jwt.verify(linkToken, env.jwtSecret);

    if (
      payload.type !== "google_oauth_link" ||
      payload.provider !== GOOGLE_PROVIDER
    ) {
      throw new Error("Invalid Google link token");
    }

    return payload;
  } catch (_error) {
    throw new GoogleOAuthError(
      "Google link session is invalid or expired",
      "GOOGLE_LINK_INVALID",
    );
  }
}

async function createAuthenticatedResult(user) {
  return {
    status: "authenticated",
    user,
    ...(await createSession(user)),
  };
}

async function authenticateGoogleProfile(profile) {
  const linkedUser = await userRepository.findByOAuthProvider(
    GOOGLE_PROVIDER,
    profile.subject,
  );

  if (linkedUser) {
    if (!linkedUser.verified || !linkedUser.isActive) {
      throw new GoogleOAuthError(
        "Google account cannot be used",
        "GOOGLE_ACCOUNT_DISABLED",
      );
    }

    return createAuthenticatedResult(linkedUser);
  }

  const existingUser = await userRepository.findByEmail(profile.email);

  if (existingUser) {
    if (existingUser.oauthProvider || existingUser.oauthSubject) {
      throw new GoogleOAuthError(
        "Email is already linked to another OAuth account",
        "GOOGLE_EMAIL_ALREADY_LINKED",
      );
    }

    return {
      status: "requires_password",
      email: existingUser.email,
      linkToken: createGoogleLinkToken({
        email: existingUser.email,
        subject: profile.subject,
        userId: existingUser.id,
      }),
    };
  }

  const createdUser = await userRepository.createOAuthUser({
    username: buildUsername(profile),
    email: profile.email,
    passwordHash: null,
    phone: null,
    createdAt: new Date(),
    verified: true,
    isActive: true,
    oauthProvider: GOOGLE_PROVIDER,
    oauthSubject: profile.subject,
    oauthLinkedAt: new Date(),
  });

  return createAuthenticatedResult(createdUser);
}

async function authenticateGoogleCode(code) {
  const accessToken = await exchangeAuthorizationCode(code);
  const profile = await fetchGoogleProfile(accessToken);

  return authenticateGoogleProfile(profile);
}

async function linkGoogleAccountWithPassword({ linkToken, password }) {
  if (!linkToken || !password) {
    throw new GoogleOAuthError(
      "Google link token and password are required",
      "GOOGLE_LINK_REQUIRED",
    );
  }

  const payload = verifyGoogleLinkToken(linkToken);
  const user = await userRepository.findById(Number(payload.userId));

  if (!user || normalizeEmail(user.email) !== payload.email) {
    throw new GoogleOAuthError(
      "Google link session is invalid or expired",
      "GOOGLE_LINK_INVALID",
    );
  }

  if (
    user.oauthProvider === GOOGLE_PROVIDER &&
    user.oauthSubject === payload.subject
  ) {
    return createAuthenticatedResult(user);
  }

  if (user.oauthProvider || user.oauthSubject || !user.passwordHash) {
    throw new GoogleOAuthError(
      "Google account cannot be linked",
      "GOOGLE_LINK_NOT_ALLOWED",
    );
  }

  const isValidPassword = await argon2.verify(user.passwordHash, password);

  if (!isValidPassword) {
    throw new GoogleOAuthError(
      "Password is incorrect",
      "GOOGLE_LINK_INVALID_PASSWORD",
    );
  }

  const linkedUser = await userRepository.linkOAuthProvider(user.id, {
    oauthProvider: GOOGLE_PROVIDER,
    oauthSubject: payload.subject,
  });

  return createAuthenticatedResult(linkedUser);
}

module.exports = {
  GOOGLE_PROVIDER,
  GoogleOAuthError,
  authenticateGoogleCode,
  authenticateGoogleProfile,
  fetchGoogleProfile,
  getClearGoogleOAuthLinkCookieOptions,
  getClearGoogleOAuthStateCookieOptions,
  getGoogleAuthorizationUrl,
  getGoogleOAuthLinkCookieOptions,
  getGoogleOAuthStateCookieOptions,
  isGoogleOAuthConfigured,
  linkGoogleAccountWithPassword,
};
