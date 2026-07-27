import { defineNuxtPlugin, useRuntimeConfig, useState } from "#app";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const projectId = config.public.cdpProjectId;
  const pendingWalletId = useState("embedded-wallet:pending-id", () => null);
  let sdkPromise;
  let initializationPromise;

  function loadSdk() {
    sdkPromise ||= import("@coinbase/cdp-core");
    return sdkPromise;
  }

  async function ensureInitialized() {
    if (!projectId) {
      throw new Error("Coinbase CDP is not configured");
    }

    initializationPromise ||= loadSdk().then(async ({ initialize }) => {
      await initialize({
        projectId,
        customAuth: {
          async getJwt() {
            if (!pendingWalletId.value) {
              throw new Error("No pending wallet request is available");
            }

            const response = await $fetch(`/api/wallets/${pendingWalletId.value}/cdp-token`, {
              method: "POST",
              credentials: "include"
            });

            return response.token;
          }
        },
        disableAnalytics: true
      });
    });

    try {
      await initializationPromise;
    } catch (error) {
      initializationPromise = undefined;
      throw error;
    }

    return loadSdk();
  }

  return {
    provide: {
      coinbaseCdp: {
        async authenticateWithJWT(options) {
          const sdk = await ensureInitialized();
          return sdk.authenticateWithJWT(options);
        },
        configured: Boolean(projectId),
        async createEvmEoaAccount(options) {
          const sdk = await ensureInitialized();
          return sdk.createEvmEoaAccount(options);
        },
        async getCurrentUser(options) {
          const sdk = await ensureInitialized();
          return sdk.getCurrentUser(options);
        },
        initializationError: null,
        load: ensureInitialized
      }
    }
  };
});
