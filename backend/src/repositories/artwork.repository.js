const prisma = require("../lib/prisma");
const { ARTWORK_MODERATION_STATUS } = require("../constants/artwork-moderation-status");

const MAX_ARTWORK_PRICE_AMOUNT = 99_999_999;
const LEGACY_PRICE_PATTERN = /^(\d{1,6})(?:[.,](\d{1,2}))?\s*(?:€|eur|tokens?)?$/i;

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
  }
};

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

async function findOwnedArtwork({ artworkId, artistId }) {
  return prisma.artwork.findFirst({
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
  protection,
  imagePath,
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
      saleStatus: "AVAILABLE",
      stockQuantity: 1,
      reservedQuantity: 0,
      favoriteCount: 0,
      protection: Boolean(protection),
      imagePath: imagePath || null,
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
  protection,
  imagePath,
}) {
  const existing = await findOwnedArtwork({ artworkId, artistId });

  if (!existing) {
    throw new Error("ARTWORK_NOT_FOUND");
  }

  const priceAmount = parsePriceAmount(price);
  const shouldPublishDraft =
    existing.saleStatus === "DRAFT" &&
    existing.stockQuantity === 0 &&
    existing.reservedQuantity === 0;

  return prisma.artwork.update({
    where: {
      id: artworkId
    },
    data: {
      title,
      description: description || null,
      categoryId: categoryId || null,
      price,
      priceTokens: price,
      priceAmount,
      currency: "EUR",
      ...(shouldPublishDraft
        ? {
            saleStatus: "AVAILABLE",
            stockQuantity: 1
          }
        : {}),
      protection: Boolean(protection),
      ...(imagePath ? { imagePath } : {}),
    },
    include: artworkInclude
  });
}

async function deleteArtwork({ artworkId, artistId }) {
  const existing = await findOwnedArtwork({ artworkId, artistId });

  if (!existing) {
    throw new Error("ARTWORK_NOT_FOUND");
  }

  await prisma.artwork.delete({
    where: {
      id: artworkId
    }
  });

  return existing;
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
  updateArtworkModeration
};
