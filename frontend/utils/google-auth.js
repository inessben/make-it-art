import { sanitizePostAuthRedirect } from "./post-auth-redirect.js";

export const GOOGLE_LOGIN_LABEL = "Sign in with Google";
export const GOOGLE_LOGIN_URL = "/api/auth/google";

export function getGoogleLoginUrl(origin = "", requestedRedirect = "") {
  let loginUrl = GOOGLE_LOGIN_URL;

  if (origin) {
    try {
      const url = new URL(origin);

      if ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.port === "3000") {
        loginUrl = "http://localhost" + GOOGLE_LOGIN_URL;
      }
    } catch {
      return GOOGLE_LOGIN_URL;
    }
  }

  const redirect = sanitizePostAuthRedirect(requestedRedirect);

  return redirect ? loginUrl + "?redirect=" + encodeURIComponent(redirect) : loginUrl;
}

export function getGoogleLoginMessage(status) {
  if (status === "cancelled") {
    return "Google sign-in was cancelled.";
  }

  if (status === "unavailable") {
    return "Google sign-in is temporarily unavailable.";
  }

  if (status === "error") {
    return "Google sign-in was unsuccessful. Please try again.";
  }

  return "";
}

export function isGoogleLinkRequired(value) {
  return value === "required";
}
