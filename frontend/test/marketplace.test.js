import test from "node:test";
import assert from "node:assert/strict";

import {
  ARTIST_ARTWORK_VISIBILITY_FILTERS,
  ARTWORK_LICENSE_OPTIONS,
  filterArtistArtworksByVisibility,
  formatArtworkLicenseType,
  formatArtworkManagementReason,
  getArtworkAvailabilityPresentation,
  getArtworkVisibilityPresentation,
  isArtworkDescriptionRequired,
  isArtworkOwnedByArtist,
  normalizeArtistArtworkCounts,
  resolveArtworkCategoryId,
  shouldSynchronizeArtworkManagement
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

test("artwork management states have accessible labels and refusal explanations", () => {
  assert.equal(getArtworkVisibilityPresentation("PUBLISHED").label, "Publiée");
  assert.equal(getArtworkVisibilityPresentation("HIDDEN").label, "Masquée");
  assert.equal(getArtworkVisibilityPresentation("ARCHIVED").label, "Archivée");
  assert.match(formatArtworkManagementReason("ARTWORK_HAS_PURCHASES"), /déjà été achetée/i);
  assert.match(formatArtworkManagementReason("ARTWORK_TRANSACTION_IN_PROGRESS"), /paiement/i);
});

test("artist artwork workspace separates lifecycle states and trusts server counts", () => {
  assert.deepEqual(
    ARTIST_ARTWORK_VISIBILITY_FILTERS.map(({ value }) => value),
    ["PUBLISHED", "HIDDEN", "ARCHIVED"]
  );

  const artworks = [
    { id: 1, visibility: "PUBLISHED" },
    { id: 2, visibility: "HIDDEN" },
    { id: 3, visibility: "ARCHIVED" },
    { id: 4 }
  ];

  assert.deepEqual(
    filterArtistArtworksByVisibility(artworks, "PUBLISHED").map(({ id }) => id),
    [1, 4]
  );
  assert.deepEqual(filterArtistArtworksByVisibility(artworks, "HIDDEN"), [artworks[1]]);
  assert.deepEqual(
    normalizeArtistArtworkCounts({ total: 8, PUBLISHED: 3, HIDDEN: 2, ARCHIVED: 3 }),
    { total: 8, PUBLISHED: 3, HIDDEN: 2, ARCHIVED: 3 }
  );
  assert.deepEqual(normalizeArtistArtworkCounts(null), {
    total: 0,
    PUBLISHED: 0,
    HIDDEN: 0,
    ARCHIVED: 0
  });
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

test("a stale owner session triggers a management capability refresh", () => {
  const artwork = { artist: { id: 42 } };
  const owner = { artist: { id: 42 } };

  assert.equal(shouldSynchronizeArtworkManagement(artwork, owner), true);
  assert.equal(shouldSynchronizeArtworkManagement({ ...artwork, management: {} }, owner), false);
  assert.equal(shouldSynchronizeArtworkManagement(artwork, { artist: { id: 43 } }), false);
  assert.equal(shouldSynchronizeArtworkManagement(artwork, null), true);
});

test("the artwork edit form resolves its current category from every supported payload", () => {
  const categories = [
    { id: 1, name: "Illustration" },
    { id: 2, name: "Peinture numerique" }
  ];

  assert.equal(resolveArtworkCategoryId({ category: { id: 1 } }, categories), "1");
  assert.equal(resolveArtworkCategoryId({ categoryId: 2 }, categories), "2");
  assert.equal(
    resolveArtworkCategoryId({ category: { id: 99, name: "Peinture num\u00e9rique" } }, categories),
    "2"
  );
  assert.equal(resolveArtworkCategoryId({ category: "Illustration" }, categories), "1");
  assert.equal(resolveArtworkCategoryId({ category: { name: "Inconnue" } }, categories), "");
});
