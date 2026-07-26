const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");
const ARTWORKS_DIR = path.join(UPLOADS_ROOT, "artworks");

function getArtworksUploadDirectory() {
  return ARTWORKS_DIR;
}

async function ensureArtworkUploadDirectory() {
  await fsp.mkdir(ARTWORKS_DIR, { recursive: true });
}

function buildArtworkImagePath(filename) {
  return `artworks/${filename}`;
}

function buildArtworkImageUrl(imagePath) {
  if (!imagePath) {
    return null;
  }

  return `/api/uploads/${imagePath.replace(/^\/+/, "")}`;
}

async function removeArtworkImageFile(imagePath) {
  if (!imagePath) {
    return;
  }

  const absolutePath = path.join(UPLOADS_ROOT, imagePath);

  try {
    await fsp.unlink(absolutePath);
  } catch (_error) {
    // Ignore missing files during cleanup.
  }
}

module.exports = {
  UPLOADS_ROOT,
  getArtworksUploadDirectory,
  ensureArtworkUploadDirectory,
  buildArtworkImagePath,
  buildArtworkImageUrl,
  removeArtworkImageFile,
};
