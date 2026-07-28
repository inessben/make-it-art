const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  CONTRACT_VERSION,
  CONTRACT_TIME_ZONE,
  buildContractContext,
  resolveContractSignedAt,
  renderArtistContract
} = require("../src/services/artist-contract.service");

test("buildContractContext formats the signature timestamp in Europe/Paris with time", () => {
  const context = buildContractContext({
    user: {
      email: "artist@example.com",
      username: "Ada Lovelace",
      phone: "0102030405"
    },
    payload: {
      firstName: "Ada",
      lastName: "Lovelace",
      displayName: "Ada Art",
      addressLine1: "1 rue de Paris",
      city: "Paris",
      postalCode: "75001",
      country: "France",
      taxId: "FR123",
      artType: "Digital Art",
      styles: ["Digital painting"]
    },
    effectiveDate: new Date("2026-07-04T13:45:00.000Z")
  });

  assert.equal(CONTRACT_TIME_ZONE, "Europe/Paris");
  assert.match(context.signatureDateTimeLabel, /15:45/);
  assert.match(context.signatureDateTimeLabel, /Europe\/Paris/);
});

test("renderArtistContract includes the signature date and time in the contract text", () => {
  const { contractText } = renderArtistContract({
    user: {
      email: "artist@example.com",
      username: "Ada Lovelace",
      phone: "0102030405"
    },
    payload: {
      firstName: "Ada",
      lastName: "Lovelace",
      displayName: "Ada Art",
      addressLine1: "1 rue de Paris",
      city: "Paris",
      postalCode: "75001",
      country: "France",
      taxId: "FR123",
      artType: "Digital Art",
      styles: ["Digital painting"]
    },
    effectiveDate: new Date("2026-07-04T13:45:00.000Z")
  });

  assert.match(contractText, /Date et heure de signature : .*15:45.*Europe\/Paris/);
  assert.match(contractText, /Make It Art est le marchand officiel/);
  assert.match(
    contractText,
    /commission fixe de 7 % sur le montant hors taxes.*apres toute reduction ou promotion/
  );
  assert.match(
    contractText,
    /frais Stripe, remboursements et chargebacks sont a la charge de Make It Art/
  );
});

test("buildContractContext uses undefined when the optional tax identifier is missing", () => {
  const context = buildContractContext({
    user: {
      email: "artist@example.com",
      username: "Ada Lovelace",
      phone: "0102030405"
    },
    payload: {
      firstName: "Ada",
      lastName: "Lovelace",
      displayName: "Ada Art",
      addressLine1: "1 rue de Paris",
      city: "Paris",
      postalCode: "75001",
      country: "France",
      taxId: "",
      artType: "Digital Art",
      styles: ["Digital painting"]
    }
  });

  assert.equal(context.taxId, "undefined");
});

test("resolveContractSignedAt falls back to the submission timestamp when needed", () => {
  const signedAt = resolveContractSignedAt({
    contractSignedAt: null,
    contractAcceptedAt: null,
    submittedAt: new Date("2026-07-03T08:20:00.000Z")
  });

  assert.equal(signedAt.toISOString(), "2026-07-03T08:20:00.000Z");
});

test("contract version reflects the France B2C merchant and commission terms", () => {
  assert.equal(CONTRACT_VERSION, "make-it-art-artist-contract-v3");
});
