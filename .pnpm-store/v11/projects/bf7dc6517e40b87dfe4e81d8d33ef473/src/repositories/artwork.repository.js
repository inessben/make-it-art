const prisma = require("../lib/prisma");
const { ARTWORK_MODERATION_STATUS } = require("../constants/artwork-moderation-status");

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

async function createArtwork({ artistId, title, description, categoryId, price, protection }) {
  return prisma.artwork.create({
    data: {
      artistId,
      title,
      description: description || null,
      categoryId: categoryId || null,
      price,
      priceTokens: price,
      favoriteCount: 0,
      protection: Boolean(protection),
      moderationStatus: ARTWORK_MODERATION_STATUS.PENDING,
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
  protection
}) {
  const existing = await findOwnedArtwork({ artworkId, artistId });

  if (!existing) {
    throw new Error("ARTWORK_NOT_FOUND");
  }

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
      protection: Boolean(protection),
      moderationStatus: ARTWORK_MODERATION_STATUS.PENDING,
      moderationNote: null,
      moderatedAt: null,
      moderatedByAdminId: null
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

async function updateArtworkModeration({ artworkId, status, moderationNote, moderatedByAdminId }) {
  return prisma.artwork.update({
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
