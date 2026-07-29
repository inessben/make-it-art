const crypto = require("crypto");
const argon2 = require("argon2");
const env = require("../config/env");
const userRepository = require("../repositories/user.repository");
const loginCodeRepository = require("../repositories/login-verification-code.repository");
const rememberedDeviceRepository = require("../repositories/remembered-device.repository");
const { sendLoginCodeEmail } = require("./mail.service");
const { isExistingPasswordCompromised } = require("./password-security.service");
const { createSession } = require("./session.service");
const {
  assertUserCanAuthenticate,
  isUserAllowedToAuthenticate
} = require("../utils/user-account-status");

const LOGIN_CODE_EXPIRES_MS = 1000 * 60 * 10;
const REMEMBER_DEVICE_EXPIRES_MS = 1000 * 60 * 60 * 24 * 30;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isDefaultAdminBypassUser(email) {
  return env.defaultAdmin.bypassLoginCode && normalizeEmail(env.defaultAdmin.email) === email;
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

async function getCompromisedPasswordStatus(password) {
  try {
    return await isExistingPasswordCompromised(password);
  } catch (_error) {
    return false;
  }
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

  assertUserCanAuthenticate(user);

  if (!user.passwordHash) {
    throw new Error("Invalid credentials");
  }

  const isValidPassword = await argon2.verify(user.passwordHash, password);

  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }

  const passwordCompromised = await getCompromisedPasswordStatus(password);

  if (isDefaultAdminBypassUser(normalizedEmail)) {
    return {
      bypassCode: true,
      passwordCompromised,
      user,
      ...(await createSession(user))
    };
  }

  if (rememberDeviceToken) {
    const rememberedDevice = await rememberedDeviceRepository.findValidDeviceByHash(
      hashValue(rememberDeviceToken)
    );

    if (
      rememberedDevice &&
      rememberedDevice.userId === user.id &&
      isUserAllowedToAuthenticate(rememberedDevice.user)
    ) {
      await rememberedDeviceRepository.updateDeviceExpiry({
        deviceId: rememberedDevice.id,
        expiresAt: new Date(Date.now() + REMEMBER_DEVICE_EXPIRES_MS)
      });

      return {
        bypassCode: true,
        passwordCompromised,
        rememberDeviceToken,
        user,
        ...(await createSession(user))
      };
    }

    // Stale/invalid remember cookie: ask the client to drop it so a fresh one can be issued.
    return {
      bypassCode: false,
      challengeToken: await issueLoginChallenge(user),
      passwordCompromised,
      clearRememberDevice: true
    };
  }

  return {
    bypassCode: false,
    challengeToken: await issueLoginChallenge(user),
    passwordCompromised
  };
}

async function issueLoginChallenge(user) {
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

  return challengeToken;
}

async function verifyLoginCode({ challengeToken, code, rememberDevice, _userAgent }) {
  const codeHash = hashValue(`${challengeToken}:${code}`);

  const loginCode = await loginCodeRepository.findValidCodeByHash({
    userId: undefined,
    codeHash
  });

  if (!loginCode) {
    throw new Error("Invalid or expired login code");
  }

  await loginCodeRepository.markCodeAsUsed(loginCode.id);

  const currentUser = await userRepository.findById(loginCode.user.id);

  if (!currentUser) {
    throw new Error("Invalid or expired login code");
  }

  assertUserCanAuthenticate(currentUser);

  const session = await createSession(currentUser);
  let rememberDeviceToken = null;

  if (rememberDevice) {
    rememberDeviceToken = createRememberDeviceToken();

    await rememberedDeviceRepository.createDevice({
      userId: currentUser.id,
      tokenHash: hashValue(rememberDeviceToken),
      expiresAt: new Date(Date.now() + REMEMBER_DEVICE_EXPIRES_MS)
    });
  }

  return {
    user: currentUser,
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
