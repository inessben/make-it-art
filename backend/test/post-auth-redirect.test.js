const assert = require("node:assert/strict");
const { describe, test } = require("node:test");
const { sanitizePostAuthRedirect } = require("../src/utils/post-auth-redirect");

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
