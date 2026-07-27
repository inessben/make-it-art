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

function isUnlimitedArtworkLicenseType(value) {
  const licenseType = normalizeArtworkLicenseType(value);
  return (
    licenseType === ARTWORK_LICENSE_TYPE.PERSONAL || licenseType === ARTWORK_LICENSE_TYPE.COMMERCIAL
  );
}

function isExclusiveArtworkLicenseType(value) {
  return normalizeArtworkLicenseType(value) === ARTWORK_LICENSE_TYPE.EXCLUSIVE;
}

module.exports = {
  ARTWORK_LICENSE_TYPE,
  ARTWORK_LICENSE_TYPES,
  isExclusiveArtworkLicenseType,
  isUnlimitedArtworkLicenseType,
  normalizeArtworkLicenseType
};
