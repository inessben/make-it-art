const assert = require("node:assert/strict");
const { describe, test } = require("node:test");
const {
  checkPwnedPassword,
  findBreachCount,
  getPasswordHashParts,
  getPwnedPasswordBreachCount,
  PWNED_PASSWORDS_API_URL,
  PWNED_PASSWORDS_USER_AGENT
} = require("../src/services/pwned-password.service");

describe("Pwned Passwords service", () => {
  test("hashes the password with SHA-1 and splits it for k-anonymity", () => {
    assert.deepEqual(getPasswordHashParts("password"), {
      prefix: "5BAA6",
      suffix: "1E4C9B93F3F0682250B6CF8331B7EE68FD8"
    });
  });

  test("sends only the five-character hash prefix with response padding enabled", async () => {
    const request = {};
    const expectedSuffix = getPasswordHashParts("password").suffix;
    const breachCount = await getPwnedPasswordBreachCount("password", {
      fetchImpl: async (url, options) => {
        request.url = url;
        request.options = options;

        return {
          ok: true,
          status: 200,
          text: async () => `00000000000000000000000000000000000:0\r\n${expectedSuffix}:3861493`
        };
      }
    });

    assert.equal(request.url, `${PWNED_PASSWORDS_API_URL}/5BAA6`);
    assert.equal(request.options.headers["Add-Padding"], "true");
    assert.equal(request.options.headers["User-Agent"], PWNED_PASSWORDS_USER_AGENT);
    assert.equal(request.url.includes(getPasswordHashParts("password").suffix), false);
    assert.equal(breachCount, 3861493);
  });

  test("ignores padded zero-count entries and unmatched suffixes", () => {
    assert.equal(findBreachCount("ABC:0\nDEF:42", "ABC"), 0);
    assert.equal(findBreachCount("ABC:4\nDEF:42", "FFF"), 0);
  });

  test("reports API and network failures without exposing an exception", async () => {
    const httpFailure = await checkPwnedPassword("violet gallery river", {
      fetchImpl: async () => ({ ok: false, status: 503 })
    });
    const networkFailure = await checkPwnedPassword("violet gallery river", {
      fetchImpl: async () => {
        throw new Error("network unavailable");
      }
    });

    assert.deepEqual(httpFailure, { available: false, breachCount: 0 });
    assert.deepEqual(networkFailure, { available: false, breachCount: 0 });
  });
});
