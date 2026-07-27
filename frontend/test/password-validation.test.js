import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  getPasswordAnalysis,
  getPasswordConfirmationError,
  getPasswordLength,
  getPasswordRequirementStates,
  getPasswordStrength,
  getPasswordUserInputs,
  getPasswordValidationError,
  isPasswordCommonOrPredictable,
  MIN_PASSWORD_LENGTH,
  MIN_PASSWORD_SCORE,
  PASSWORD_REQUIREMENTS
} from "../utils/password-validation.js";

function getRequirementMap(password, userInputs = []) {
  return Object.fromEntries(
    getPasswordRequirementStates(password, userInputs).map((requirement) => [
      requirement.id,
      requirement.isMet
    ])
  );
}

describe("password requirement detection", () => {
  test("requires at least 15 characters without composition rules", () => {
    assert.equal(MIN_PASSWORD_LENGTH, 15);
    assert.equal(MIN_PASSWORD_SCORE, 2);
    assert.equal(PASSWORD_REQUIREMENTS.length, 2);
    assert.deepEqual(getRequirementMap(""), {
      length: false,
      guessability: false
    });
    assert.equal(getRequirementMap("a".repeat(14)).length, false);
    assert.equal(getRequirementMap("a long passphrase").length, true);
    assert.equal(getRequirementMap("only lowercase words").length, true);
    assert.equal(getRequirementMap("no symbols needed").length, true);
  });

  test("counts Unicode code points instead of UTF-16 code units", () => {
    const fourteenCharacters = "🎨".repeat(14);
    const fifteenCharacters = `${fourteenCharacters}🌊`;

    assert.equal(getPasswordLength(fourteenCharacters), 14);
    assert.equal(getPasswordLength(fifteenCharacters), 15);
    assert.equal(getRequirementMap(fourteenCharacters).length, false);
    assert.equal(getRequirementMap(fifteenCharacters).length, true);
  });

  test("rejects repeated and application-specific passwords", () => {
    assert.equal(isPasswordCommonOrPredictable("abcabcabcabcabc"), true);
    assert.equal(isPasswordCommonOrPredictable("make-it-art-password"), true);
    assert.equal(isPasswordCommonOrPredictable("violet gallery river"), false);
  });

  test("uses account details as zxcvbn user inputs", () => {
    assert.equal(getPasswordAnalysis("artistportfolio").score, 2);
    assert.equal(getPasswordAnalysis("artistportfolio", ["artistportfolio"]).score, 0);
    assert.equal(getRequirementMap("artistportfolio", ["artistportfolio"]).guessability, false);
    assert.ok(getPasswordUserInputs(["artist@example.com"]).includes("artist"));
  });
});

describe("password strength calculation", () => {
  test("keeps passwords below the minimum length weak", () => {
    const strength = getPasswordStrength("short phrase");

    assert.equal(strength.level, "Weak");
    assert.equal(strength.metCount, 1);
    assert.equal(strength.percentage, 40);
    assert.equal(strength.totalCount, 2);
  });

  test("returns weak strength for repeated passwords", () => {
    const strength = getPasswordStrength("abcabcabcabcabcabcabc");

    assert.equal(strength.level, "Weak");
    assert.equal(strength.score, 0);
    assert.equal(strength.percentage, 20);
    assert.match(strength.feedback, /repeated/i);
  });

  test("returns a non-blocking warning for zxcvbn score 2", () => {
    const strength = getPasswordStrength("Password Password");

    assert.equal(strength.level, "Medium");
    assert.equal(strength.score, 2);
    assert.equal(strength.percentage, 60);
    assert.match(strength.feedback, /commonly used password/i);
    assert.equal(getPasswordValidationError("Password Password"), "");
  });

  test("returns strong strength for a high-scoring passphrase", () => {
    const strength = getPasswordStrength("violet gallery river");

    assert.equal(strength.level, "Strong");
    assert.equal(strength.score, 4);
    assert.equal(strength.percentage, 100);
  });
});

describe("password validation result", () => {
  test("accepts strong passphrases without requiring character classes", () => {
    assert.equal(getPasswordValidationError("only lowercase words"), "");
    assert.equal(getPasswordValidationError("phrase with spaces"), "");
    assert.equal(getPasswordValidationError("🎨 musée galerie calme"), "");
  });

  test("returns the first unmet condition", () => {
    assert.equal(
      getPasswordValidationError("too short"),
      "Password must be at least 15 characters."
    );
    assert.equal(
      getPasswordValidationError("abcabcabcabcabc"),
      "Choose a less predictable password."
    );
  });

  test("keeps confirmation validation separate from strength validation", () => {
    assert.equal(
      getPasswordConfirmationError("violet gallery river", "violet gallery ocean"),
      "Passwords do not match."
    );
    assert.equal(getPasswordConfirmationError("violet gallery river", "violet gallery river"), "");
  });
});
