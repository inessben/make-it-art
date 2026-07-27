const prisma = require("../lib/prisma");
const env = require("../config/env");
const fsp = require("node:fs/promises");
const path = require("node:path");
const {
  assertSafeRelativeUploadPath,
  applyArtworkMediaHeaders,
  buildArtworkImageUrl
} = require("./artwork-media.service");
const { getArtworkStorageProvider } = require("./artwork-storage");

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
    const safeTitle = String(entitlement.orderItem?.artworkTitle || entitlement.artwork.title || "artwork")
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
    return buildArtworkImageUrl(previewKey);
  }

  const storage = getArtworkStorageProvider(artwork.storageProvider || "local");
  return storage.getPublicUrl(previewKey);
}

async function openArtworkMediaStream(artwork, variant = "preview") {
  const key =
    variant === "hd"
      ? artwork.hdPath || artwork.imagePath
      : artwork.previewPath || artwork.imagePath;

  if (!key) {
    throw new ArtworkMediaAccessError(404, "MEDIA_NOT_FOUND", "Media file not found.");
  }

  const storage = getArtworkStorageProvider(artwork.storageProvider || "local");
  const stream = await storage.getReadableStream(key);

  return {
    stream,
    key,
    contentType: variant === "preview" ? "image/jpeg" : "application/octet-stream"
  };
}

module.exports = {
  ArtworkDownloadError,
  ArtworkMediaAccessError,
  defaultDownloadLimit,
  consumeArtworkDownload,
  sendArtworkFile,
  assertCanAccessHd,
  resolveArtworkMediaUrl,
  openArtworkMediaStream
};
