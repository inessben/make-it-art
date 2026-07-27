const fsp = require("node:fs/promises");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { resolvePythonCommand } = require("./artist-contract.service");

const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");
const ARTWORKS_DIR = path.join(UPLOADS_ROOT, "artworks");
const PREVIEWS_DIR = path.join(ARTWORKS_DIR, "previews");
const SAFE_ARTWORK_FILENAME = /^[0-9]+-[0-9a-f-]{36}\.(jpe?g|png|webp|gif)$/i;

function getArtworksUploadDirectory() {
  return ARTWORKS_DIR;
}

function getArtworkPreviewsDirectory() {
  return PREVIEWS_DIR;
}

async function ensureArtworkUploadDirectory() {
  await fsp.mkdir(path.join(ARTWORKS_DIR, "hd"), { recursive: true });
  await fsp.mkdir(path.join(ARTWORKS_DIR, "preview"), { recursive: true });
  await fsp.mkdir(ARTWORKS_DIR, { recursive: true });
  await fsp.mkdir(PREVIEWS_DIR, { recursive: true });
}

function buildArtworkImagePath(filename) {
  return `artworks/${filename}`;
}

function buildArtworkPreviewPath(filename) {
  const extension = path.extname(filename || "").toLowerCase();
  const baseName = path.basename(filename, extension);
  const previewName = `${baseName}.jpg`;
  return `artworks/previews/${previewName}`;
}

function buildArtworkImageUrl(imagePath) {
  if (!imagePath) {
    return null;
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  return `/api/uploads/${imagePath.replace(/^\/+/, "")}`;
}

function buildArtworkPreviewUrl(previewPath, imagePath) {
  if (previewPath) {
    return buildArtworkImageUrl(previewPath);
  }

  if (!imagePath) {
    return null;
  }

  const filename = path.basename(imagePath);
  if (!SAFE_ARTWORK_FILENAME.test(filename)) {
    return null;
  }

  return `/api/uploads/artworks/previews/${path.basename(buildArtworkPreviewPath(filename))}`;
}

function assertSafeRelativeUploadPath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath.trim()) {
    throw new Error("INVALID_UPLOAD_PATH");
  }

  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    normalized.includes("..") ||
    path.isAbsolute(normalized) ||
    !normalized.startsWith("artworks/")
  ) {
    throw new Error("INVALID_UPLOAD_PATH");
  }

  const absolutePath = path.resolve(UPLOADS_ROOT, normalized);
  const relativeToRoot = path.relative(UPLOADS_ROOT, absolutePath);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error("INVALID_UPLOAD_PATH");
  }

  return { normalized, absolutePath };
}

function assertSafeArtworkFilename(filename) {
  if (typeof filename !== "string" || !SAFE_ARTWORK_FILENAME.test(filename)) {
    throw new Error("INVALID_UPLOAD_PATH");
  }
  return filename;
}

async function removeArtworkImageFile(imagePath) {
  if (!imagePath || /^https?:\/\//i.test(imagePath)) {
    return;
  }

  try {
    const { absolutePath } = assertSafeRelativeUploadPath(imagePath);
    await fsp.unlink(absolutePath);
  } catch (_error) {
    // Ignore missing files during cleanup.
  }
}

async function generateArtworkPreview({ imagePath, title, artistName, copyrightHolder }) {
  const { absolutePath: sourcePath } = assertSafeRelativeUploadPath(imagePath);
  const previewRelativePath = buildArtworkPreviewPath(path.basename(imagePath));
  const { absolutePath: outputPath } = assertSafeRelativeUploadPath(previewRelativePath);

  await ensureArtworkUploadDirectory();

  const python = resolvePythonCommand();
  const metadata = {
    maxSize: 800,
    watermark: "Make It Art · Preview · No AI training",
    copyright: `© ${copyrightHolder || artistName || "Make it Art"} — All rights reserved. AI training prohibited.`,
    artist: artistName || "Make it Art artist",
    title: title || "Protected artwork",
    usageTerms:
      "No AI training, scraping, crawling, or automated collection without an explicit license from the rights holder."
  };

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "mia-artwork-preview-"));
  const metadataPath = path.join(tempDir, "metadata.json");

  try {
    await fsp.writeFile(metadataPath, JSON.stringify(metadata), "utf8");
    const scriptPath = path.join(__dirname, "../../scripts/generate_artwork_preview.py");
    const result = spawnSync(
      python.command,
      [...python.args, scriptPath, sourcePath, outputPath, metadataPath],
      {
        encoding: "utf8",
        windowsHide: true
      }
    );

    if (result.status !== 0) {
      const details = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
      throw new Error(details || "Unable to generate a protected artwork preview");
    }

    await fsp.access(outputPath, fs.constants.R_OK);
    return previewRelativePath;
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
}

async function ensureArtworkPreviewFile({
  imagePath,
  previewPath,
  title,
  artistName,
  copyrightHolder
}) {
  if (previewPath) {
    try {
      const { absolutePath } = assertSafeRelativeUploadPath(previewPath);
      await fsp.access(absolutePath, fs.constants.R_OK);
      return previewPath;
    } catch (_error) {
      // Regenerate missing preview files.
    }
  }

  if (!imagePath) {
    return null;
  }

  return generateArtworkPreview({
    imagePath,
    title,
    artistName,
    copyrightHolder
  });
}

function applyArtworkMediaHeaders(res, { downloadName } = {}) {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("X-Robots-Tag", "noindex, nofollow, noai, noimageai");
  res.set("Cross-Origin-Resource-Policy", "same-site");
  res.set("Cache-Control", "private, max-age=300, no-transform");
  res.set("Content-Security-Policy", "default-src 'none'; img-src 'self'; sandbox");
  if (downloadName) {
    res.set(
      "Content-Disposition",
      `attachment; filename="${String(downloadName).replace(/[^A-Za-z0-9._-]/g, "_")}"`
    );
  } else {
    res.set("Content-Disposition", "inline");
  }
}

module.exports = {
  UPLOADS_ROOT,
  SAFE_ARTWORK_FILENAME,
  getArtworksUploadDirectory,
  getArtworkPreviewsDirectory,
  ensureArtworkUploadDirectory,
  buildArtworkImagePath,
  buildArtworkPreviewPath,
  buildArtworkImageUrl,
  buildArtworkPreviewUrl,
  assertSafeRelativeUploadPath,
  assertSafeArtworkFilename,
  removeArtworkImageFile,
  generateArtworkPreview,
  ensureArtworkPreviewFile,
  applyArtworkMediaHeaders
};
