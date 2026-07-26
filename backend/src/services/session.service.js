const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { redis } = require("../lib/redis");
const userRepository = require("../repositories/user.repository");
const { isUserAllowedToAuthenticate } = require("../utils/user-account-status");

const ACCESS_TOKEN_MAX_AGE_MS = 1000 * 60 * 15;
const REFRESH_TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const REFRESH_TOKEN_TTL_SECONDS = Math.floor(REFRESH_TOKEN_MAX_AGE_MS / 1000);

function createAccessToken(user, authenticatedAt) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      auth_time: Math.floor(authenticatedAt.getTime() / 1000)
    },
    env.jwtSecret,
    {
      expiresIn: "15m"
    }
  );
}

function createRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getRefreshTokenKey(token) {
  return `refresh_token:${hashToken(token)}`;
}

async function storeRefreshToken(userId, refreshToken, authenticatedAt) {
  await redis.set(
    getRefreshTokenKey(refreshToken),
    JSON.stringify({ userId, authTime: authenticatedAt.toISOString() }),
    {
      EX: REFRESH_TOKEN_TTL_SECONDS
    }
  );
}

async function createSession(user, { authenticatedAt = new Date() } = {}) {
  const accessToken = createAccessToken(user, authenticatedAt);
  const refreshToken = createRefreshToken();

  await storeRefreshToken(user.id, refreshToken, authenticatedAt);

  return {
    accessToken,
    refreshToken
  };
}

async function rotateRefreshToken(refreshToken) {
  const refreshTokenKey = getRefreshTokenKey(refreshToken);
  const storedSession = await redis.get(refreshTokenKey);

  if (!storedSession) {
    return null;
  }

  await redis.del(refreshTokenKey);

  let session;
  try {
    session = JSON.parse(storedSession);
  } catch (_error) {
    session = { userId: Number(storedSession), authTime: null };
  }
  const user = await userRepository.findById(Number(session.userId));

  if (!isUserAllowedToAuthenticate(user)) {
    return null;
  }

  const authenticatedAt = session.authTime ? new Date(session.authTime) : new Date(0);
  return createSession(user, { authenticatedAt });
}

async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) {
    return;
  }

  await redis.del(getRefreshTokenKey(refreshToken));
}

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: "/"
  };
}

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: "/"
  };
}

function getClearSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/"
  };
}

function getClearRefreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/"
  };
}

async function getUserFromRequest(req) {
  const token = req.cookies?.[env.sessionCookieName];

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await userRepository.findById(Number(payload.sub));

    if (!isUserAllowedToAuthenticate(user)) {
      return null;
    }

    Object.defineProperty(user, "sessionAuthenticatedAt", {
      value: new Date(payload.auth_time * 1000),
      enumerable: false
    });
    return user;
  } catch (_error) {
    return null;
  }
}

module.exports = {
  createSession,
  rotateRefreshToken,
  revokeRefreshToken,
  getSessionCookieOptions,
  getRefreshCookieOptions,
  getClearSessionCookieOptions,
  getClearRefreshCookieOptions,
  getUserFromRequest
};
