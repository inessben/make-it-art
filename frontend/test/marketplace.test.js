import test from "node:test";
import assert from "node:assert/strict";

import { formatArtworkLicenseType, isArtworkOwnedByArtist } from "../utils/marketplace.js";

test("artwork licence labels expose every publication choice", () => {
  assert.equal(formatArtworkLicenseType("PERSONAL"), "Licence personnelle");
  assert.equal(formatArtworkLicenseType("COMMERCIAL"), "Licence commerciale");
  assert.equal(formatArtworkLicenseType("EXCLUSIVE"), "Licence exclusive");
});

test("an artist is recognized as the owner of their own artwork", () => {
  const artwork = { artist: { id: 42 } };

  assert.equal(isArtworkOwnedByArtist(artwork, { artist: { id: 42 } }), true);
  assert.equal(isArtworkOwnedByArtist(artwork, { artist: { id: 43 } }), false);
  assert.equal(isArtworkOwnedByArtist(artwork, { artist: null }), false);
  assert.equal(isArtworkOwnedByArtist(null, { artist: { id: 42 } }), false);
});
