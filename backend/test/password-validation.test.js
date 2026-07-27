const assert = require("node:assert/strict");
const { describe, test } = require("node:test");
const {
  getPasswordAnalysis,
  getPasswordConfirmationError,
  getPasswordLength,
  getPasswordUserInputs,
  getPasswordValidationError,
  isPasswordCommonOrPredictable,
  MIN_PASSWORD_LENGTH,
  MIN_PASSWORD_SCORE
} = require("../src/utils/password-validation");

describe("password policy", () => {
  test("requires at least 15 Unicode characters", () => {
    const fourteenCharacters = "🎨".repeat(14);
    const fifteenCharacters = `${fourteenCharacters}🌊`;

    assert.equal(MIN_PASSWORD_LENGTH, 15);
    assert.equal(getPasswordLength(fifteenCharacters), 15);
    assert.equal(
      getPasswordValidationError(fourteenCharacters),
      "Password must be at least 15 characters."
    );
    assert.equal(
      getPasswordValidationError(123456789012345),
      "Password must be at least 15 characters."
    );
  });

  test("accepts strong passphrases without composition rules", () => {
    assert.equal(getPasswordValidationError("only lowercase words"), "");
    assert.equal(getPasswordValidationError("phrase with spaces"), "");
    assert.equal(getPasswordValidationError("🎨 musée galerie calme"), "");
  });

  test("rejects repeated and application-specific passwords with zxcvbn", () => {
    assert.equal(MIN_PASSWORD_SCORE, 2);
    assert.equal(isPasswordCommonOrPredictable("abcabcabcabcabc"), true);
    assert.equal(isPasswordCommonOrPredictable("make-it-art-password"), true);
    assert.equal(
      getPasswordValidationError("abcabcabcabcabc"),
      "Choose a less predictable password."
    );
  });

  test("uses account details as zxcvbn user inputs", () => {
    assert.equal(getPasswordAnalysis("artistportfolio").score, 2);
    assert.equal(getPasswordAnalysis("artistportfolio", ["artistportfolio"]).score, 0);
    assert.equal(
      getPasswordValidationError("artistportfolio", ["artistportfolio"]),
      "Choose a less predictable password."
    );
    assert.ok(getPasswordUserInputs(["artist@example.com"]).includes("artist"));
  });

  test("keeps score 2 as a warning instead of a local rejection", () => {
    const analysis = getPasswordAnalysis("Password Password");

    assert.equal(analysis.score, 2);
    assert.equal(getPasswordValidationError("Password Password"), "");
    assert.match(analysis.feedback.warning, /commonly used password/i);
  });

  test("validates password confirmation independently", () => {
    assert.equal(
      getPasswordConfirmationError("violet gallery river", "violet gallery ocean"),
      "Passwords do not match."
    );
    assert.equal(getPasswordConfirmationError("violet gallery river", "violet gallery river"), "");
  });
});
