const ARTWORK_VISIBILITY = Object.freeze({
  PUBLISHED: "PUBLISHED",
  HIDDEN: "HIDDEN",
  ARCHIVED: "ARCHIVED"
});

function normalizeArtworkVisibility(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return Object.values(ARTWORK_VISIBILITY).includes(normalized)
    ? normalized
    : ARTWORK_VISIBILITY.PUBLISHED;
}

module.exports = {
  ARTWORK_VISIBILITY,
  normalizeArtworkVisibility
};
