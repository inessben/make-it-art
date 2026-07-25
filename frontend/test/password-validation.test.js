import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  getPasswordConfirmationError,
  getPasswordRequirementStates,
  getPasswordStrength,
  getPasswordValidationError,
  PASSWORD_REQUIREMENTS
} from "../utils/password-validation.js";

function getRequirementMap(password) {
  return Object.fromEntries(
    getPasswordRequirementStates(password).map((requirement) => [requirement.id, requirement.isMet])
  );
}

describe("password requirement detection", () => {
  test("reports every unmet requirement for an empty password", () => {
    assert.equal(PASSWORD_REQUIREMENTS.length, 5);
    assert.deepEqual(getRequirementMap(""), {
      length: false,
      lowercase: false,
      uppercase: false,
      number: false,
      special: false
    });
  });

  test("detects the minimum length requirement", () => {
    assert.equal(getRequirementMap("Aa1!aaa").length, false);
    assert.equal(getRequirementMap("Aa1!aaaa").length, true);
  });

  test("detects the lowercase requirement", () => {
    assert.equal(getRequirementMap("PASSWORD1!").lowercase, false);
    assert.equal(getRequirementMap("Password1!").lowercase, true);
  });

  test("detects the uppercase requirement", () => {
    assert.equal(getRequirementMap("password1!").uppercase, false);
    assert.equal(getRequirementMap("Password1!").uppercase, true);
  });

  test("detects the number requirement", () => {
    assert.equal(getRequirementMap("Password!").number, false);
    assert.equal(getRequirementMap("Password1!").number, true);
  });

  test("detects the special character requirement", () => {
    assert.equal(getRequirementMap("Password1").special, false);
    assert.equal(getRequirementMap("Password1!").special, true);
  });
});

describe("password strength calculation", () => {
  test("returns weak strength when only a few conditions are met", () => {
    assert.deepEqual(getPasswordStrength("password"), {
      level: "Weak",
      metCount: 2,
      percentage: 40,
      totalCount: 5
    });
  });

  test("returns medium strength when most conditions are met", () => {
    assert.deepEqual(getPasswordStrength("Password"), {
      level: "Medium",
      metCount: 3,
      percentage: 60,
      totalCount: 5
    });
  });

  test("returns strong strength when all conditions are met", () => {
    assert.deepEqual(getPasswordStrength("Password1!"), {
      level: "Strong",
      metCount: 5,
      percentage: 100,
      totalCount: 5
    });
  });
});

describe("password validation result", () => {
  test("returns no validation error when all conditions are met", () => {
    assert.equal(getPasswordValidationError("Password1!"), "");
  });

  test("returns the first unmet condition message when a condition is missing", () => {
    assert.equal(
      getPasswordValidationError("Password1"),
      "Password must contain at least one special character."
    );
  });

  test("keeps final confirmation validation separate from strength validation", () => {
    assert.equal(
      getPasswordConfirmationError("Password1!", "Password2!"),
      "Passwords do not match."
    );
    assert.equal(getPasswordConfirmationError("Password1!", "Password1!"), "");
  });
});
