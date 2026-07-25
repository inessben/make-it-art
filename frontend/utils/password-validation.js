export const PASSWORD_REQUIREMENTS = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (password) => password.length >= 8,
    message: "Password must be at least 8 characters."
  },
  {
    id: "lowercase",
    label: "At least one lowercase letter",
    test: (password) => /[a-z]/.test(password),
    message: "Password must contain at least one lowercase letter."
  },
  {
    id: "uppercase",
    label: "At least one uppercase letter",
    test: (password) => /[A-Z]/.test(password),
    message: "Password must contain at least one uppercase letter."
  },
  {
    id: "number",
    label: "At least one number",
    test: (password) => /\d/.test(password),
    message: "Password must contain at least one number."
  },
  {
    id: "special",
    label: "At least one special character",
    test: (password) => /[!@#$%^&*()_\-+=[\]{};:,.<>?]/.test(password),
    message: "Password must contain at least one special character."
  }
];

export function getPasswordRequirementStates(password) {
  return PASSWORD_REQUIREMENTS.map((requirement) => ({
    id: requirement.id,
    label: requirement.label,
    message: requirement.message,
    isMet: requirement.test(password)
  }));
}

export function getPasswordStrength(password) {
  const requirementStates = getPasswordRequirementStates(password);
  const metCount = requirementStates.filter((requirement) => requirement.isMet).length;
  const totalCount = requirementStates.length;
  const percentage = Math.round((metCount / totalCount) * 100);
  let level = "Weak";

  if (metCount === totalCount) {
    level = "Strong";
  } else if (metCount >= 3) {
    level = "Medium";
  }

  return {
    level,
    metCount,
    percentage,
    totalCount
  };
}

export function getPasswordValidationError(password) {
  const failedRule = PASSWORD_REQUIREMENTS.find((rule) => !rule.test(password));

  return failedRule?.message || "";
}

export function getPasswordConfirmationError(password, confirmPassword) {
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
}
