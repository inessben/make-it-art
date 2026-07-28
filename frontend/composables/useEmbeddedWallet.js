import { useNuxtApp, useState } from "#app";
import { computed } from "vue";
import {
  createWalletIdempotencyKey,
  getCdpIdempotencyKeys,
  getEvmAddress,
  getWalletFailureCode,
  openSecureWalletExport,
  runWalletPhase,
  WALLET_CREATION_TIMEOUT_MS,
  withTimeout
} from "~/utils/embedded-wallet-creation";

export function useEmbeddedWallet() {
  const { $coinbaseCdp } = useNuxtApp();
  const pendingWalletId = useState("embedded-wallet:pending-id", () => null);
  const status = useState("embedded-wallet:status", () => "idle");
  const errorCode = useState("embedded-wallet:error-code", () => null);
  const wallets = useState("embedded-wallet:wallets", () => []);
  const consent = useState("embedded-wallet:consent", () => null);

  const configured = computed(() => $coinbaseCdp?.configured === true);
  const activeWallet = computed(
    () => wallets.value.find((wallet) => wallet.status === "ACTIVE") || null
  );
  const currentWallet = computed(
    () =>
      activeWallet.value ||
      wallets.value.find((wallet) =>
        ["PENDING", "FAILED", "RETRY_REQUIRED"].includes(wallet.status)
      ) ||
      null
  );

  function setPendingWallet(wallet) {
    pendingWalletId.value = wallet?.id || null;
    status.value = wallet?.status?.toLowerCase() || "idle";
    errorCode.value = wallet?.lastErrorCode || null;
  }

  function replaceWallet(wallet) {
    const index = wallets.value.findIndex((candidate) => candidate.id === wallet.id);
    if (index === -1) wallets.value.unshift(wallet);
    else wallets.value.splice(index, 1, wallet);

    pendingWalletId.value = wallet.status === "ACTIVE" ? null : wallet.id;
    status.value = wallet.status.toLowerCase();
    errorCode.value = wallet.lastErrorCode || null;
  }

  async function refreshWallets() {
    status.value = "loading";
    errorCode.value = null;

    try {
      const response = await $fetch("/api/wallets/me", {
        credentials: "include"
      });
      wallets.value = response.wallets || [];
      consent.value = response.consent || null;
      const current = activeWallet.value || currentWallet.value || wallets.value[0] || null;
      setPendingWallet(current?.status === "ACTIVE" ? null : current);
      status.value = current?.status?.toLowerCase() || "idle";
      return wallets.value;
    } catch (error) {
      status.value = "failed";
      errorCode.value = error?.data?.code || "WALLET_STATUS_UNAVAILABLE";
      throw error;
    }
  }

  function storageKey(userId) {
    return `make-it-art:embedded-wallet:${userId}`;
  }

  function getIdempotencyKey(userId) {
    const key = storageKey(userId);
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = createWalletIdempotencyKey();
    localStorage.setItem(key, created);
    return created;
  }

  async function reportFailure(wallet, error) {
    const code = getWalletFailureCode(error);
    errorCode.value = code;
    status.value = "failed";

    if (!wallet?.id) return;

    try {
      const response = await $fetch(`/api/wallets/${wallet.id}/failure`, {
        method: "POST",
        credentials: "include",
        body: { code }
      });
      replaceWallet(response.wallet);
    } catch {
      await refreshWallets().catch(() => {});
    }
  }

  async function finalizeCreation(wallet, idempotencyKey, userId) {
    setPendingWallet(wallet);
    replaceWallet(wallet);

    const operation = async () => {
      const cdpKeys = getCdpIdempotencyKeys(idempotencyKey);
      const authResult = await runWalletPhase("AUTHENTICATION", () =>
        $coinbaseCdp.authenticateWithJWT({ idempotencyKey: cdpKeys.authentication })
      );
      const cdpUser =
        authResult?.user ||
        (await runWalletPhase("CURRENT_USER", () => $coinbaseCdp.getCurrentUser()));
      const address =
        getEvmAddress(cdpUser) ||
        (await runWalletPhase("EOA_CREATION", () =>
          $coinbaseCdp.createEvmEoaAccount({ idempotencyKey: cdpKeys.evmAccount })
        ));
      const accessToken = await runWalletPhase("ACCESS_TOKEN", () =>
        $coinbaseCdp.getAccessToken({ forceRefresh: true })
      );

      if (!accessToken) {
        const authError = new Error("Coinbase authentication did not return an access token");
        authError.name = "CustomAuthError";
        throw authError;
      }

      return runWalletPhase("BACKEND_CONFIRMATION", () =>
        $fetch(`/api/wallets/${wallet.id}/complete`, {
          method: "POST",
          credentials: "include",
          body: { accessToken, address }
        })
      );
    };

    try {
      const response = await withTimeout(operation(), WALLET_CREATION_TIMEOUT_MS);
      replaceWallet(response.wallet);
      localStorage.removeItem(storageKey(userId));
      return response.wallet;
    } catch (error) {
      await reportFailure(wallet, error);
      throw error;
    }
  }

  async function createWallet(userId) {
    if (!$coinbaseCdp?.configured) {
      const configError = new Error("Coinbase CDP is not configured");
      configError.code = "CDP_UNAVAILABLE";
      throw configError;
    }

    status.value = "pending";
    errorCode.value = null;
    const idempotencyKey = getIdempotencyKey(userId);
    const response = await $fetch("/api/wallets", {
      method: "POST",
      credentials: "include",
      body: { idempotencyKey }
    });
    return finalizeCreation(response.wallet, idempotencyKey, userId);
  }

  async function resumeWallet(wallet, userId) {
    status.value = "pending";
    errorCode.value = null;
    return finalizeCreation(wallet, getIdempotencyKey(userId), userId);
  }

  async function retryWallet(wallet, userId) {
    status.value = "pending";
    errorCode.value = null;
    const idempotencyKey = getIdempotencyKey(userId);
    const response = await $fetch(`/api/wallets/${wallet.id}/retry`, {
      method: "POST",
      credentials: "include"
    });
    return finalizeCreation(response.wallet, idempotencyKey, userId);
  }

  async function createSecureExport(wallet, target, onStatusUpdate) {
    return openSecureWalletExport({
      wallet,
      target,
      authenticate: async (walletId) => {
        pendingWalletId.value = walletId;
        await $coinbaseCdp.authenticateWithJWT();
      },
      createIframe: (options) => $coinbaseCdp.createEvmKeyExportIframe(options),
      onStatusUpdate
    });
  }

  return {
    activeWallet,
    configured,
    consent,
    createSecureExport,
    createWallet,
    currentWallet,
    errorCode,
    pendingWalletId,
    refreshWallets,
    resumeWallet,
    retryWallet,
    setPendingWallet,
    status,
    wallets
  };
}
