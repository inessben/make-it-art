import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getWalletConsentState } from "../utils/wallet-consent.js";

describe("wallet consent state", () => {
  test("blocks the choice until the email is verified", () => {
    assert.equal(getWalletConsentState({ verified: false, consent: null }), "unverified");
  });

  test("shows the initial choice for a verified user", () => {
    assert.equal(getWalletConsentState({ verified: true, consent: null }), "undecided");
  });

  test("keeps a refusal optional and reversible", () => {
    assert.equal(
      getWalletConsentState({ verified: true, consent: { accepted: false } }),
      "declined"
    );
  });

  test("recognizes a current accepted consent", () => {
    assert.equal(
      getWalletConsentState({
        verified: true,
        consent: { accepted: true, revokedAt: null }
      }),
      "accepted"
    );
  });
});
