const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { redis } = require("../lib/redis");
const userRepository = require("../repositories/user.repository");

const ACCESS_TOKEN_MAX_AGE_MS = 1000 * 60 * 15;
const REFRESH_TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const REFRESH_TOKEN_TTL_SECONDS = Math.floor(REFRESH_TOKEN_MAX_AGE_MS / 1000);

function createAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email
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

async function storeRefreshToken(userId, refreshToken) {
  await redis.set(getRefreshTokenKey(refreshToken), String(userId), {
    EX: REFRESH_TOKEN_TTL_SECONDS
  });
}

async function createSession(user) {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken();

  await storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken
  };
}

async function rotateRefreshToken(refreshToken) {
  const refreshTokenKey = getRefreshTokenKey(refreshToken);
  const userId = await redis.get(refreshTokenKey);

  if (!userId) {
    return null;
  }

  await redis.del(refreshTokenKey);

  const user = await userRepository.findById(Number(userId));

  if (!user || !user.verified || !user.isActive) {
    return null;
  }

  return createSession(user);
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

    if (!user || !user.verified || !user.isActive) {
      return null;
    }

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
