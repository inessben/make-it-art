const { ZxcvbnFactory } = require("@zxcvbn-ts/core");
const common = require("@zxcvbn-ts/language-common");
const english = require("@zxcvbn-ts/language-en");
const french = require("@zxcvbn-ts/language-fr");

const MIN_PASSWORD_LENGTH = 15;
const MIN_PASSWORD_SCORE = 2;
const STRONG_PASSWORD_SCORE = 3;
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
    ...english.dictionary,
    ...french.dictionary,
    "make-it-art": SITE_PASSWORD_WORDS
  },
  graphs: common.adjacencyGraphs,
  translations: english.translations,
  useLevenshteinDistance: true
});

function getPasswordLength(password) {
  if (typeof password !== "string") {
    return 0;
  }

  return Array.from(password).length;
}

function getPasswordUserInputs(userInputs = []) {
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

function getPasswordAnalysis(password, userInputs = []) {
  return passwordEstimator.check(
    typeof password === "string" ? password : "",
    getPasswordUserInputs(userInputs)
  );
}

function isPasswordCommonOrPredictable(password, userInputs = []) {
  return getPasswordAnalysis(password, userInputs).score < MIN_PASSWORD_SCORE;
}

function getPasswordValidationError(password, userInputs = []) {
  if (getPasswordLength(password) < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (isPasswordCommonOrPredictable(password, userInputs)) {
    return "Choose a less predictable password.";
  }

  return "";
}

function getPasswordConfirmationError(password, confirmPassword) {
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
}

module.exports = {
  getPasswordAnalysis,
  getPasswordConfirmationError,
  getPasswordLength,
  getPasswordUserInputs,
  getPasswordValidationError,
  isPasswordCommonOrPredictable,
  MIN_PASSWORD_LENGTH,
  MIN_PASSWORD_SCORE,
  STRONG_PASSWORD_SCORE
};
