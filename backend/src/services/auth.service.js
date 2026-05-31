const userRepository = require("../repositories/user.repository");
const emailVerificationTokenRepository = require("../repositories/email-verification-token.repository");
const { sendVerificationEmail, sendPasswordResetEmail } = require("./mail.service");
const passwordResetTokenRepository = require("../repositories/password-reset-token.repository");
const env = require("../config/env");
const argon2 = require("argon2");
const crypto = require("crypto");

async function loginWithEmail(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    console.log(email, password, normalizedEmail);
    throw new Error("Invalid credentials");
  }
  if (!user.verified || !user.is_active) {
    throw new Error("Email not verified");
  }
  const isValid = await argon2.verify(user.password_hash, password);
  if (!isValid) {
    throw new Error("Invalid credentials.");
  }

  return user;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function sendUserVerificationEmail(user) {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(verificationToken);

  await emailVerificationTokenRepository.markUnusedTokensAsUsed(user.id);

  await emailVerificationTokenRepository.createToken({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60)
  });

  const verificationUrl = `${env.appBaseUrl}/verify-email?token=${verificationToken}`;

  await sendVerificationEmail({
    to: user.email,
    username: user.username,
    verificationUrl
  });
}

async function registerUser({ username, email, phone, password }) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await userRepository.findByEmail(normalizedEmail);

  if (existingUser) {
    throw new Error("Email already in use");
  }

  const passwordHash = await argon2.hash(password);

  const user = await userRepository.createUser({
    username,
    email: normalizedEmail,
    phone,
    password_hash: passwordHash,
    createdAt: new Date(),
    verified: false,
    is_active: false
  });

  await sendUserVerificationEmail(user);

  return user;
}

async function resendVerificationEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.verified && user.is_active) {
    throw new Error("Email already verified");
  }

  await sendUserVerificationEmail(user);

  return user;
}

async function verifyEmail(token) {
  const tokenHash = hashToken(token);
  const verificationToken = await emailVerificationTokenRepository.findValidTokenByHash(tokenHash);

  if (!verificationToken) {
    throw new Error("Invalid or expired verification token");
  }

  await userRepository.verifyEmail(verificationToken.userId);
  await emailVerificationTokenRepository.markTokenAsUsed(verificationToken.id);

  return verificationToken.user;
}
async function requestPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    return null;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(resetToken);

  await passwordResetTokenRepository.markUnusedTokensAsUsed(user.id);

  await passwordResetTokenRepository.createToken({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60)
  });

  const resetUrl = `${env.appBaseUrl}/reset-password?token=${resetToken}`;

  await sendPasswordResetEmail({
    to: user.email,
    username: user.username,
    resetUrl
  });

  return user;
}

async function resetPassword({ token, password }) {
  const tokenHash = hashToken(token);
  const resetToken = await passwordResetTokenRepository.findValidTokenByHash(tokenHash);

  if (!resetToken) {
    throw new Error("Invalid or expired reset token");
  }

  const passwordHash = await argon2.hash(password);

  await userRepository.updatePassword(resetToken.userId, passwordHash);
  await passwordResetTokenRepository.markTokenAsUsed(resetToken.id);

  return resetToken.user;
}

module.exports = {
  loginWithEmail,
  registerUser,
  resendVerificationEmail,
  verifyEmail,
  requestPasswordReset,
  resetPassword
};
