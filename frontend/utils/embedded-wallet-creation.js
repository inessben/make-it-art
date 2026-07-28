export const WALLET_CREATION_TIMEOUT_MS = 30_000;
export const BASESCAN_ADDRESS_URL = "https://basescan.org/address";

export class WalletCreationTimeoutError extends Error {
  constructor() {
    super("Wallet creation timed out");
    this.name = "WalletCreationTimeoutError";
    this.code = "CDP_TIMEOUT";
  }
}

export function createWalletIdempotencyKey(randomUUID = () => crypto.randomUUID()) {
  return `wallet_${randomUUID().replaceAll("-", "")}`;
}

export function getCdpIdempotencyKeys(walletKey) {
  return {
    authentication: walletKey,
    evmAccount: `${walletKey}_eoa`
  };
}

export function getWalletDiagnosticCode(error) {
  const code =
    error?.data?.code ||
    error?.errorType ||
    error?.code ||
    (error?.statusCode ? `HTTP_${error.statusCode}` : null) ||
    error?.name ||
    "UNKNOWN_ERROR";
  const detail = String(error?.message || "")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, "[redacted]")
    .slice(0, 160);

  return [error?.walletPhase, code, detail].filter(Boolean).join(": ");
}

export async function runWalletPhase(phase, operation) {
  try {
    return await operation();
  } catch (error) {
    error.walletPhase = phase;
    throw error;
  }
}

export function getEvmAddress(user) {
  const account = user?.evmAccountObjects?.[0];
  return account?.address || user?.evmAccounts?.[0] || null;
}

export function formatWalletAddress(address, start = 6, end = 4) {
  if (!address || address.length <= start + end) return address || "";
  return `${address.slice(0, start)}…${address.slice(-end)}`;
}

export function getBaseScanAddressUrl(address) {
  return address ? `${BASESCAN_ADDRESS_URL}/${encodeURIComponent(address)}` : null;
}

export async function copyWalletAddress(address, clipboard = navigator.clipboard) {
  if (!address) return false;
  await clipboard.writeText(address);
  return true;
}

export async function openSecureWalletExport({
  wallet,
  target,
  authenticate,
  createIframe,
  onStatusUpdate
}) {
  if (!wallet?.id || !wallet?.address || wallet.status !== "ACTIVE") {
    throw new Error("An active wallet is required for secure export");
  }
  if (!target) throw new Error("A secure export target is required");

  await authenticate(wallet.id);
  return createIframe({
    address: wallet.address,
    target,
    label: "Copy private key securely",
    copiedLabel: "Private key copied",
    fullWidth: true,
    theme: {
      buttonBg: "#4A6CF7",
      buttonBgHover: "#6D8BFF",
      buttonBgPressed: "#3653C9",
      buttonText: "#01050E",
      buttonBorderRadius: 16
    },
    onStatusUpdate
  });
}

export function getWalletStatusLabel(status) {
  return (
    {
      ACTIVE: "Active",
      DETACHED: "Detached",
      FAILED: "Failed",
      PENDING: "Creation in progress",
      RETRY_REQUIRED: "Retry required",
      UNVERIFIED: "Email verification required"
    }[status] || "Not created"
  );
}

export function getWalletFailureCode(error) {
  if (error?.statusCode === 429 || error?.data?.code === "WALLET_RATE_LIMITED") {
    return "WALLET_RATE_LIMITED";
  }

  if (
    error?.code === "CDP_TIMEOUT" ||
    error?.name === "WalletCreationTimeoutError" ||
    error?.data?.code === "CDP_TIMEOUT"
  ) {
    return "CDP_TIMEOUT";
  }

  if (
    error?.code === "CDP_UNAVAILABLE" ||
    error?.data?.code === "CDP_CONFIGURATION_MISSING" ||
    error?.data?.code === "CDP_VALIDATION_CONFIGURATION_MISSING"
  ) {
    return "CDP_UNAVAILABLE";
  }

  if (
    error?.name === "CustomAuthError" ||
    error?.data?.code === "CDP_ACCESS_TOKEN_INVALID" ||
    error?.data?.code === "WALLET_OWNERSHIP_INVALID"
  ) {
    return "CDP_AUTH_FAILED";
  }

  return "CDP_CREATION_FAILED";
}

export function withTimeout(promise, timeoutMs = WALLET_CREATION_TIMEOUT_MS) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new WalletCreationTimeoutError()), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}
