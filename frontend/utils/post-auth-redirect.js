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

export function sanitizePostAuthRedirect(value) {
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

export function buildLoginLocation(target) {
  const redirect = sanitizePostAuthRedirect(target);

  return redirect ? { path: "/login", query: { redirect } } : "/login";
}

export function buildRegisterLocation(target) {
  const redirect = sanitizePostAuthRedirect(target);

  return redirect ? { path: "/register", query: { redirect } } : "/register";
}

export function resolvePostAuthDestination(requested, serverRedirect, fallback = "/") {
  return (
    sanitizePostAuthRedirect(requested) ||
    sanitizePostAuthRedirect(serverRedirect) ||
    sanitizePostAuthRedirect(fallback) ||
    "/"
  );
}
