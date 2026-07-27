const ARTWORK_LICENSE_TYPE = Object.freeze({
  PERSONAL: "PERSONAL",
  COMMERCIAL: "COMMERCIAL",
  EXCLUSIVE: "EXCLUSIVE"
});

const ARTWORK_LICENSE_TYPES = new Set(Object.values(ARTWORK_LICENSE_TYPE));

function normalizeArtworkLicenseType(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return ARTWORK_LICENSE_TYPES.has(normalized) ? normalized : null;
}

module.exports = {
  ARTWORK_LICENSE_TYPE,
  ARTWORK_LICENSE_TYPES,
  normalizeArtworkLicenseType
};
