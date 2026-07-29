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
      styles: ["Digital painting"],
      contractLanguage: "fr"
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

  assert.match(contractText, /Signature date and time: .*15:45.*Europe\/Paris/);
  assert.match(contractText, /ARTICLE 17/);
  assert.match(contractText, /Commission/);
  assert.ok(contractText.length > 25000);
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

  assert.equal(context.taxId, "Not provided");
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
  assert.equal(CONTRACT_VERSION, "make-it-art-artist-contract-v4");
});

test("renderArtistContract defaults to the complete English agreement", () => {
  const result = renderArtistContract({
    user: { email: "artist@example.com", username: "Ada Lovelace" },
    payload: { firstName: "Ada", lastName: "Lovelace", displayName: "Ada Art" },
    effectiveDate: new Date("2026-07-04T13:45:00.000Z")
  });
  assert.equal(result.contractLanguage, "en");
  assert.match(result.contractText, /ENGLISH COURTESY TRANSLATION/);
  assert.match(result.contractText, /ARTICLE 17/);
  assert.match(result.contractText, /Legal name: Ada Lovelace/);
  assert.ok(result.contractText.length > 25000);
});

test("renderArtistContract supports the complete French agreement", () => {
  const result = renderArtistContract({
    user: { email: "artist@example.com", username: "Ada Lovelace" },
    payload: { firstName: "Ada", lastName: "Lovelace", contractLanguage: "fr" }
  });
  assert.equal(result.contractLanguage, "fr");
  assert.match(result.contractText, /CONTRAT D'ARTISTE/);
  assert.match(result.contractText, /ARTICLE 17/);
  assert.match(result.contractText, /Nom l.gal: Ada Lovelace/);
  assert.ok(result.contractText.length > 30000);
});
