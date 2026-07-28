import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildLoginLocation,
  resolvePostAuthDestination,
  sanitizePostAuthRedirect
} from "../utils/post-auth-redirect.js";

describe("post-auth redirect helpers", () => {
  test("accepts internal application paths", () => {
    assert.equal(sanitizePostAuthRedirect("/become-artist"), "/become-artist");
    assert.equal(
      sanitizePostAuthRedirect("/become-artist?source=home#application"),
      "/become-artist?source=home#application"
    );
    assert.equal(sanitizePostAuthRedirect(["/become-artist", "/artworks"]), "/become-artist");
  });

  test("rejects external, ambiguous, and authentication entry paths", () => {
    assert.equal(sanitizePostAuthRedirect("https://example.com"), "");
    assert.equal(sanitizePostAuthRedirect("//example.com"), "");
    assert.equal(sanitizePostAuthRedirect("/\\example.com"), "");
    assert.equal(sanitizePostAuthRedirect("/login?redirect=/become-artist"), "");
    assert.equal(sanitizePostAuthRedirect("/register/"), "");
  });

  test("builds a login location only with a safe destination", () => {
    assert.deepEqual(buildLoginLocation("/become-artist"), {
      path: "/login",
      query: { redirect: "/become-artist" }
    });
    assert.equal(buildLoginLocation("https://example.com"), "/login");
  });

  test("prioritizes the requested page and falls back safely", () => {
    assert.equal(
      resolvePostAuthDestination("/become-artist", "/", "/account-settings"),
      "/become-artist"
    );
    assert.equal(
      resolvePostAuthDestination("https://example.com", "/account-settings", "/"),
      "/account-settings"
    );
    assert.equal(resolvePostAuthDestination("//example.com", "https://example.com"), "/");
  });
});
