const express = require("express");
const path = require("path");
const fsp = require("node:fs/promises");
const prisma = require("../lib/prisma");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { artworkMediaRateLimit } = require("../middlewares/rate-limit.middleware");
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
const {
  ArtworkMediaAccessError,
  assertCanAccessHd,
  openArtworkMediaStream
} = require("../services/artwork-download.service");

const router = express.Router();

async function loadArtwork(req, res, next) {
  const artworkId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return res.status(400).json({ message: "Invalid artwork id." });
  }

  try {
    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      select: {
        id: true,
        artistId: true,
        title: true,
        imagePath: true,
        hdPath: true,
        previewPath: true,
        storageProvider: true,
        watermarkApplied: true,
        mediaStatus: true
      }
    });

    if (!artwork) {
      return res.status(404).json({ message: "Artwork not found." });
    }

    req.artworkMedia = artwork;
    return next();
  } catch (error) {
    console.error("Artwork media lookup error:", error);
    return res.status(500).json({ message: "Unable to load artwork media." });
  }
}

function pipeMedia(res, { stream, contentType, filename, disposition = "inline" }) {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", disposition === "inline" ? "public, max-age=86400" : "private");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noai, noimageai");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  if (filename) {
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${filename.replace(/"/g, "")}"`
    );
  }
  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(404).end();
    } else {
      res.end();
    }
  });
  stream.pipe(res);
}

async function findArtworkByPreviewFilename(filename) {
  const previewPath = `artworks/previews/${filename}`;
  const baseName = path.basename(filename, path.extname(filename));

  return prisma.artwork.findFirst({
    where: {
      OR: [
        { previewPath },
        { previewPath: `artworks/preview/${filename}` },
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

router.get("/artworks/:id(\\d+)/media/preview", loadArtwork, async (req, res) => {
  try {
    const payload = await openArtworkMediaStream(req.artworkMedia, "preview");
    applyArtworkMediaHeaders(res);
    return pipeMedia(res, {
      stream: payload.stream,
      contentType: payload.contentType,
      filename: `artwork-${req.artworkMedia.id}-preview.jpg`
    });
  } catch (error) {
    if (error instanceof ArtworkMediaAccessError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }

    console.error("Artwork preview stream error:", error);
    return res.status(500).json({ message: "Unable to stream artwork preview." });
  }
});

router.get("/artworks/:id(\\d+)/media/hd", authRequired, loadArtwork, async (req, res) => {
  try {
    await assertCanAccessHd(req.user, req.artworkMedia);
    const payload = await openArtworkMediaStream(req.artworkMedia, "hd");
    return pipeMedia(res, {
      stream: payload.stream,
      contentType: payload.contentType,
      filename: `artwork-${req.artworkMedia.id}-hd`,
      disposition: "attachment"
    });
  } catch (error) {
    if (error instanceof ArtworkMediaAccessError) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }

    console.error("Artwork HD stream error:", error);
    return res.status(500).json({ message: "Unable to download HD artwork." });
  }
});

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
        ({ absolutePath: absolutePreviewPath } = assertSafeRelativeUploadPath(previewRelativePath));
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
  "/artworks/hd/:filename",
  blockAiTrainingBots,
  artworkMediaRateLimit,
  async (_req, res) => {
    res.set("X-Robots-Tag", "noindex, nofollow, noai, noimageai");
    return res.status(403).json({
      message: "Original artwork files are protected. Use an entitled HD download endpoint.",
      code: "ARTWORK_ORIGINAL_PROTECTED"
    });
  }
);

router.get("/artworks/:filename", blockAiTrainingBots, artworkMediaRateLimit, async (req, res) => {
  res.set("X-Robots-Tag", "noindex, nofollow, noai, noimageai");
  return res.status(403).json({
    message:
      "Original artwork files are protected. Use the marketplace preview or an entitled download.",
    code: "ARTWORK_ORIGINAL_PROTECTED"
  });
});

// Static files must only be mounted under `/uploads` (see routes/index.js).
// Attaching them on the shared router would swallow `/admin/*` and other API routes
// when this router is also mounted at the API root.
const uploadsStatic = express.static(path.resolve(UPLOADS_ROOT), {
  fallthrough: false,
  maxAge: "1h",
  setHeaders(res) {
    res.set("X-Robots-Tag", "noindex, nofollow, noai, noimageai");
    res.set("Cross-Origin-Resource-Policy", "same-site");
    res.set("Cache-Control", "private, max-age=3600, no-transform");
  }
});

module.exports = router;
module.exports.uploadsStatic = uploadsStatic;
