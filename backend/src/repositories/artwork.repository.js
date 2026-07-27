const prisma = require("../lib/prisma");
const { ARTWORK_MODERATION_STATUS } = require("../constants/artwork-moderation-status");
const { isExclusiveArtworkLicenseType } = require("../constants/artwork-license-types");
const { buildArtworkManagement } = require("../services/artwork-lifecycle.service");
const { writeAdminAuditLog } = require("../services/admin-audit.service");

const MAX_ARTWORK_PRICE_AMOUNT = 99_999_999;
const LEGACY_PRICE_PATTERN = /^(\d{1,6})(?:[.,](\d{1,2}))?\s*(?:€|eur|tokens?)?$/i;

const artworkLifecycleInclude = {
  orderItems: {
    where: {
      order: {
        status: {
          in: [
            "PENDING_PAYMENT",
            "PAYMENT_PROCESSING",
            "PAYMENT_REVIEW",
            "PAID",
            "PARTIALLY_REFUNDED",
            "REFUNDED"
          ]
        }
      }
    },
    select: {
      order: {
        select: {
          status: true
        }
      }
    }
  },
  reservations: {
    where: {
      status: "ACTIVE"
    },
    select: {
      id: true,
      status: true
    }
  }
};

function parsePriceAmount(price) {
  const normalized =
    typeof price === "number" ? String(price) : typeof price === "string" ? price.trim() : null;

  if (typeof normalized !== "string") {
    throw new Error("INVALID_ARTWORK_PRICE");
  }

  const match = normalized.match(LEGACY_PRICE_PATTERN);

  if (!match) {
    throw new Error("INVALID_ARTWORK_PRICE");
  }

  const majorAmount = Number(match[1]);
  const minorAmount = Number((match[2] || "").padEnd(2, "0") || "0");
  const priceAmount = majorAmount * 100 + minorAmount;

  if (
    !Number.isSafeInteger(priceAmount) ||
    priceAmount <= 0 ||
    priceAmount > MAX_ARTWORK_PRICE_AMOUNT
  ) {
    throw new Error("INVALID_ARTWORK_PRICE");
  }

  return priceAmount;
}

const artworkInclude = {
  category: true,
  artist: {
    include: {
      user: true
    }
  },
  moderatedByAdmin: {
    select: {
      id: true,
      username: true,
      email: true
    }
  },
  ...artworkLifecycleInclude
};

async function lockArtworkForManagement(transaction, artworkId) {
  await transaction.$queryRaw`SELECT "id" FROM "artwork" WHERE "id" = ${artworkId} FOR UPDATE`;
}

function artworkAuditSnapshot(artwork) {
  if (!artwork) {
    return null;
  }

  return {
    title: artwork.title || null,
    categoryId: artwork.categoryId || artwork.category?.id || null,
    priceAmount: Number.isSafeInteger(artwork.priceAmount) ? artwork.priceAmount : null,
    currency: artwork.currency || null,
    licenseType: artwork.licenseType || null,
    protection: Boolean(artwork.protection),
    visibility: artwork.visibility || "PUBLISHED",
    archivedAt:
      artwork.archivedAt instanceof Date
        ? artwork.archivedAt.toISOString()
        : artwork.archivedAt || null,
    moderationStatus: artwork.moderationStatus || null,
    version: Number.isSafeInteger(artwork.version) ? artwork.version : 1
  };
}

async function writeArtworkAuditLog(
  transaction,
  { action, artworkId, before, after, audit = {}, idempotent = false }
) {
  return writeAdminAuditLog(transaction, {
    actorUserId: audit.actorUserId,
    action,
    entityType: "ARTWORK",
    entityId: artworkId,
    ipAddress: audit.ipAddress,
    correlationId: audit.correlationId,
    metadata: {
      before: artworkAuditSnapshot(before),
      after: artworkAuditSnapshot(after),
      idempotent
    }
  });
}

async function listArtworksForAdmin() {
  return prisma.artwork.findMany({
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    include: {
      category: true,
      artist: {
        include: {
          user: true
        }
      },
      moderatedByAdmin: {
        select: {
          id: true,
          username: true,
          email: true
        }
      },
      _count: {
        select: {
          favorites: true,
          orderItems: true
        }
      }
    }
  });
}

async function listArtworksByArtistId(artistId) {
  return prisma.artwork.findMany({
    where: {
      artistId
    },
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    include: artworkInclude
  });
}

async function findOwnedArtwork({ artworkId, artistId, prismaClient = prisma }) {
  return prismaClient.artwork.findFirst({
    where: {
      id: artworkId,
      artistId
    },
    include: artworkInclude
  });
}

async function createArtwork({
  artistId,
  title,
  description,
  categoryId,
  price,
  licenseType,
  protection,
  imagePath,
  hdPath = null,
  previewPath = null,
  storageProvider = "local",
  mediaStatus = "ready",
  watermarkApplied = false
}) {
  const priceAmount = parsePriceAmount(price);
  return prisma.artwork.create({
    data: {
      artistId,
      title,
      description: description || null,
      categoryId: categoryId || null,
      price,
      priceTokens: price,
      priceAmount,
      currency: "EUR",
      licenseType,
      saleStatus: "AVAILABLE",
      visibility: "PUBLISHED",
      stockQuantity: isExclusiveArtworkLicenseType(licenseType) ? 1 : 0,
      reservedQuantity: 0,
      favoriteCount: 0,
      protection: Boolean(protection),
      imagePath: imagePath || previewPath || null,
      hdPath: hdPath || null,
      previewPath: previewPath || imagePath || null,
      storageProvider: storageProvider || "local",
      mediaStatus: mediaStatus || "ready",
      watermarkApplied: Boolean(watermarkApplied),
      moderationStatus: ARTWORK_MODERATION_STATUS.APPROVED,
      moderationNote: null,
      moderatedAt: null,
      moderatedByAdminId: null,
      createdAt: new Date()
    },
    include: artworkInclude
  });
}

async function updateArtwork({
  artworkId,
  artistId,
  title,
  description,
  categoryId,
  price,
  licenseType,
  protection,
  expectedVersion,
  media = null,
  audit = {}
}) {
  const priceAmount = parsePriceAmount(price);

  return prisma.$transaction(
    async (transaction) => {
      await lockArtworkForManagement(transaction, artworkId);
      const existing = await findOwnedArtwork({
        artworkId,
        artistId,
        prismaClient: transaction
      });

      if (!existing) {
        throw new Error("ARTWORK_NOT_FOUND");
      }

      const management = buildArtworkManagement(existing);
      if (!management.capabilities.canEdit) {
        throw new Error(management.capabilities.reasons.edit);
      }

      if (!Number.isSafeInteger(expectedVersion) || existing.version !== expectedVersion) {
        throw new Error("ARTWORK_VERSION_CONFLICT");
      }

      const licenseChanged = existing.licenseType !== licenseType;
      const shouldPublishDraft =
        existing.saleStatus === "DRAFT" &&
        existing.stockQuantity === 0 &&
        existing.reservedQuantity === 0;
      const result = await transaction.artwork.updateMany({
        where: {
          id: artworkId,
          artistId,
          version: expectedVersion
        },
        data: {
          title,
          description: description || null,
          categoryId: categoryId || null,
          price,
          priceTokens: price,
          priceAmount,
          currency: "EUR",
          licenseType,
          ...(licenseChanged
            ? {
                saleStatus: "AVAILABLE",
                stockQuantity: isExclusiveArtworkLicenseType(licenseType) ? 1 : 0
              }
            : {}),
          ...(shouldPublishDraft
            ? {
                saleStatus: "AVAILABLE",
                stockQuantity: isExclusiveArtworkLicenseType(licenseType) ? 1 : 0
              }
            : {}),
          protection: Boolean(protection),
          ...(media
            ? {
                imagePath: media.imagePath,
                hdPath: media.hdPath,
                previewPath: media.previewPath,
                storageProvider: media.storageProvider,
                mediaStatus: media.mediaStatus,
                watermarkApplied: Boolean(media.watermarkApplied)
              }
            : {}),
          version: {
            increment: 1
          }
        }
      });

      if (result.count !== 1) {
        throw new Error("ARTWORK_VERSION_CONFLICT");
      }

      const updated = await findOwnedArtwork({ artworkId, artistId, prismaClient: transaction });
      await writeArtworkAuditLog(transaction, {
        action: "ARTWORK_UPDATED",
        artworkId,
        before: existing,
        after: updated,
        audit
      });
      return updated;
    },
    {
      isolationLevel: "Serializable"
    }
  );
}

async function deleteArtwork({ artworkId, artistId, expectedVersion, audit = {} }) {
  return prisma.$transaction(
    async (transaction) => {
      await lockArtworkForManagement(transaction, artworkId);
      const existing = await findOwnedArtwork({
        artworkId,
        artistId,
        prismaClient: transaction
      });

      if (!existing) {
        throw new Error("ARTWORK_NOT_FOUND");
      }

      const management = buildArtworkManagement(existing);
      if (!management.capabilities.canDelete) {
        throw new Error(management.capabilities.reasons.delete);
      }

      if (!Number.isSafeInteger(expectedVersion) || existing.version !== expectedVersion) {
        throw new Error("ARTWORK_VERSION_CONFLICT");
      }

      await transaction.cartItem.deleteMany({ where: { artworkId } });
      await transaction.favorite.deleteMany({ where: { artworkId } });
      await transaction.collectionItem.deleteMany({ where: { artworkId } });
      await transaction.inventoryReservation.deleteMany({
        where: {
          artworkId,
          status: {
            not: "ACTIVE"
          }
        }
      });

      const result = await transaction.artwork.deleteMany({
        where: {
          id: artworkId,
          artistId,
          version: expectedVersion
        }
      });

      if (result.count !== 1) {
        throw new Error("ARTWORK_VERSION_CONFLICT");
      }

      await writeArtworkAuditLog(transaction, {
        action: "ARTWORK_DELETED",
        artworkId,
        before: existing,
        after: null,
        audit
      });
      return existing;
    },
    {
      isolationLevel: "Serializable"
    }
  );
}

async function hideArtwork({ artworkId, artistId, expectedVersion, audit = {} }) {
  return prisma.$transaction(
    async (transaction) => {
      await lockArtworkForManagement(transaction, artworkId);
      const existing = await findOwnedArtwork({
        artworkId,
        artistId,
        prismaClient: transaction
      });

      if (!existing) {
        throw new Error("ARTWORK_NOT_FOUND");
      }

      if (existing.visibility === "HIDDEN") {
        await writeArtworkAuditLog(transaction, {
          action: "ARTWORK_HIDDEN",
          artworkId,
          before: existing,
          after: existing,
          audit,
          idempotent: true
        });
        return existing;
      }

      const management = buildArtworkManagement(existing);
      if (!management.capabilities.canHide) {
        throw new Error(management.capabilities.reasons.hide);
      }

      if (!Number.isSafeInteger(expectedVersion) || existing.version !== expectedVersion) {
        throw new Error("ARTWORK_VERSION_CONFLICT");
      }

      const result = await transaction.artwork.updateMany({
        where: {
          id: artworkId,
          artistId,
          visibility: "PUBLISHED",
          version: expectedVersion
        },
        data: {
          visibility: "HIDDEN",
          version: {
            increment: 1
          }
        }
      });

      if (result.count !== 1) {
        throw new Error("ARTWORK_VERSION_CONFLICT");
      }

      const hidden = await findOwnedArtwork({ artworkId, artistId, prismaClient: transaction });
      await writeArtworkAuditLog(transaction, {
        action: "ARTWORK_HIDDEN",
        artworkId,
        before: existing,
        after: hidden,
        audit
      });
      return hidden;
    },
    {
      isolationLevel: "Serializable"
    }
  );
}

async function publishArtwork({ artworkId, artistId, expectedVersion, audit = {} }) {
  return prisma.$transaction(
    async (transaction) => {
      await lockArtworkForManagement(transaction, artworkId);
      const existing = await findOwnedArtwork({
        artworkId,
        artistId,
        prismaClient: transaction
      });

      if (!existing) {
        throw new Error("ARTWORK_NOT_FOUND");
      }

      if (existing.visibility === "PUBLISHED") {
        await writeArtworkAuditLog(transaction, {
          action: "ARTWORK_PUBLISHED",
          artworkId,
          before: existing,
          after: existing,
          audit,
          idempotent: true
        });
        return existing;
      }

      const management = buildArtworkManagement(existing);
      if (!management.capabilities.canPublish) {
        throw new Error(management.capabilities.reasons.publish);
      }

      if (!Number.isSafeInteger(expectedVersion) || existing.version !== expectedVersion) {
        throw new Error("ARTWORK_VERSION_CONFLICT");
      }

      const result = await transaction.artwork.updateMany({
        where: {
          id: artworkId,
          artistId,
          visibility: "HIDDEN",
          moderationStatus: "approved",
          version: expectedVersion
        },
        data: {
          visibility: "PUBLISHED",
          version: {
            increment: 1
          }
        }
      });

      if (result.count !== 1) {
        throw new Error("ARTWORK_VERSION_CONFLICT");
      }

      const published = await findOwnedArtwork({ artworkId, artistId, prismaClient: transaction });
      await writeArtworkAuditLog(transaction, {
        action: "ARTWORK_PUBLISHED",
        artworkId,
        before: existing,
        after: published,
        audit
      });
      return published;
    },
    {
      isolationLevel: "Serializable"
    }
  );
}

async function archiveArtwork({
  artworkId,
  artistId,
  expectedVersion,
  archivedAt = new Date(),
  audit = {}
}) {
  return prisma.$transaction(
    async (transaction) => {
      await lockArtworkForManagement(transaction, artworkId);
      const existing = await findOwnedArtwork({
        artworkId,
        artistId,
        prismaClient: transaction
      });

      if (!existing) {
        throw new Error("ARTWORK_NOT_FOUND");
      }

      if (existing.visibility === "ARCHIVED") {
        await writeArtworkAuditLog(transaction, {
          action: "ARTWORK_ARCHIVED",
          artworkId,
          before: existing,
          after: existing,
          audit,
          idempotent: true
        });
        return existing;
      }

      const management = buildArtworkManagement(existing);
      if (!management.capabilities.canArchive) {
        throw new Error(management.capabilities.reasons.archive);
      }

      if (!Number.isSafeInteger(expectedVersion) || existing.version !== expectedVersion) {
        throw new Error("ARTWORK_VERSION_CONFLICT");
      }

      const result = await transaction.artwork.updateMany({
        where: {
          id: artworkId,
          artistId,
          visibility: {
            in: ["PUBLISHED", "HIDDEN"]
          },
          version: expectedVersion
        },
        data: {
          visibility: "ARCHIVED",
          archivedAt,
          version: {
            increment: 1
          }
        }
      });

      if (result.count !== 1) {
        throw new Error("ARTWORK_VERSION_CONFLICT");
      }

      const archived = await findOwnedArtwork({ artworkId, artistId, prismaClient: transaction });
      await writeArtworkAuditLog(transaction, {
        action: "ARTWORK_ARCHIVED",
        artworkId,
        before: existing,
        after: archived,
        audit
      });
      return archived;
    },
    {
      isolationLevel: "Serializable"
    }
  );
}

async function restoreArtwork({ artworkId, artistId, expectedVersion, audit = {} }) {
  return prisma.$transaction(
    async (transaction) => {
      await lockArtworkForManagement(transaction, artworkId);
      const existing = await findOwnedArtwork({
        artworkId,
        artistId,
        prismaClient: transaction
      });

      if (!existing) {
        throw new Error("ARTWORK_NOT_FOUND");
      }

      const management = buildArtworkManagement(existing);
      if (!management.capabilities.canRestore) {
        throw new Error(management.capabilities.reasons.restore);
      }

      if (!Number.isSafeInteger(expectedVersion) || existing.version !== expectedVersion) {
        throw new Error("ARTWORK_VERSION_CONFLICT");
      }

      const result = await transaction.artwork.updateMany({
        where: {
          id: artworkId,
          artistId,
          visibility: "ARCHIVED",
          version: expectedVersion
        },
        data: {
          visibility: "HIDDEN",
          archivedAt: null,
          version: {
            increment: 1
          }
        }
      });

      if (result.count !== 1) {
        throw new Error("ARTWORK_VERSION_CONFLICT");
      }

      const restored = await findOwnedArtwork({ artworkId, artistId, prismaClient: transaction });
      await writeArtworkAuditLog(transaction, {
        action: "ARTWORK_RESTORED",
        artworkId,
        before: existing,
        after: restored,
        audit
      });
      return restored;
    },
    {
      isolationLevel: "Serializable"
    }
  );
}

async function updateArtworkModeration({
  artworkId,
  status,
  moderationNote,
  moderatedByAdminId,
  prismaClient = prisma
}) {
  return prismaClient.artwork.update({
    where: {
      id: artworkId
    },
    data: {
      moderationStatus: status,
      moderationNote: moderationNote || null,
      moderatedAt: new Date(),
      moderatedByAdminId
    },
    include: {
      category: true,
      artist: {
        include: {
          user: true
        }
      },
      moderatedByAdmin: {
        select: {
          id: true,
          username: true,
          email: true
        }
      },
      _count: {
        select: {
          favorites: true,
          orderItems: true
        }
      }
    }
  });
}

module.exports = {
  listArtworksForAdmin,
  listArtworksByArtistId,
  findOwnedArtwork,
  createArtwork,
  updateArtwork,
  deleteArtwork,
  hideArtwork,
  publishArtwork,
  archiveArtwork,
  restoreArtwork,
  updateArtworkModeration
};
