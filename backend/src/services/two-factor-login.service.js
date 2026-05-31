const crypto = require("crypto");
const argon2 = require("argon2");
const env = require("../config/env");
const userRepository = require("../repositories/user.repository");
const loginCodeRepository = require("../repositories/login-verification-code.repository");
const rememberedDeviceRepository = require("../repositories/remembered-device.repository");
const { sendLoginCodeEmail } = require("./mail.service");
const { createSession } = require("./session.service");

const LOGIN_CODE_EXPIRES_MS = 1000 * 60 * 10;
const REMEMBER_DEVICE_EXPIRES_MS = 1000 * 60 * 60 * 24 * 30;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createLoginCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function createChallengeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function createRememberDeviceToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getLoginChallengeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: LOGIN_CODE_EXPIRES_MS,
    path: "/"
  };
}

function getClearLoginChallengeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/"
  };
}

function getRememberDeviceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: REMEMBER_DEVICE_EXPIRES_MS,
    path: "/"
  };
}

function getClearRememberDeviceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/"
  };
}

async function startLoginWithCode({ email, password, rememberDeviceToken }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (!user.verified || !user.isActive) {
    throw new Error("Email not verified");
  }

  const isValidPassword = await argon2.verify(user.passwordHash, password);

  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }

  if (rememberDeviceToken) {
    const rememberedDevice = await rememberedDeviceRepository.findValidDeviceByHash(
      hashValue(rememberDeviceToken)
    );

    if (
      rememberedDevice &&
      rememberedDevice.userId === user.id &&
      rememberedDevice.user.verified &&
      rememberedDevice.user.isActive
    ) {
      return {
        bypassCode: true,
        user,
        ...(await createSession(user))
      };
    }
  }

  const code = createLoginCode();
  const challengeToken = createChallengeToken();

  await loginCodeRepository.markUnusedCodesAsUsed(user.id);

  await loginCodeRepository.createCode({
    userId: user.id,
    codeHash: hashValue(`${challengeToken}:${code}`),
    expiresAt: new Date(Date.now() + LOGIN_CODE_EXPIRES_MS)
  });

  await sendLoginCodeEmail({
    to: user.email,
    username: user.username,
    code
  });

  return {
    bypassCode: false,
    challengeToken
  };
}

async function verifyLoginCode({ challengeToken, code, rememberDevice, userAgent }) {
  const codeHash = hashValue(`${challengeToken}:${code}`);

  const loginCode = await loginCodeRepository.findValidCodeByHash({
    userId: undefined,
    codeHash
  });

  if (!loginCode) {
    throw new Error("Invalid or expired login code");
  }

  await loginCodeRepository.markCodeAsUsed(loginCode.id);

  const session = await createSession(loginCode.user);
  let rememberDeviceToken = null;

  if (rememberDevice) {
    rememberDeviceToken = createRememberDeviceToken();

    await rememberedDeviceRepository.createDevice({
      userId: loginCode.user.id,
      tokenHash: hashValue(rememberDeviceToken),
      expiresAt: new Date(Date.now() + REMEMBER_DEVICE_EXPIRES_MS)
    });
  }

  return {
    user: loginCode.user,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    rememberDeviceToken
  };
}

module.exports = {
  startLoginWithCode,
  verifyLoginCode,
  getLoginChallengeCookieOptions,
  getClearLoginChallengeCookieOptions,
  getRememberDeviceCookieOptions,
  getClearRememberDeviceCookieOptions
};
