import { defineNuxtPlugin, useRuntimeConfig, useState } from "#app";
import { createCoinbaseCdpStub } from "~/utils/coinbase-cdp-stub";
import { loadCoinbaseCdpCore } from "~/utils/coinbase-cdp-sdk";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const projectId = config.public.cdpProjectId;

  if (!projectId) {
    return {
      provide: {
        coinbaseCdp: createCoinbaseCdpStub()
      }
    };
  }

  const pendingWalletId = useState("embedded-wallet:pending-id", () => null);
  let sdkPromise;
  let initializationPromise;

  function loadSdk() {
    sdkPromise ||= loadCoinbaseCdpCore().catch((error) => {
      sdkPromise = undefined;
      throw new Error(
        "Le SDK Coinbase CDP (@coinbase/cdp-core) est introuvable. Executez npm ci dans frontend/ ou reconstruisez l'image Docker frontend.",
        { cause: error }
      );
    });
    return sdkPromise;
  }

  async function ensureInitialized() {
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
        configured: true,
        async createEvmEoaAccount(options) {
          const sdk = await ensureInitialized();
          return sdk.createEvmEoaAccount(options);
        },
        async createEvmKeyExportIframe(options) {
          const sdk = await ensureInitialized();
          return sdk.createEvmKeyExportIframe({
            ...options,
            projectId
          });
        },
        async getCurrentUser(options) {
          const sdk = await ensureInitialized();
          return sdk.getCurrentUser(options);
        },
        async getAccessToken(options) {
          const sdk = await ensureInitialized();
          return sdk.getAccessToken(options);
        },
        initializationError: null,
        load: ensureInitialized
      }
    }
  };
});
