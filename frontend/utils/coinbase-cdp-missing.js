function unavailable(method) {
  return () => {
    throw new Error(
      `@coinbase/cdp-core is not installed (${method}). Run npm ci in frontend/ or rebuild the Docker frontend image.`
    );
  };
}

export const initialize = unavailable("initialize");
export const authenticateWithJWT = unavailable("authenticateWithJWT");
export const createEvmEoaAccount = unavailable("createEvmEoaAccount");
export const createEvmKeyExportIframe = unavailable("createEvmKeyExportIframe");
export const getCurrentUser = unavailable("getCurrentUser");
export const getAccessToken = unavailable("getAccessToken");
