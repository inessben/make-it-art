const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { generateJwt } = require("@coinbase/cdp-sdk/auth");
const env = require("../config/env");
const HOST = "api.cdp.coinbase.com";
const PATH = "/platform/v2/end-users/auth/validate-token";
class CdpAuthError extends Error {
  constructor(code, message, status = 503) {
    super(message);
    this.name = "CdpAuthError";
    this.code = code;
    this.status = status;
  }
}
function assertCustomConfig() {
  if (!env.cdp.projectId || !env.cdp.authKeyId || !env.cdp.authPrivateKey)
    throw new CdpAuthError(
      "CDP_CONFIGURATION_MISSING",
      "Coinbase wallet authentication is not configured"
    );
}
function createUserToken(user) {
  assertCustomConfig();
  const options = {
    algorithm: "RS256",
    expiresIn: "5m",
    issuer: env.cdp.authIssuer,
    keyid: env.cdp.authKeyId,
    jwtid: crypto.randomUUID(),
    subject: String(user.id)
  };
  if (env.cdp.authAudience) options.audience = env.cdp.authAudience;
  return jwt.sign(
    { projectId: env.cdp.projectId, emailVerified: user.verified === true },
    env.cdp.authPrivateKey,
    options
  );
}
function getJwks() {
  assertCustomConfig();
  const jwk = crypto.createPublicKey(env.cdp.authPrivateKey).export({ format: "jwk" });
  return { keys: [{ ...jwk, alg: "RS256", kid: env.cdp.authKeyId, use: "sig" }] };
}
async function validateEndUserAccessToken(accessToken) {
  if (!env.cdp.apiKeyId || !env.cdp.apiKeySecret)
    throw new CdpAuthError(
      "CDP_VALIDATION_CONFIGURATION_MISSING",
      "Coinbase token validation is not configured"
    );
  const bearer = await generateJwt({
    apiKeyId: env.cdp.apiKeyId,
    apiKeySecret: env.cdp.apiKeySecret,
    requestMethod: "POST",
    requestHost: HOST,
    requestPath: PATH,
    expiresIn: 120
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.cdp.requestTimeoutMs);
  try {
    const response = await fetch(`https://${HOST}${PATH}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
      signal: controller.signal
    });
    if (!response.ok)
      throw new CdpAuthError(
        response.status === 401 || response.status === 403
          ? "CDP_ACCESS_TOKEN_INVALID"
          : "CDP_VALIDATION_UNAVAILABLE",
        "Coinbase could not validate the wallet",
        response.status === 401 || response.status === 403 ? 401 : 503
      );
    return response.json();
  } catch (error) {
    if (error instanceof CdpAuthError) throw error;
    if (error.name === "AbortError")
      throw new CdpAuthError("CDP_TIMEOUT", "Coinbase validation timed out");
    throw new CdpAuthError("CDP_VALIDATION_UNAVAILABLE", "Coinbase validation is unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
function resultBelongsToUser(result, userId, address) {
  const methods = Array.isArray(result?.authenticationMethods) ? result.authenticationMethods : [];
  const accounts = Array.isArray(result?.evmAccountObjects)
    ? result.evmAccountObjects
    : Array.isArray(result?.evmAccounts)
      ? result.evmAccounts
      : [];
  return (
    methods.some((m) => m?.type === "jwt" && String(m?.sub) === String(userId)) &&
    accounts.some(
      (a) => (typeof a === "string" ? a : a?.address)?.toLowerCase() === address.toLowerCase()
    )
  );
}
module.exports = {
  CdpAuthError,
  createUserToken,
  getJwks,
  resultBelongsToUser,
  validateEndUserAccessToken
};
