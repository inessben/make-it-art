import test from "node:test";
import assert from "node:assert/strict";

import {
  ARTWORK_LICENSE_OPTIONS,
  formatArtworkLicenseType,
  getArtworkAvailabilityPresentation,
  isArtworkDescriptionRequired,
  isArtworkOwnedByArtist
} from "../utils/marketplace.js";

test("artwork licence labels expose every publication choice", () => {
  assert.deepEqual(
    ARTWORK_LICENSE_OPTIONS.map(({ value }) => value),
    ["PERSONAL", "COMMERCIAL", "EXCLUSIVE"]
  );
  assert.ok(ARTWORK_LICENSE_OPTIONS.every(({ label, description }) => label && description));
  assert.match(
    ARTWORK_LICENSE_OPTIONS.find(({ value }) => value === "COMMERCIAL").description,
    /conditions d'utilisation commerciale.*description/i
  );
  assert.equal(isArtworkDescriptionRequired("COMMERCIAL"), true);
  assert.equal(isArtworkDescriptionRequired("PERSONAL"), false);
  assert.equal(isArtworkDescriptionRequired("EXCLUSIVE"), false);
  assert.equal(formatArtworkLicenseType("PERSONAL"), "Licence personnelle");
  assert.equal(formatArtworkLicenseType("COMMERCIAL"), "Licence commerciale");
  assert.equal(formatArtworkLicenseType("EXCLUSIVE"), "Licence exclusive");
});

test("exclusive availability has explicit customer-facing labels", () => {
  assert.equal(
    getArtworkAvailabilityPresentation({ availabilityStatus: "AVAILABLE" }).label,
    "Disponible"
  );
  assert.equal(
    getArtworkAvailabilityPresentation({ availabilityStatus: "RESERVED" }).label,
    "Réservée temporairement"
  );
  assert.equal(getArtworkAvailabilityPresentation({ availabilityStatus: "SOLD" }).label, "Vendue");
});

test("an artist is recognized as the owner of their own artwork", () => {
  const artwork = { artist: { id: 42 } };

  assert.equal(isArtworkOwnedByArtist(artwork, { artist: { id: 42 } }), true);
  assert.equal(isArtworkOwnedByArtist(artwork, { artist: { id: 43 } }), false);
  assert.equal(isArtworkOwnedByArtist(artwork, { artist: null }), false);
  assert.equal(isArtworkOwnedByArtist(null, { artist: { id: 42 } }), false);
});
