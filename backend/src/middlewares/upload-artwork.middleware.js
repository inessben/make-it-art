const crypto = require("node:crypto");
const path = require("node:path");
const multer = require("multer");
const {
  ensureArtworkUploadDirectory,
  getArtworksUploadDirectory,
} = require("../services/artwork-media.service");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try {
      await ensureArtworkUploadDirectory();
      callback(null, getArtworksUploadDirectory());
    } catch (error) {
      callback(error);
    }
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExtension = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(
      extension,
    )
      ? extension
      : ".jpg";

    callback(null, `${Date.now()}-${crypto.randomUUID()}${safeExtension}`);
  },
});

const uploadArtworkImage = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(
        new Error(
          "Format non supporte. Utilisez une image JPG, PNG, WEBP ou GIF.",
        ),
      );
      return;
    }

    callback(null, true);
  },
}).single("image");

function handleArtworkUpload(req, res, next) {
  uploadArtworkImage(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "L'image ne doit pas depasser 10 Mo.",
      });
    }

    return res.status(400).json({
      message: error.message || "Impossible de traiter le fichier image.",
    });
  });
}

module.exports = {
  handleArtworkUpload,
};
