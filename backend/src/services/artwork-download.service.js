const fsp = require("node:fs/promises");
const path = require("node:path");
const { Readable } = require("node:stream");
const prisma = require("../lib/prisma");
const { getArtworkStorageProvider } = require("./artwork-storage");
const { buildArtworkImageUrl } = require("./artwork-media.service");
const { generateArtworkPreview } = require("./artwork-preview.service");

class ArtworkMediaAccessError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ArtworkMediaAccessError";
    this.status = status;
    this.code = code;
  }
}

function detectContentTypeFromKey(key, fallback = "application/octet-stream") {
  const extension = path.extname(String(key || "")).toLowerCase();

  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return fallback;
  }
}

async function keyExists(storage, key) {
  if (!key || typeof storage.resolveLocalPath !== "function") {
    return false;
  }

  try {
    await fsp.access(await storage.resolveLocalPath(key));
    return true;
  } catch (_error) {
    return false;
  }
}

function buildArtworkPreviewPlaceholder(artwork) {
  const title = String(artwork?.title || "Artwork").replace(/[<&>"]/g, "");
  const subtitle = String(artwork?.mediaStatus || "Preview unavailable").replace(/[<&>"]/g, "");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111616"/>
      <stop offset="100%" stop-color="#06080c"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#bg)"/>
  <circle cx="600" cy="360" r="120" fill="#6f2bff" opacity="0.2"/>
  <rect x="260" y="250" width="680" height="700" rx="36" fill="#0c1018" stroke="#7c3aed" stroke-opacity="0.35"/>
  <text x="600" y="570" text-anchor="middle" fill="#f8fafc" font-family="Arial, sans-serif" font-size="64" font-weight="700">${title}</text>
  <text x="600" y="645" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="28" letter-spacing="4">${subtitle}</text>
  <text x="600" y="720" text-anchor="middle" fill="#c4b5fd" font-family="Arial, sans-serif" font-size="24">Preview temporarily unavailable</text>
</svg>`;
}

async function persistRecoveredPreview(artwork, previewKey) {
  if (!artwork?.id || !previewKey) {
    return;
  }

  await prisma.artwork.update({
    where: { id: artwork.id },
    data: {
      previewPath: previewKey,
      imagePath: previewKey,
      mediaStatus: "ready"
    }
  });

  artwork.previewPath = previewKey;
  artwork.imagePath = previewKey;
}

async function openLocalPreviewStream(artwork, storage) {
  const previewKey = artwork.previewPath || artwork.imagePath;

  if (await keyExists(storage, previewKey)) {
    return {
      stream: await storage.getReadableStream(previewKey),
      key: previewKey,
      contentType: detectContentTypeFromKey(previewKey, "image/jpeg")
    };
  }

  const recoverySourceKey = [artwork.hdPath, artwork.imagePath].find(Boolean);

  if (await keyExists(storage, recoverySourceKey)) {
    const sourcePath = await storage.resolveLocalPath(recoverySourceKey);
    const preview = await generateArtworkPreview({
      sourcePath,
      applyWatermark: artwork.watermarkApplied !== false
    });
    const recoveredPreviewKey =
      artwork.previewPath || `artworks/preview/recovered-${artwork.id}-${Date.now()}.jpg`;

    try {
      await storage.putObject({
        key: recoveredPreviewKey,
        localPath: preview.path,
        contentType: preview.contentType
      });
      await persistRecoveredPreview(artwork, recoveredPreviewKey);
    } finally {
      await fsp.unlink(preview.path).catch(() => {});
    }

    return {
      stream: await storage.getReadableStream(recoveredPreviewKey),
      key: recoveredPreviewKey,
      contentType: "image/jpeg"
    };
  }

  return {
    stream: Readable.from([buildArtworkPreviewPlaceholder(artwork)]),
    key: "placeholder-preview.svg",
    contentType: "image/svg+xml"
  };
}

async function userOwnsArtistArtwork(userId, artwork) {
  if (!userId || !artwork?.artistId) {
    return false;
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artwork.artistId },
    select: { userId: true }
  });

  return artist?.userId === userId;
}

async function userHasPurchaseEntitlement(userId, artworkId) {
  if (!userId || !artworkId) {
    return false;
  }

  const entitlement = await prisma.digitalEntitlement.findFirst({
    where: {
      artworkId,
      userId,
      status: "ACTIVE",
      order: {
        status: {
          in: ["PAID", "PARTIALLY_REFUNDED"]
        }
      }
    },
    select: { id: true }
  });

  return Boolean(entitlement);
}

async function assertCanAccessHd(user, artwork) {
  if (!user?.id) {
    throw new ArtworkMediaAccessError(401, "AUTH_REQUIRED", "Authentication required.");
  }

  if (await userOwnsArtistArtwork(user.id, artwork)) {
    return;
  }

  if (await userHasPurchaseEntitlement(user.id, artwork.id)) {
    return;
  }

  throw new ArtworkMediaAccessError(
    403,
    "HD_FORBIDDEN",
    "Le fichier HD est reserve a l'artiste et aux acheteurs."
  );
}

async function resolveArtworkMediaUrl(artwork, variant = "preview") {
  if (!artwork) {
    return null;
  }

  if (variant === "hd") {
    if (!artwork.hdPath) {
      return artwork.imagePath ? buildArtworkImageUrl(artwork.imagePath) : null;
    }

    const storage = getArtworkStorageProvider(artwork.storageProvider || "local");
    return storage.getPublicUrl(artwork.hdPath);
  }

  const previewKey = artwork.previewPath || artwork.imagePath;
  if (!previewKey) {
    return null;
  }

  if ((artwork.storageProvider || "local") === "local") {
    return artwork.id
      ? `/api/artworks/${artwork.id}/media/preview`
      : buildArtworkImageUrl(previewKey);
  }

  const storage = getArtworkStorageProvider(artwork.storageProvider || "local");
  return storage.getPublicUrl(previewKey);
}

async function openArtworkMediaStream(artwork, variant = "preview") {
  const storage = getArtworkStorageProvider(artwork.storageProvider || "local");

  if (variant === "preview" && storage.name === "local") {
    return openLocalPreviewStream(artwork, storage);
  }

  const key =
    variant === "hd"
      ? artwork.hdPath || artwork.imagePath
      : artwork.previewPath || artwork.imagePath;

  if (!key) {
    throw new ArtworkMediaAccessError(404, "MEDIA_NOT_FOUND", "Media file not found.");
  }

  const stream = await storage.getReadableStream(key);

  return {
    stream,
    key,
    contentType:
      variant === "preview"
        ? detectContentTypeFromKey(key, "image/jpeg")
        : "application/octet-stream"
  };
}

module.exports = {
  ArtworkMediaAccessError,
  assertCanAccessHd,
  resolveArtworkMediaUrl,
  openArtworkMediaStream
};
