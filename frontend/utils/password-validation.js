import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as common from "@zxcvbn-ts/language-common";
import { translations as englishTranslations } from "@zxcvbn-ts/language-en";

export const MIN_PASSWORD_LENGTH = 15;
export const MIN_PASSWORD_SCORE = 2;
export const STRONG_PASSWORD_SCORE = 3;

const MAX_USER_INPUT_LENGTH = 100;
const MAX_USER_INPUTS = 30;
const SITE_USER_INPUTS = ["make it art", "makeitart"];
const SITE_PASSWORD_WORDS = [
  "make it art",
  "makeitart",
  "make-it-art",
  "makeitartpassword",
  "make-it-art-password"
];

const passwordEstimator = new ZxcvbnFactory({
  dictionary: {
    ...common.dictionary,
    "make-it-art": SITE_PASSWORD_WORDS
  },
  graphs: common.adjacencyGraphs,
  translations: englishTranslations,
  useLevenshteinDistance: true
});

export function getPasswordLength(password) {
  if (typeof password !== "string") {
    return 0;
  }

  return Array.from(password).length;
}

export function getPasswordUserInputs(userInputs = []) {
  const inputs = new Set(SITE_USER_INPUTS);

  for (const value of Array.isArray(userInputs) ? userInputs : [userInputs]) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmedValue = value.trim().slice(0, MAX_USER_INPUT_LENGTH);

    if (!trimmedValue) {
      continue;
    }

    inputs.add(trimmedValue);

    for (const part of trimmedValue.split(/[\s@._-]+/u)) {
      if (part.length >= 2) {
        inputs.add(part);
      }
    }
  }

  return Array.from(inputs).slice(0, MAX_USER_INPUTS);
}

export function getPasswordAnalysis(password, userInputs = []) {
  return passwordEstimator.check(
    typeof password === "string" ? password : "",
    getPasswordUserInputs(userInputs)
  );
}

export function isPasswordCommonOrPredictable(password, userInputs = []) {
  return getPasswordAnalysis(password, userInputs).score < MIN_PASSWORD_SCORE;
}

export const PASSWORD_REQUIREMENTS = [
  {
    id: "length",
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    test: (password) => getPasswordLength(password) >= MIN_PASSWORD_LENGTH
  },
  {
    id: "guessability",
    label: "Not easy to guess",
    message: "Choose a less predictable password.",
    test: (_password, _userInputs, analysis) => analysis.score >= MIN_PASSWORD_SCORE
  }
];

export function getPasswordRequirementStates(
  password,
  userInputs = [],
  analysis = getPasswordAnalysis(password, userInputs)
) {
  return PASSWORD_REQUIREMENTS.map((requirement) => ({
    id: requirement.id,
    label: requirement.label,
    message: requirement.message,
    isMet: requirement.test(password, userInputs, analysis)
  }));
}

function getPasswordFeedback(analysis) {
  const feedback = [analysis.feedback?.warning, ...(analysis.feedback?.suggestions || [])].filter(
    Boolean
  );

  if (analysis.score === MIN_PASSWORD_SCORE && feedback.length === 0) {
    feedback.push("This password is acceptable, but a longer passphrase would be safer.");
  }

  return feedback.join(" ");
}

export function getPasswordStrength(password, userInputs = []) {
  const analysis = getPasswordAnalysis(password, userInputs);
  const requirementStates = getPasswordRequirementStates(password, userInputs, analysis);
  const passwordLength = getPasswordLength(password);
  const meetsMinimumLength = passwordLength >= MIN_PASSWORD_LENGTH;
  let level = "Weak";
  let percentage = password ? (analysis.score + 1) * 20 : 0;

  if (!meetsMinimumLength) {
    percentage = Math.min(percentage, 40);
  } else if (analysis.score >= STRONG_PASSWORD_SCORE) {
    level = "Strong";
  } else if (analysis.score >= MIN_PASSWORD_SCORE) {
    level = "Medium";
  }

  return {
    feedback: password ? getPasswordFeedback(analysis) : "",
    level,
    metCount: requirementStates.filter((requirement) => requirement.isMet).length,
    percentage,
    score: analysis.score,
    totalCount: requirementStates.length
  };
}

export function getPasswordValidationError(password, userInputs = []) {
  if (getPasswordLength(password) < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (isPasswordCommonOrPredictable(password, userInputs)) {
    return "Choose a less predictable password.";
  }

  return "";
}

export function getPasswordConfirmationError(password, confirmPassword) {
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
}
