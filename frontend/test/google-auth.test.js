import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  getGoogleLoginMessage,
  getGoogleLoginUrl,
  GOOGLE_LOGIN_LABEL,
  GOOGLE_LOGIN_URL,
  isGoogleLinkRequired
} from "../utils/google-auth.js";

describe("google auth helpers", () => {
  test("exposes the Google sign-in option label and redirect URL", () => {
    assert.equal(GOOGLE_LOGIN_LABEL, "Se connecter avec Google");
    assert.equal(GOOGLE_LOGIN_URL, "/api/auth/google");
  });

  test("uses the nginx OAuth endpoint when the frontend is opened directly in dev", () => {
    assert.equal(getGoogleLoginUrl("http://localhost:3000"), "http://localhost/api/auth/google");
    assert.equal(getGoogleLoginUrl("http://127.0.0.1:3000"), "http://localhost/api/auth/google");
  });

  test("keeps same-origin OAuth navigation outside the direct frontend dev port", () => {
    assert.equal(getGoogleLoginUrl("http://localhost"), "/api/auth/google");
    assert.equal(getGoogleLoginUrl("https://www.makeitart.io"), "/api/auth/google");
    assert.equal(getGoogleLoginUrl(), "/api/auth/google");
  });

  test("returns a clear message when Google sign-in is cancelled", () => {
    assert.equal(getGoogleLoginMessage("cancelled"), "La connexion Google a ete annulee.");
  });

  test("returns a safe message when Google sign-in fails", () => {
    assert.equal(
      getGoogleLoginMessage("error"),
      "La connexion Google n'a pas abouti. Veuillez reessayer."
    );
  });

  test("returns a clear message when Google sign-in is unavailable", () => {
    assert.equal(
      getGoogleLoginMessage("unavailable"),
      "La connexion Google est temporairement indisponible."
    );
  });

  test("returns no message for unrelated query values", () => {
    assert.equal(getGoogleLoginMessage("anything-else"), "");
  });

  test("detects when Google account linking requires a password", () => {
    assert.equal(isGoogleLinkRequired("required"), true);
    assert.equal(isGoogleLinkRequired(undefined), false);
  });
});
