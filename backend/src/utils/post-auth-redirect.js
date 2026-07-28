const AUTH_ENTRY_PATHS = new Set([
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password"
]);
const REDIRECT_BASE_URL = "https://make-it-art.local";

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function hasControlCharacters(value) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);

    return codePoint <= 31 || codePoint === 127;
  });
}

function sanitizePostAuthRedirect(value) {
  const candidate = firstQueryValue(value);

  if (typeof candidate !== "string") {
    return "";
  }

  const redirectTo = candidate.trim();

  if (
    !redirectTo.startsWith("/") ||
    redirectTo.startsWith("//") ||
    redirectTo.includes("\\") ||
    hasControlCharacters(redirectTo)
  ) {
    return "";
  }

  try {
    const url = new URL(redirectTo, REDIRECT_BASE_URL);
    const normalizedPath = url.pathname.replace(/\/+$/, "") || "/";

    if (url.origin !== REDIRECT_BASE_URL || AUTH_ENTRY_PATHS.has(normalizedPath)) {
      return "";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

function buildEmailVerificationUrl(appBaseUrl, token, requestedRedirect = "") {
  const url = new URL("/verify-email", appBaseUrl);
  const redirect = sanitizePostAuthRedirect(requestedRedirect);

  url.searchParams.set("token", token);

  if (redirect) {
    url.searchParams.set("redirect", redirect);
  }

  return url.toString();
}

module.exports = { buildEmailVerificationUrl, sanitizePostAuthRedirect };
