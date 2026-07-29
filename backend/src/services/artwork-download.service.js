const fsp = require("node:fs/promises");
const path = require("node:path");
const { Readable } = require("node:stream");
const prisma = require("../lib/prisma");
const env = require("../config/env");
const {
  assertSafeRelativeUploadPath,
  applyArtworkMediaHeaders,
  buildArtworkImageUrl
} = require("./artwork-media.service");
const { getArtworkStorageProvider } = require("./artwork-storage");
const { buildPreviewWatermarkText, generateArtworkPreview } = require("./artwork-preview.service");

const DEFAULT_DOWNLOAD_LIMIT = 5;

class ArtworkDownloadError extends Error {
  constructor(code, message, status = 403) {
    super(message);
    this.name = "ArtworkDownloadError";
    this.code = code;
    this.status = status;
  }
}

class ArtworkMediaAccessError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ArtworkMediaAccessError";
    this.status = status;
    this.code = code;
  }
}

function defaultDownloadLimit() {
  const configured = Number(env.artworkDownloadLimit || DEFAULT_DOWNLOAD_LIMIT);
  return Number.isSafeInteger(configured) && configured > 0 ? configured : DEFAULT_DOWNLOAD_LIMIT;
}

async function consumeArtworkDownload({ userId, orderPublicId, orderItemId, now = new Date() }) {
  if (!Number.isSafeInteger(orderItemId) || orderItemId <= 0) {
    throw new ArtworkDownloadError("INVALID_ORDER_ITEM", "Invalid order item", 400);
  }

  return prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findFirst({
      where: { publicId: orderPublicId, userId },
      select: { id: true, status: true, publicId: true }
    });

    if (!order) {
      throw new ArtworkDownloadError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    const entitlement = await transaction.digitalEntitlement.findFirst({
      where: {
        orderId: order.id,
        orderItemId,
        userId
      },
      include: {
        artwork: {
          select: {
            id: true,
            title: true,
            imagePath: true,
            hdPath: true
          }
        },
        orderItem: {
          select: {
            id: true,
            artworkTitle: true
          }
        }
      }
    });

    if (!entitlement) {
      throw new ArtworkDownloadError(
        "DOWNLOAD_NOT_ENTITLED",
        "No digital download rights for this artwork",
        403
      );
    }

    if (entitlement.status === "SUSPENDED") {
      throw new ArtworkDownloadError(
        "DOWNLOAD_SUSPENDED",
        "Digital download rights are temporarily suspended",
        403
      );
    }

    if (entitlement.status !== "ACTIVE") {
      throw new ArtworkDownloadError(
        "DOWNLOAD_REVOKED",
        "Digital download rights are no longer available",
        403
      );
    }

    const downloadLimit =
      Number.isSafeInteger(entitlement.downloadLimit) && entitlement.downloadLimit > 0
        ? entitlement.downloadLimit
        : defaultDownloadLimit();

    if (entitlement.downloadCount >= downloadLimit) {
      throw new ArtworkDownloadError(
        "DOWNLOAD_LIMIT_REACHED",
        `Download limit of ${downloadLimit} has been reached`,
        429
      );
    }

    const filePath = entitlement.artwork?.hdPath || entitlement.artwork?.imagePath;
    if (!filePath) {
      throw new ArtworkDownloadError(
        "ARTWORK_FILE_MISSING",
        "The original artwork file is unavailable",
        404
      );
    }

    const updated = await transaction.digitalEntitlement.update({
      where: { id: entitlement.id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadedAt: now
      }
    });

    const { absolutePath } = assertSafeRelativeUploadPath(filePath);
    await fsp.access(absolutePath);

    const extension = path.extname(filePath) || ".bin";
    const safeTitle = String(
      entitlement.orderItem?.artworkTitle || entitlement.artwork.title || "artwork"
    )
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .slice(0, 80);

    return {
      absolutePath,
      downloadName: `${safeTitle}${extension}`,
      entitlement: {
        status: updated.status,
        downloadCount: updated.downloadCount,
        downloadLimit,
        lastDownloadedAt: updated.lastDownloadedAt
      }
    };
  });
}

function sendArtworkFile(res, { absolutePath, downloadName }) {
  applyArtworkMediaHeaders(res, { downloadName });
  res.set("Cache-Control", "private, no-store");
  return res.sendFile(absolutePath);
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
    const artistName = artwork.artist?.displayName || artwork.artist?.user?.username || "";
    const preview = await generateArtworkPreview({
      sourcePath,
      applyWatermark: artwork.watermarkApplied !== false,
      watermarkText: buildPreviewWatermarkText(artistName),
      title: artwork.title || "",
      artist: artistName,
      copyrightNotice: artistName ? `© ${artistName} — All rights reserved.` : ""
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

async function canAccessHd(user, artwork) {
  if (!user?.id || !artwork?.id) {
    return false;
  }

  if (await userOwnsArtistArtwork(user.id, artwork)) {
    return true;
  }

  if (await userHasPurchaseEntitlement(user.id, artwork.id)) {
    return true;
  }

  return false;
}

async function assertCanAccessHd(user, artwork) {
  if (!user?.id) {
    throw new ArtworkMediaAccessError(401, "AUTH_REQUIRED", "Authentication required.");
  }

  if (await canAccessHd(user, artwork)) {
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
    contentType: detectContentTypeFromKey(
      key,
      variant === "preview" ? "image/jpeg" : "application/octet-stream"
    )
  };
}

module.exports = {
  ArtworkDownloadError,
  ArtworkMediaAccessError,
  defaultDownloadLimit,
  consumeArtworkDownload,
  sendArtworkFile,
  canAccessHd,
  assertCanAccessHd,
  resolveArtworkMediaUrl,
  openArtworkMediaStream
};
