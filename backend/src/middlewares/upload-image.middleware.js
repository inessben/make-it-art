const crypto = require("node:crypto");
const path = require("node:path");
const multer = require("multer");
const {
  UPLOADS_ROOT,
  buildUploadedImagePath,
  ensureUploadedImageDirectory
} = require("../services/uploaded-image.service");

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function buildStorage(relativeDirectory) {
  return multer.diskStorage({
    destination: async (_req, _file, callback) => {
      try {
        await ensureUploadedImageDirectory(relativeDirectory);
        callback(null, path.join(UPLOADS_ROOT, relativeDirectory));
      } catch (error) {
        callback(error);
      }
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || "").toLowerCase();
      const safeExtension = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension)
        ? extension
        : ".jpg";

      callback(null, `${Date.now()}-${crypto.randomUUID()}${safeExtension}`);
    }
  });
}

function createSingleImageUpload({
  fieldName,
  relativeDirectory,
  maxFileSizeBytes = 10 * 1024 * 1024
}) {
  const upload = multer({
    storage: buildStorage(relativeDirectory),
    limits: {
      fileSize: maxFileSizeBytes,
      files: 1
    },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        callback(new Error("Unsupported format. Use a JPG, PNG, WEBP or GIF image."));
        return;
      }

      callback(null, true);
    }
  }).single(fieldName);

  return (req, res, next) => {
    upload(req, res, (error) => {
      if (!error) {
        next();
        return;
      }

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `The image must not exceed ${Math.round(maxFileSizeBytes / (1024 * 1024))} MB.`
        });
      }

      return res.status(400).json({
        message: error.message || "Unable to process the uploaded image."
      });
    });
  };
}

function getUploadedImagePath(relativeDirectory, file) {
  if (!file?.filename) {
    return null;
  }

  return buildUploadedImagePath(relativeDirectory, file.filename);
}

module.exports = {
  createSingleImageUpload,
  getUploadedImagePath
};
