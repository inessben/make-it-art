const USER_ACCOUNT_STATUS = {
  ACTIVE: "active",
  PENDING_VERIFICATION: "pending_verification",
  SUSPENDED: "suspended",
  BLOCKED: "blocked"
};

const USER_ACCOUNT_STATUS_LABELS = {
  [USER_ACCOUNT_STATUS.ACTIVE]: "Active",
  [USER_ACCOUNT_STATUS.PENDING_VERIFICATION]: "Pending verification",
  [USER_ACCOUNT_STATUS.SUSPENDED]: "Suspended",
  [USER_ACCOUNT_STATUS.BLOCKED]: "Blocked"
};

const USER_ACCOUNT_ERROR_CODES = {
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  ACCOUNT_BLOCKED: "ACCOUNT_BLOCKED"
};

class AccountAccessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AccountAccessError";
    this.code = code;
  }
}

function getUserAccountStatus(user) {
  if (user?.blockedAt) {
    return USER_ACCOUNT_STATUS.BLOCKED;
  }

  if (!user?.verified) {
    return USER_ACCOUNT_STATUS.PENDING_VERIFICATION;
  }

  if (!user?.isActive) {
    return USER_ACCOUNT_STATUS.SUSPENDED;
  }

  return USER_ACCOUNT_STATUS.ACTIVE;
}

function getUserAccountStatusLabel(user) {
  return USER_ACCOUNT_STATUS_LABELS[getUserAccountStatus(user)] || "Unknown";
}

function getUserAccountAccessError(user) {
  if (!user) {
    return null;
  }

  const status = getUserAccountStatus(user);

  if (status === USER_ACCOUNT_STATUS.PENDING_VERIFICATION) {
    return new AccountAccessError(
      USER_ACCOUNT_ERROR_CODES.EMAIL_NOT_VERIFIED,
      "Email not verified"
    );
  }

  if (status === USER_ACCOUNT_STATUS.SUSPENDED) {
    return new AccountAccessError(USER_ACCOUNT_ERROR_CODES.ACCOUNT_SUSPENDED, "Account suspended");
  }

  if (status === USER_ACCOUNT_STATUS.BLOCKED) {
    return new AccountAccessError(USER_ACCOUNT_ERROR_CODES.ACCOUNT_BLOCKED, "Account blocked");
  }

  return null;
}

function assertUserCanAuthenticate(user) {
  const accessError = getUserAccountAccessError(user);

  if (accessError) {
    throw accessError;
  }
}

function isUserAllowedToAuthenticate(user) {
  return Boolean(user) && !getUserAccountAccessError(user);
}

module.exports = {
  AccountAccessError,
  USER_ACCOUNT_ERROR_CODES,
  USER_ACCOUNT_STATUS,
  USER_ACCOUNT_STATUS_LABELS,
  assertUserCanAuthenticate,
  getUserAccountAccessError,
  getUserAccountStatus,
  getUserAccountStatusLabel,
  isUserAllowedToAuthenticate
};
