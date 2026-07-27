const env = require("../../config/env");
const localAdapter = require("./local.adapter");
const s3Adapter = require("./s3.adapter");
const cloudinaryAdapter = require("./cloudinary.adapter");

const PROVIDERS = {
  local: localAdapter,
  s3: s3Adapter,
  cloudinary: cloudinaryAdapter
};

function getArtworkStorageProvider(name = env.artworkMedia.storageProvider) {
  const providerName = String(name || "local").toLowerCase();
  const adapter = PROVIDERS[providerName];

  if (!adapter) {
    throw new Error(`UNSUPPORTED_ARTWORK_STORAGE_PROVIDER:${providerName}`);
  }

  return adapter;
}

module.exports = {
  getArtworkStorageProvider,
  PROVIDERS
};
