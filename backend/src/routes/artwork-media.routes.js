const express = require("express");
const prisma = require("../lib/prisma");
const { authRequired } = require("../middlewares/auth-required.middleware");
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

router.get("/artworks/:id(\\d+)/media/preview", loadArtwork, async (req, res) => {
  try {
    const payload = await openArtworkMediaStream(req.artworkMedia, "preview");
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

module.exports = router;
