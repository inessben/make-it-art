const crypto = require("node:crypto");
const fsp = require("node:fs/promises");
const path = require("node:path");
const env = require("../config/env");
const {
  buildPreviewWatermarkText,
  generateArtworkPreview
} = require("./artwork-preview.service");
const { getArtworkStorageProvider } = require("./artwork-storage");

function extensionFromFilename(filename = "") {
  const extension = path.extname(filename).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension) ? extension : ".jpg";
}

function contentTypeFromExtension(extension) {
  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

async function processArtworkUpload({
  uploadedFile,
  applyWatermark = true,
  title = "",
  artistName = "",
  storageProviderName = env.artworkMedia.storageProvider
}) {
  if (!uploadedFile?.path) {
    throw new Error("ARTWORK_UPLOAD_REQUIRED");
  }

  const storage = getArtworkStorageProvider(storageProviderName);
  const assetId = `${Date.now()}-${crypto.randomUUID()}`;
  const hdExtension = extensionFromFilename(uploadedFile.originalname || uploadedFile.filename);
  const hdKey = `artworks/hd/${assetId}${hdExtension}`;
  const previewKey = `artworks/preview/${assetId}.jpg`;
  let previewLocalPath = null;

  try {
    const hdUpload = await storage.putObject({
      key: hdKey,
      localPath: uploadedFile.path,
      contentType: uploadedFile.mimetype || contentTypeFromExtension(hdExtension)
    });

    const preview = await generateArtworkPreview({
      sourcePath: uploadedFile.path,
      applyWatermark: applyWatermark !== false,
      watermarkText: buildPreviewWatermarkText(artistName),
      title,
      artist: artistName,
      copyrightNotice: artistName ? `© ${artistName} — All rights reserved.` : ""
    });
    previewLocalPath = preview.path;

    const previewUpload = await storage.putObject({
      key: previewKey,
      localPath: preview.path,
      contentType: preview.contentType
    });

    return {
      storageProvider: storage.name,
      mediaStatus: "ready",
      hdPath: hdUpload.key,
      previewPath: previewUpload.key,
      imagePath: previewUpload.key,
      watermarkApplied: preview.watermarkApplied,
      previewUrl: previewUpload.url,
      hdUrl: hdUpload.url
    };
  } finally {
    await Promise.allSettled([
      uploadedFile.path ? fsp.unlink(uploadedFile.path) : Promise.resolve(),
      previewLocalPath ? fsp.unlink(previewLocalPath) : Promise.resolve()
    ]);
  }
}

async function deleteArtworkMediaAssets(
  artwork,
  { action = "ARTWORK_MEDIA_DELETE", correlationId = null } = {}
) {
  if (!artwork) {
    return;
  }

  const storage = getArtworkStorageProvider(artwork.storageProvider || "local");
  const keys = [
    ...new Set([artwork.hdPath, artwork.previewPath, artwork.imagePath].filter(Boolean))
  ];

  await Promise.all(
    keys.map(async (key) => {
      let lastError = null;

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          await storage.deleteObject(key);
          return;
        } catch (error) {
          lastError = error;
        }
      }

      console.error("Artwork media deletion failed after retries", {
        action,
        correlationId,
        storageProvider: storage.name,
        key,
        reasonCode: lastError?.code || "ARTWORK_MEDIA_DELETE_FAILED"
      });
    })
  );
}

module.exports = {
  processArtworkUpload,
  deleteArtworkMediaAssets
};
