export const GOOGLE_LOGIN_LABEL = "Se connecter avec Google";
export const GOOGLE_LOGIN_URL = "/api/auth/google";

export function getGoogleLoginUrl(origin = "") {
  if (!origin) {
    return GOOGLE_LOGIN_URL;
  }

  try {
    const url = new URL(origin);

    if (
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.port === "3000"
    ) {
      return `http://localhost${GOOGLE_LOGIN_URL}`;
    }
  } catch {
    return GOOGLE_LOGIN_URL;
  }

  return GOOGLE_LOGIN_URL;
}

export function getGoogleLoginMessage(status) {
  if (status === "cancelled") {
    return "La connexion Google a ete annulee.";
  }

  if (status === "unavailable") {
    return "La connexion Google est temporairement indisponible.";
  }

  if (status === "error") {
    return "La connexion Google n'a pas abouti. Veuillez reessayer.";
  }

  return "";
}

export function isGoogleLinkRequired(value) {
  return value === "required";
}
