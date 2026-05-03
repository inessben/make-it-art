const jwt = require("jsonwebtoken");
const env = require("../config/env");
const userRepository = require("../repositories/user.repository");

const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

function createSessionToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email
    },
    env.jwtSecret,
    {
      expiresIn: "7d"
    }
  );
}

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: SESSION_MAX_AGE_MS,
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

async function getUserFromRequest(req) {
  const token = req.cookies?.[env.sessionCookieName];

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await userRepository.findById(Number(payload.sub));

    if (!user || !user.verified || !user.is_active) {
      return null;
    }

    return user;
  } catch (_error) {
    return null;
  }
}

module.exports = {
  createSessionToken,
  getSessionCookieOptions,
  getClearSessionCookieOptions,
  getUserFromRequest
};
