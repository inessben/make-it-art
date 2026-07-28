const walletRepository = require("../repositories/wallet.repository");
const cdpAuthService = require("./cdp-auth.service");
const env = require("../config/env");
const CONSENT_VERSION = "embedded-wallet-v1";
const FAILURE_CODES = new Set([
  "CDP_AUTH_FAILED",
  "CDP_CREATION_FAILED",
  "CDP_TIMEOUT",
  "CDP_UNAVAILABLE"
]);
class WalletError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "WalletError";
    this.code = code;
    this.status = status;
  }
}
function assertCreationEnabled() {
  if (!env.cdp.walletFeatureEnabled)
    throw new WalletError(
      "WALLET_FEATURE_DISABLED",
      "New wallet creation is temporarily unavailable",
      503
    );
}
function assertEligible(user) {
  if (!user) throw new WalletError("NOT_AUTHENTICATED", "Not authenticated", 401);
  if (!user.verified || !user.isActive)
    throw new WalletError("EMAIL_NOT_VERIFIED", "Email verification is required", 403);
}
function serialize(wallet) {
  return {
    id: wallet.id,
    address: wallet.address,
    provider: wallet.provider,
    network: wallet.network,
    origin: wallet.origin,
    status: wallet.status,
    lastErrorCode: wallet.lastErrorCode,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt
  };
}
async function owned(userId, walletId) {
  const id = Number(walletId);
  if (!Number.isInteger(id) || id <= 0)
    throw new WalletError("INVALID_WALLET_ID", "Invalid wallet id");
  const wallet = await walletRepository.findByIdForUser(id, userId);
  if (!wallet) throw new WalletError("WALLET_NOT_FOUND", "Wallet not found", 404);
  return wallet;
}
async function recordConsent(user, accepted) {
  assertEligible(user);
  if (accepted === true) assertCreationEnabled();
  const consent = await walletRepository.createConsent({
    userId: user.id,
    accepted: accepted === true,
    consentVersion: CONSENT_VERSION
  });
  return {
    accepted: consent.accepted,
    consentVersion: consent.consentVersion,
    createdAt: consent.createdAt
  };
}
async function startCreation(user, idempotencyKey) {
  assertEligible(user);
  assertCreationEnabled();
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(idempotencyKey || ""))
    throw new WalletError(
      "INVALID_IDEMPOTENCY_KEY",
      "A valid wallet creation idempotency key is required"
    );
  const consent = await walletRepository.findLatestConsent(user.id);
  if (!consent?.accepted || consent.revokedAt)
    throw new WalletError("CONSENT_REQUIRED", "Explicit wallet consent is required", 403);
  const previous = await walletRepository.findByIdempotencyKey(idempotencyKey);
  if (previous) {
    if (previous.userId !== user.id)
      throw new WalletError("IDEMPOTENCY_KEY_CONFLICT", "Idempotency key is already in use", 409);
    return serialize(previous);
  }
  if (await walletRepository.findActiveEmbeddedWallet(user.id))
    throw new WalletError("WALLET_ALREADY_EXISTS", "An active embedded wallet already exists", 409);
  try {
    return serialize(
      await walletRepository.createPending({
        userId: user.id,
        idempotencyKey,
        consentedAt: consent.createdAt
      })
    );
  } catch (error) {
    if (error.code === "P2002") {
      const concurrent = await walletRepository.findByIdempotencyKey(idempotencyKey);
      if (concurrent?.userId === user.id) return serialize(concurrent);
    }
    throw error;
  }
}
async function issueCdpToken(user, walletId) {
  assertEligible(user);
  const wallet = await owned(user.id, walletId);
  if (!["PENDING", "ACTIVE"].includes(wallet.status))
    throw new WalletError("WALLET_AUTH_UNAVAILABLE", "Wallet authentication is not available", 409);
  return { token: cdpAuthService.createUserToken(user), projectId: env.cdp.projectId };
}
async function completeCreation(user, walletId, { accessToken, address }) {
  assertEligible(user);
  const wallet = await owned(user.id, walletId);
  if (wallet.status === "ACTIVE") {
    if (wallet.address?.toLowerCase() === address?.toLowerCase()) return serialize(wallet);
    throw new WalletError("WALLET_ALREADY_ACTIVE", "Wallet is already active", 409);
  }
  if (wallet.status !== "PENDING")
    throw new WalletError("WALLET_NOT_PENDING", "Wallet is not awaiting confirmation", 409);
  if (!accessToken || !/^0x[a-fA-F0-9]{40}$/.test(address || ""))
    throw new WalletError("INVALID_WALLET_RESULT", "A valid Coinbase wallet result is required");
  const validation = await cdpAuthService.validateEndUserAccessToken(accessToken);
  if (!cdpAuthService.resultBelongsToUser(validation, user.id, address))
    throw new WalletError(
      "WALLET_OWNERSHIP_INVALID",
      "Coinbase wallet does not belong to the authenticated user",
      403
    );
  const active = await walletRepository.findActiveEmbeddedWallet(user.id);
  if (active && active.id !== wallet.id)
    throw new WalletError("WALLET_ALREADY_EXISTS", "An active embedded wallet already exists", 409);
  try {
    return serialize(await walletRepository.activate({ id: wallet.id, address }));
  } catch (error) {
    if (error.code === "P2002")
      throw new WalletError("WALLET_ADDRESS_CONFLICT", "Wallet address is already registered", 409);
    throw error;
  }
}
async function markCreationFailed(user, walletId, errorCode) {
  assertEligible(user);
  const wallet = await owned(user.id, walletId);
  if (wallet.status !== "PENDING")
    throw new WalletError("WALLET_NOT_PENDING", "Wallet is not awaiting creation", 409);
  return serialize(
    await walletRepository.markFailed({
      id: wallet.id,
      errorCode: FAILURE_CODES.has(errorCode) ? errorCode : "CDP_CREATION_FAILED"
    })
  );
}
async function retryCreation(user, walletId) {
  assertEligible(user);
  assertCreationEnabled();
  const wallet = await owned(user.id, walletId);
  if (!["FAILED", "RETRY_REQUIRED"].includes(wallet.status))
    throw new WalletError("WALLET_NOT_RETRYABLE", "Wallet creation cannot be retried", 409);
  if (await walletRepository.findActiveEmbeddedWallet(user.id))
    throw new WalletError("WALLET_ALREADY_EXISTS", "An active embedded wallet already exists", 409);
  return serialize(await walletRepository.prepareRetry(wallet.id));
}
async function listWallets(user) {
  assertEligible(user);
  return (await walletRepository.listForUser(user.id)).map(serialize);
}
async function getLatestConsent(user) {
  assertEligible(user);
  const consent = await walletRepository.findLatestConsent(user.id);
  if (!consent) return null;
  return {
    accepted: consent.accepted,
    consentVersion: consent.consentVersion,
    createdAt: consent.createdAt,
    revokedAt: consent.revokedAt
  };
}
module.exports = {
  WalletError,
  completeCreation,
  getLatestConsent,
  issueCdpToken,
  listWallets,
  markCreationFailed,
  recordConsent,
  retryCreation,
  startCreation
};
