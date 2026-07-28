export function createCoinbaseCdpStub() {
  function notConfigured() {
    throw new Error("Coinbase CDP is not configured");
  }

  return {
    configured: false,
    initializationError: null,
    load: notConfigured,
    authenticateWithJWT: notConfigured,
    createEvmEoaAccount: notConfigured,
    createEvmKeyExportIframe: notConfigured,
    getCurrentUser: notConfigured,
    getAccessToken: notConfigured
  };
}
