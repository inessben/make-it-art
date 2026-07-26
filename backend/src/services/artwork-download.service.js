const prisma = require("../lib/prisma");
const env = require("../config/env");
const {
  assertSafeRelativeUploadPath,
  applyArtworkMediaHeaders
} = require("./artwork-media.service");
const fsp = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_DOWNLOAD_LIMIT = 5;

class ArtworkDownloadError extends Error {
  constructor(code, message, status = 403) {
    super(message);
    this.name = "ArtworkDownloadError";
    this.code = code;
    this.status = status;
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
            imagePath: true
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

    if (!entitlement.artwork?.imagePath) {
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

    const { absolutePath } = assertSafeRelativeUploadPath(entitlement.artwork.imagePath);
    await fsp.access(absolutePath);

    const extension = path.extname(entitlement.artwork.imagePath) || ".bin";
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

module.exports = {
  ArtworkDownloadError,
  defaultDownloadLimit,
  consumeArtworkDownload,
  sendArtworkFile
};
