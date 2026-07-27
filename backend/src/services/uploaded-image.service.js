const fsp = require("node:fs/promises");
const path = require("node:path");

const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");

function normalizeRelativeDirectory(relativeDirectory) {
  return String(relativeDirectory || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function buildUploadedImagePath(relativeDirectory, filename) {
  const normalizedDirectory = normalizeRelativeDirectory(relativeDirectory);
  const normalizedFilename = String(filename || "").replace(/^\/+/, "");

  return normalizedDirectory
    ? path.posix.join(normalizedDirectory, normalizedFilename)
    : normalizedFilename;
}

async function ensureUploadedImageDirectory(relativeDirectory) {
  const normalizedDirectory = normalizeRelativeDirectory(relativeDirectory);
  const absoluteDirectory = normalizedDirectory
    ? path.join(UPLOADS_ROOT, normalizedDirectory)
    : UPLOADS_ROOT;

  await fsp.mkdir(absoluteDirectory, { recursive: true });
}

function buildUploadedImageUrl(imagePath) {
  if (!imagePath) {
    return null;
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  return `/api/uploads/${String(imagePath).replace(/^\/+/, "")}`;
}

async function removeUploadedImage(imagePath) {
  if (!imagePath || /^https?:\/\//i.test(imagePath)) {
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
  buildUploadedImagePath,
  buildUploadedImageUrl,
  ensureUploadedImageDirectory,
  removeUploadedImage
};
