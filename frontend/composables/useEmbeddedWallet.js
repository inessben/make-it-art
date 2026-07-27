import { useNuxtApp, useState } from "#app";
import { computed } from "vue";

export function useEmbeddedWallet() {
  const { $coinbaseCdp } = useNuxtApp();
  const pendingWalletId = useState("embedded-wallet:pending-id", () => null);
  const status = useState("embedded-wallet:status", () => "idle");
  const errorCode = useState("embedded-wallet:error-code", () => null);
  const wallets = useState("embedded-wallet:wallets", () => []);

  const configured = computed(() => $coinbaseCdp?.configured === true);
  const activeWallet = computed(
    () => wallets.value.find((wallet) => wallet.status === "ACTIVE") || null
  );

  function setPendingWallet(wallet) {
    pendingWalletId.value = wallet?.id || null;
    status.value = wallet?.status?.toLowerCase() || "idle";
    errorCode.value = wallet?.lastErrorCode || null;
  }

  async function refreshWallets() {
    status.value = "loading";
    errorCode.value = null;

    try {
      const response = await $fetch("/api/wallets/me", {
        credentials: "include"
      });
      wallets.value = response.wallets || [];
      const current = activeWallet.value || wallets.value[0] || null;
      status.value = current?.status?.toLowerCase() || "idle";
      return wallets.value;
    } catch (error) {
      status.value = "failed";
      errorCode.value = error?.data?.code || "WALLET_STATUS_UNAVAILABLE";
      throw error;
    }
  }

  return {
    activeWallet,
    configured,
    errorCode,
    pendingWalletId,
    refreshWallets,
    setPendingWallet,
    status,
    wallets
  };
}
