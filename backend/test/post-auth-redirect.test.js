const assert = require("node:assert/strict");
const { describe, test } = require("node:test");
const {
  buildEmailVerificationUrl,
  sanitizePostAuthRedirect
} = require("../src/utils/post-auth-redirect");

describe("post-auth redirect validation", () => {
  test("accepts internal paths and keeps their query and hash", () => {
    assert.equal(sanitizePostAuthRedirect("/become-artist"), "/become-artist");
    assert.equal(
      sanitizePostAuthRedirect("/become-artist?source=home#application"),
      "/become-artist?source=home#application"
    );
  });

  test("rejects unsafe and authentication entry paths", () => {
    assert.equal(sanitizePostAuthRedirect("https://example.com"), "");
    assert.equal(sanitizePostAuthRedirect("//example.com"), "");
    assert.equal(sanitizePostAuthRedirect("/\\example.com"), "");
    assert.equal(sanitizePostAuthRedirect("/login?redirect=/become-artist"), "");
    assert.equal(sanitizePostAuthRedirect("/register/"), "");
  });
});

describe("email verification redirect", () => {
  test("adds a safe requested page only when the registration supplied one", () => {
    const directUrl = new URL(buildEmailVerificationUrl("https://www.makeitart.io", "token-value"));
    const artistUrl = new URL(
      buildEmailVerificationUrl("https://www.makeitart.io", "token-value", "/become-artist")
    );
    const unsafeUrl = new URL(
      buildEmailVerificationUrl("https://www.makeitart.io", "token-value", "https://example.com")
    );

    assert.equal(directUrl.pathname, "/verify-email");
    assert.equal(directUrl.searchParams.get("token"), "token-value");
    assert.equal(directUrl.searchParams.has("redirect"), false);
    assert.equal(artistUrl.searchParams.get("redirect"), "/become-artist");
    assert.equal(unsafeUrl.searchParams.has("redirect"), false);
  });
});
