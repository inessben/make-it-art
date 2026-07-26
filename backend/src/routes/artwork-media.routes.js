const express = require("express");
const path = require("path");
const fsp = require("node:fs/promises");
const prisma = require("../lib/prisma");
const {
  artworkMediaRateLimit
} = require("../middlewares/rate-limit.middleware");
const {
  blockAiTrainingBots,
  artworkAntiScrapingGuard
} = require("../middlewares/artwork-media-guard.middleware");
const {
  assertSafeArtworkFilename,
  assertSafeRelativeUploadPath,
  applyArtworkMediaHeaders,
  ensureArtworkPreviewFile,
  UPLOADS_ROOT
} = require("../services/artwork-media.service");

const router = express.Router();

async function findArtworkByPreviewFilename(filename) {
  const previewPath = `artworks/previews/${filename}`;
  const baseName = path.basename(filename, path.extname(filename));

  return prisma.artwork.findFirst({
    where: {
      OR: [
        { previewPath },
        { imagePath: { startsWith: `artworks/${baseName}.` } }
      ]
    },
    select: {
      id: true,
      title: true,
      imagePath: true,
      previewPath: true,
      artist: {
        select: {
          displayName: true,
          user: { select: { username: true } }
        }
      }
    }
  });
}

router.get(
  "/artworks/previews/:filename",
  blockAiTrainingBots,
  artworkAntiScrapingGuard,
  artworkMediaRateLimit,
  async (req, res) => {
    try {
      const filename = assertSafeArtworkFilename(req.params.filename);
      const previewRelativePath = `artworks/previews/${filename}`;
      let absolutePreviewPath;

      try {
        ({ absolutePath: absolutePreviewPath } =
          assertSafeRelativeUploadPath(previewRelativePath));
        await fsp.access(absolutePreviewPath);
      } catch (_missingPreview) {
        const artwork = await findArtworkByPreviewFilename(filename);
        if (!artwork?.imagePath) {
          return res.status(404).json({
            message: "Artwork preview not found",
            code: "ARTWORK_PREVIEW_NOT_FOUND"
          });
        }

        const artistName =
          artwork.artist?.displayName || artwork.artist?.user?.username || "Make it Art artist";
        const ensuredPreviewPath = await ensureArtworkPreviewFile({
          imagePath: artwork.imagePath,
          previewPath: artwork.previewPath,
          title: artwork.title,
          artistName,
          copyrightHolder: artistName
        });

        if (ensuredPreviewPath && ensuredPreviewPath !== artwork.previewPath) {
          await prisma.artwork.update({
            where: { id: artwork.id },
            data: { previewPath: ensuredPreviewPath }
          });
        }

        ({ absolutePath: absolutePreviewPath } = assertSafeRelativeUploadPath(
          ensuredPreviewPath || previewRelativePath
        ));
      }

      applyArtworkMediaHeaders(res);
      return res.sendFile(absolutePreviewPath);
    } catch (error) {
      if (error.message === "INVALID_UPLOAD_PATH") {
        return res.status(400).json({
          message: "Invalid artwork media path",
          code: "INVALID_UPLOAD_PATH"
        });
      }

      console.error("Artwork preview serve failed:", error);
      return res.status(500).json({
        message: "Artwork preview is temporarily unavailable",
        code: "ARTWORK_PREVIEW_UNAVAILABLE"
      });
    }
  }
);

router.get(
  "/artworks/:filename",
  blockAiTrainingBots,
  artworkMediaRateLimit,
  async (req, res) => {
    res.set("X-Robots-Tag", "noindex, nofollow, noai, noimageai");
    return res.status(403).json({
      message:
        "Original artwork files are protected. Use the marketplace preview or an entitled download.",
      code: "ARTWORK_ORIGINAL_PROTECTED"
    });
  }
);

router.use(
  express.static(path.resolve(UPLOADS_ROOT), {
    fallthrough: false,
    maxAge: "1h",
    setHeaders(res) {
      res.set("X-Robots-Tag", "noindex, nofollow, noai, noimageai");
      res.set("Cross-Origin-Resource-Policy", "same-site");
      res.set("Cache-Control", "private, max-age=3600, no-transform");
    }
  })
);

module.exports = router;
