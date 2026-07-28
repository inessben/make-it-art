const crypto = require("node:crypto");
const fsp = require("node:fs/promises");
const path = require("node:path");
const prisma = require("../lib/prisma");
const env = require("../config/env");
const { generateArtworkPreview } = require("./artwork-preview.service");
const { getArtworkStorageProvider } = require("./artwork-storage");
const { assertSafeRelativeUploadPath, UPLOADS_ROOT } = require("./artwork-media.service");

async function resolveLocalSourcePath(artwork) {
  const storageProvider = artwork.storageProvider || "local";
  if (storageProvider !== "local") {
    return null;
  }

  const candidates = [artwork.hdPath, artwork.imagePath, artwork.previewPath].filter(Boolean);
  for (const relative of candidates) {
    try {
      const { absolutePath } = assertSafeRelativeUploadPath(relative);
      await fsp.access(absolutePath);
      // Prefer HD / original over an already-watermarked preview when regenerating
      if (relative === artwork.previewPath && (artwork.hdPath || artwork.imagePath)) {
        continue;
      }
      return absolutePath;
    } catch (_error) {
      // try next
    }
  }

  // Last resort: existing preview (re-watermark)
  if (artwork.previewPath) {
    try {
      const { absolutePath } = assertSafeRelativeUploadPath(artwork.previewPath);
      await fsp.access(absolutePath);
      return absolutePath;
    } catch (_error) {
      return null;
    }
  }

  return null;
}

/**
 * Bake a visible anti-AI watermark into the public preview and persist paths.
 * HD / original files stay untouched for entitled downloads.
 */
async function ensureWatermarkedPreview(artwork, { force = false } = {}) {
  if (!artwork?.id) {
    return artwork;
  }

  if (artwork.watermarkApplied && artwork.previewPath && !force) {
    try {
      if ((artwork.storageProvider || "local") === "local") {
        const { absolutePath } = assertSafeRelativeUploadPath(artwork.previewPath);
        await fsp.access(absolutePath);
      }
      return artwork;
    } catch (_missing) {
      // regenerate below
    }
  }

  const sourcePath = await resolveLocalSourcePath(artwork);
  if (!sourcePath) {
    return artwork;
  }

  const storage = getArtworkStorageProvider(artwork.storageProvider || "local");
  const assetId = path.basename(
    artwork.hdPath || artwork.previewPath || artwork.imagePath || crypto.randomUUID(),
    path.extname(artwork.hdPath || artwork.previewPath || artwork.imagePath || "")
  );
  const previewKey = `artworks/preview/${assetId || crypto.randomUUID()}.jpg`;
  let previewLocalPath = null;

  try {
    const preview = await generateArtworkPreview({
      sourcePath,
      applyWatermark: true,
      watermarkText: env.artworkMedia.watermarkText,
      title: artwork.title || "",
      artist: artwork.artist?.displayName || artwork.artist?.user?.username || ""
    });
    previewLocalPath = preview.path;

    await storage.putObject({
      key: previewKey,
      localPath: preview.path,
      contentType: preview.contentType
    });

    const updated = await prisma.artwork.update({
      where: { id: artwork.id },
      data: {
        previewPath: previewKey,
        imagePath: previewKey,
        watermarkApplied: true,
        mediaStatus: "ready"
      }
    });

    return { ...artwork, ...updated, watermarkApplied: true };
  } finally {
    if (previewLocalPath) {
      await fsp.unlink(previewLocalPath).catch(() => {});
    }
  }
}

async function backfillArtworkWatermarks({ force = false, limit = 200 } = {}) {
  const artworks = await prisma.artwork.findMany({
    where: force
      ? undefined
      : {
          OR: [{ watermarkApplied: false }, { previewPath: null }]
        },
    take: Math.max(1, Math.min(1000, Number(limit) || 200)),
    orderBy: { id: "asc" },
    include: {
      artist: {
        select: {
          displayName: true,
          user: { select: { username: true } }
        }
      }
    }
  });

  const results = [];
  for (const artwork of artworks) {
    try {
      const updated = await ensureWatermarkedPreview(artwork, { force });
      results.push({
        id: artwork.id,
        ok: Boolean(updated?.watermarkApplied),
        previewPath: updated?.previewPath || null
      });
    } catch (error) {
      results.push({
        id: artwork.id,
        ok: false,
        error: error.message || String(error)
      });
    }
  }

  return {
    processed: results.length,
    succeeded: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results
  };
}

module.exports = {
  ensureWatermarkedPreview,
  backfillArtworkWatermarks,
  UPLOADS_ROOT
};
