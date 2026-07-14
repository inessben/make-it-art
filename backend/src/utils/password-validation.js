const passwordRules = [
  {
    test: (password) => password.length >= 8,
    message: "Password must be at least 8 characters"
  },
  {
    test: (password) => /[a-z]/.test(password),
    message: "Password must contain at least one lowercase letter"
  },
  {
    test: (password) => /[A-Z]/.test(password),
    message: "Password must contain at least one uppercase letter"
  },
  {
    test: (password) => /\d/.test(password),
    message: "Password must contain at least one number"
  },
  {
    test: (password) => /[!@#$%^&*()_\-+=[\]{};:,.<>?]/.test(password),
    message: "Password must contain at least one special character"
  }
];

function getPasswordValidationError(password) {
  const failedRule = passwordRules.find((rule) => !rule.test(password));

  return failedRule?.message || "";
}

function getPasswordConfirmationError(password, confirmPassword) {
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }

  return "";
}

module.exports = {
  getPasswordConfirmationError,
  getPasswordValidationError
};
