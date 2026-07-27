const { checkPwnedPassword } = require("./pwned-password.service");
const { getPasswordValidationError } = require("../utils/password-validation");

const PWNED_PASSWORD_MESSAGE =
  "This password has appeared in a known data breach. Choose a different password.";
const PWNED_PASSWORDS_UNAVAILABLE_MESSAGE =
  "Password security check is temporarily unavailable. Please try again.";

async function isExistingPasswordCompromised(
  password,
  { pwnedPasswordChecker = checkPwnedPassword } = {}
) {
  try {
    const pwnedResult = await pwnedPasswordChecker(password);
    return pwnedResult.available && pwnedResult.breachCount > 0;
  } catch (_error) {
    return false;
  }
}

async function validateNewPassword(
  password,
  { userInputs = [], pwnedPasswordChecker = checkPwnedPassword } = {}
) {
  const validationError = getPasswordValidationError(password, userInputs);

  if (validationError) {
    return {
      message: validationError,
      status: 400
    };
  }

  const pwnedResult = await pwnedPasswordChecker(password);

  if (!pwnedResult.available) {
    return {
      message: PWNED_PASSWORDS_UNAVAILABLE_MESSAGE,
      status: 503
    };
  }

  if (pwnedResult.breachCount > 0) {
    return {
      message: PWNED_PASSWORD_MESSAGE,
      status: 400
    };
  }

  return null;
}

module.exports = {
  isExistingPasswordCompromised,
  PWNED_PASSWORD_MESSAGE,
  PWNED_PASSWORDS_UNAVAILABLE_MESSAGE,
  validateNewPassword
};
