const express = require("express");
const prisma = require("../lib/prisma");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { getUserFromRequest } = require("../services/session.service");
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
        mediaStatus: true,
        visibility: true,
        moderationStatus: true
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

function pipeMedia(
  res,
  { stream, contentType, filename, disposition = "inline", cacheControl = null }
) {
  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Cache-Control",
    cacheControl || (disposition === "inline" ? "public, max-age=86400" : "private")
  );
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

function isPublicArtworkPreview(artwork) {
  return (
    artwork?.visibility === "PUBLISHED" &&
    String(artwork?.moderationStatus || "").toLowerCase() === "approved"
  );
}

async function canAccessPrivatePreview(req) {
  const user = await getUserFromRequest(req);

  if (!user) {
    return false;
  }

  try {
    await assertCanAccessHd(user, req.artworkMedia);
    return true;
  } catch (_error) {
    return false;
  }
}

router.get("/artworks/:id(\\d+)/media/preview", loadArtwork, async (req, res) => {
  try {
    const publicPreview = isPublicArtworkPreview(req.artworkMedia);

    if (!publicPreview && !(await canAccessPrivatePreview(req))) {
      res.setHeader("Cache-Control", "private, no-store");
      return res.status(404).json({ message: "Artwork not found." });
    }

    const payload = await openArtworkMediaStream(req.artworkMedia, "preview");
    if (!publicPreview) {
      res.setHeader("X-Robots-Tag", "noindex, noarchive");
    }
    return pipeMedia(res, {
      stream: payload.stream,
      contentType: payload.contentType,
      filename: `artwork-${req.artworkMedia.id}-preview.jpg`,
      cacheControl: publicPreview ? "public, max-age=86400" : "private, no-store"
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

module.exports = router;
