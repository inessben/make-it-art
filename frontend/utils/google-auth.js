export const GOOGLE_LOGIN_LABEL = "Sign in with Google";
export const GOOGLE_LOGIN_URL = "/api/auth/google";

export function getGoogleLoginUrl(origin = "") {
  if (!origin) {
    return GOOGLE_LOGIN_URL;
  }

  try {
    const url = new URL(origin);

    if ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.port === "3000") {
      return `http://localhost${GOOGLE_LOGIN_URL}`;
    }
  } catch {
    return GOOGLE_LOGIN_URL;
  }

  return GOOGLE_LOGIN_URL;
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
