const assert = require("node:assert/strict");
const { describe, test } = require("node:test");
const {
  isExistingPasswordCompromised,
  PWNED_PASSWORD_MESSAGE,
  PWNED_PASSWORDS_UNAVAILABLE_MESSAGE,
  validateNewPassword
} = require("../src/services/password-security.service");

describe("new password security validation", () => {
  test("does not call Pwned Passwords when local validation already fails", async () => {
    let checkerCalls = 0;
    const result = await validateNewPassword("abcabcabcabcabc", {
      pwnedPasswordChecker: async () => {
        checkerCalls += 1;
        return { available: true, breachCount: 0 };
      }
    });

    assert.deepEqual(result, {
      message: "Choose a less predictable password.",
      status: 400
    });
    assert.equal(checkerCalls, 0);
  });

  test("rejects passwords returned by the breach corpus", async () => {
    const result = await validateNewPassword("violet gallery river", {
      pwnedPasswordChecker: async () => ({ available: true, breachCount: 12 })
    });

    assert.deepEqual(result, {
      message: PWNED_PASSWORD_MESSAGE,
      status: 400
    });
  });

  test("fails closed with 503 when the breach check is unavailable", async () => {
    const result = await validateNewPassword("violet gallery river", {
      pwnedPasswordChecker: async () => ({ available: false, breachCount: 0 })
    });

    assert.deepEqual(result, {
      message: PWNED_PASSWORDS_UNAVAILABLE_MESSAGE,
      status: 503
    });
  });

  test("accepts a strong password absent from the breach corpus", async () => {
    const result = await validateNewPassword("violet gallery river", {
      pwnedPasswordChecker: async () => ({ available: true, breachCount: 0 })
    });

    assert.equal(result, null);
  });
});

describe("existing password breach warning", () => {
  test("reports a compromised password when HIBP returns matches", async () => {
    const compromised = await isExistingPasswordCompromised("existing password", {
      pwnedPasswordChecker: async () => ({ available: true, breachCount: 42 })
    });

    assert.equal(compromised, true);
  });

  test("does not block login when HIBP is unavailable or throws", async () => {
    const unavailable = await isExistingPasswordCompromised("existing password", {
      pwnedPasswordChecker: async () => ({ available: false, breachCount: 0 })
    });
    const failed = await isExistingPasswordCompromised("existing password", {
      pwnedPasswordChecker: async () => {
        throw new Error("network unavailable");
      }
    });

    assert.equal(unavailable, false);
    assert.equal(failed, false);
  });
});
