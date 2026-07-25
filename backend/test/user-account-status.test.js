const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  AccountAccessError,
  USER_ACCOUNT_ERROR_CODES,
  USER_ACCOUNT_STATUS,
  assertUserCanAuthenticate,
  getUserAccountStatus,
  getUserAccountStatusLabel,
  isUserAllowedToAuthenticate
} = require("../src/utils/user-account-status");

test("getUserAccountStatus resolves every supported account state", () => {
  assert.equal(
    getUserAccountStatus({
      verified: true,
      isActive: true,
      blockedAt: null
    }),
    USER_ACCOUNT_STATUS.ACTIVE
  );
  assert.equal(
    getUserAccountStatus({
      verified: false,
      isActive: false,
      blockedAt: null
    }),
    USER_ACCOUNT_STATUS.PENDING_VERIFICATION
  );
  assert.equal(
    getUserAccountStatus({
      verified: true,
      isActive: false,
      blockedAt: null
    }),
    USER_ACCOUNT_STATUS.SUSPENDED
  );
  assert.equal(
    getUserAccountStatus({
      verified: true,
      isActive: false,
      blockedAt: new Date("2026-07-25T18:00:00.000Z")
    }),
    USER_ACCOUNT_STATUS.BLOCKED
  );
});

test("assertUserCanAuthenticate throws the right access error", () => {
  assert.throws(
    () =>
      assertUserCanAuthenticate({
        verified: false,
        isActive: false,
        blockedAt: null
      }),
    (error) => {
      assert.ok(error instanceof AccountAccessError);
      assert.equal(error.code, USER_ACCOUNT_ERROR_CODES.EMAIL_NOT_VERIFIED);
      return true;
    }
  );

  assert.throws(
    () =>
      assertUserCanAuthenticate({
        verified: true,
        isActive: false,
        blockedAt: null
      }),
    (error) => {
      assert.equal(error.code, USER_ACCOUNT_ERROR_CODES.ACCOUNT_SUSPENDED);
      return true;
    }
  );

  assert.throws(
    () =>
      assertUserCanAuthenticate({
        verified: true,
        isActive: false,
        blockedAt: new Date("2026-07-25T18:00:00.000Z")
      }),
    (error) => {
      assert.equal(error.code, USER_ACCOUNT_ERROR_CODES.ACCOUNT_BLOCKED);
      return true;
    }
  );
});

test("user account labels and auth helper stay aligned", () => {
  const activeUser = {
    verified: true,
    isActive: true,
    blockedAt: null
  };

  assert.equal(getUserAccountStatusLabel(activeUser), "Active");
  assert.equal(isUserAllowedToAuthenticate(activeUser), true);
});
