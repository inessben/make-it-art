const prisma = require("../lib/prisma");
const { extractArtistApplicationPayload } = require("../services/artist-contract.service");
const { ARTWORK_MODERATION_STATUS } = require("../constants/artwork-moderation-status");
const { parsePriceValue } = require("../utils/serialize-marketplace");
const { syncArtistCollectionsOwnership } = require("./collector.repository");

function buildArtworkInclude(viewerId) {
  return {
    category: true,
    artist: {
      include: {
        user: {
          include: {
            artistApplicationDraft: true
          }
        },
        _count: {
          select: {
            artworks: true,
            followers: true,
            collections: true
          }
        },
        followers: viewerId
          ? {
              where: {
                userId: viewerId
              },
              select: {
                id: true
              }
            }
          : false
      }
    },
    _count: {
      select: {
        favorites: true
      }
    },
    favorites: viewerId
      ? {
          where: {
            userId: viewerId
          },
          select: {
            id: true
          }
        }
      : false
  };
}

function buildArtistInclude(viewerId) {
  return {
    user: {
      include: {
        artistApplicationDraft: true
      }
    },
    _count: {
      select: {
        artworks: true,
        followers: true,
        collections: true
      }
    },
    artworks: {
      where: {
        moderationStatus: ARTWORK_MODERATION_STATUS.APPROVED
      },
      select: {
        id: true
      }
    },
    followers: viewerId
      ? {
          where: {
            userId: viewerId
          },
          select: {
            id: true
          }
        }
      : false,
    collections: {
      where: {
        artistId: {
          not: null
        },
        isPrivate: false,
        isDefaultFavorites: false
      },
      orderBy: [
        {
          createdAt: "desc"
        },
        {
          id: "desc"
        }
      ],
      include: {
        items: {
          where: {
            artwork: {
              moderationStatus: ARTWORK_MODERATION_STATUS.APPROVED
            }
          },
          take: 4,
          include: {
            artwork: {
              include: buildArtworkInclude(viewerId)
            }
          }
        }
      }
    }
  };
}

function matchesSearch(value, search) {
  if (!search) {
    return true;
  }

  return String(value || "")
    .toLowerCase()
    .includes(search);
}

function applyArtworkFilters(artworks, { search, style, artType, categoryId }) {
  return artworks.filter((artwork) => {
    const payload = extractArtistApplicationPayload(artwork.artist?.user?.artistApplicationDraft);
    const normalizedSearch = search.toLowerCase();
    const normalizedStyle = style.toLowerCase();
    const normalizedArtType = artType.toLowerCase();

    const matchesSearchTerm =
      !normalizedSearch ||
      matchesSearch(artwork.title, normalizedSearch) ||
      matchesSearch(artwork.description, normalizedSearch) ||
      matchesSearch(artwork.category?.name, normalizedSearch) ||
      matchesSearch(artwork.artist?.displayName, normalizedSearch) ||
      matchesSearch(artwork.artist?.user?.username, normalizedSearch) ||
      matchesSearch(payload.artType, normalizedSearch) ||
      (Array.isArray(payload.styles) &&
        payload.styles.some((item) => matchesSearch(item, normalizedSearch)));

    const matchesStyle =
      !normalizedStyle ||
      (Array.isArray(payload.styles) &&
        payload.styles.some((item) => matchesSearch(item, normalizedStyle)));

    const matchesArtType = !normalizedArtType || matchesSearch(payload.artType, normalizedArtType);

    const matchesCategory = !categoryId || Number(artwork.categoryId) === categoryId;

    return matchesSearchTerm && matchesStyle && matchesArtType && matchesCategory;
  });
}

function sortArtworks(artworks, sort) {
  if (sort === "popular") {
    return artworks.sort((left, right) => {
      return (right._count?.favorites || 0) - (left._count?.favorites || 0) || right.id - left.id;
    });
  }

  if (sort === "price-asc" || sort === "price-desc") {
    return artworks.sort((left, right) => {
      const leftPrice = Number.isSafeInteger(left.priceAmount)
        ? left.priceAmount / 100
        : parsePriceValue(left.price || left.priceTokens);
      const rightPrice = Number.isSafeInteger(right.priceAmount)
        ? right.priceAmount / 100
        : parsePriceValue(right.price || right.priceTokens);

      if (leftPrice === null && rightPrice === null) {
        return right.id - left.id;
      }

      if (leftPrice === null) {
        return 1;
      }

      if (rightPrice === null) {
        return -1;
      }

      return sort === "price-asc" ? leftPrice - rightPrice : rightPrice - leftPrice;
    });
  }

  return artworks.sort((left, right) => {
    return (
      new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime() ||
      right.id - left.id
    );
  });
}

function applyArtistFilters(artists, { search, style, artType }) {
  return artists.filter((artist) => {
    const payload = extractArtistApplicationPayload(artist.user?.artistApplicationDraft);
    const normalizedSearch = search.toLowerCase();
    const normalizedStyle = style.toLowerCase();
    const normalizedArtType = artType.toLowerCase();

    const matchesSearchTerm =
      !normalizedSearch ||
      matchesSearch(artist.displayName, normalizedSearch) ||
      matchesSearch(artist.user?.username, normalizedSearch) ||
      matchesSearch(artist.user?.bio, normalizedSearch) ||
      matchesSearch(payload.artType, normalizedSearch) ||
      matchesSearch(payload.socialHandle, normalizedSearch) ||
      (Array.isArray(payload.styles) &&
        payload.styles.some((item) => matchesSearch(item, normalizedSearch)));

    const matchesStyle =
      !normalizedStyle ||
      (Array.isArray(payload.styles) &&
        payload.styles.some((item) => matchesSearch(item, normalizedStyle)));

    const matchesArtType = !normalizedArtType || matchesSearch(payload.artType, normalizedArtType);

    return matchesSearchTerm && matchesStyle && matchesArtType;
  });
}

function sortArtists(artists, sort) {
  if (sort === "latest") {
    return artists.sort((left, right) => {
      return (
        new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime() ||
        right.id - left.id
      );
    });
  }

  return artists.sort((left, right) => {
    const followerDelta = (right._count?.followers || 0) - (left._count?.followers || 0);

    if (followerDelta !== 0) {
      return followerDelta;
    }

    return (right._count?.artworks || 0) - (left._count?.artworks || 0) || right.id - left.id;
  });
}

async function listPublicArtworks({
  viewerId = null,
  search = "",
  style = "",
  artType = "",
  categoryId = null,
  sort = "latest",
  limit = 24
} = {}) {
  const artworks = await prisma.artwork.findMany({
    where: {
      moderationStatus: ARTWORK_MODERATION_STATUS.APPROVED,
      artist: {
        verified: true
      }
    },
    include: buildArtworkInclude(viewerId)
  });

  const filtered = applyArtworkFilters(artworks, {
    search,
    style,
    artType,
    categoryId
  });

  return sortArtworks(filtered, sort).slice(0, limit);
}

async function findPublicArtworkById({ artworkId, viewerId = null }) {
  const artwork = await prisma.artwork.findUnique({
    where: {
      id: artworkId
    },
    include: buildArtworkInclude(viewerId)
  });

  if (!artwork || !artwork.artist?.verified) {
    return null;
  }

  if (artwork.moderationStatus !== ARTWORK_MODERATION_STATUS.APPROVED) {
    return null;
  }

  return artwork;
}

async function listRelatedArtworks({
  viewerId = null,
  artworkId,
  artistId,
  categoryId,
  limit = 4
}) {
  const artistMatches = await prisma.artwork.findMany({
    where: {
      id: {
        not: artworkId
      },
      artistId,
      moderationStatus: ARTWORK_MODERATION_STATUS.APPROVED,
      artist: {
        verified: true
      }
    },
    take: limit,
    include: buildArtworkInclude(viewerId),
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ]
  });

  if (artistMatches.length >= limit || !categoryId) {
    return artistMatches;
  }

  const categoryMatches = await prisma.artwork.findMany({
    where: {
      id: {
        notIn: [artworkId, ...artistMatches.map((item) => item.id)]
      },
      categoryId,
      moderationStatus: ARTWORK_MODERATION_STATUS.APPROVED,
      artist: {
        verified: true
      }
    },
    take: limit - artistMatches.length,
    include: buildArtworkInclude(viewerId),
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ]
  });

  return [...artistMatches, ...categoryMatches];
}

async function listPublicArtists({
  viewerId = null,
  search = "",
  style = "",
  artType = "",
  sort = "featured",
  limit = 18
} = {}) {
  const verifiedArtists = await prisma.artist.findMany({
    where: {
      verified: true
    },
    select: {
      userId: true
    }
  });

  await Promise.all(
    [...new Set(verifiedArtists.map((artist) => artist.userId).filter(Boolean))].map((userId) =>
      syncArtistCollectionsOwnership(userId)
    )
  );

  const artists = await prisma.artist.findMany({
    where: {
      verified: true
    },
    include: buildArtistInclude(viewerId)
  });

  const filtered = applyArtistFilters(artists, {
    search,
    style,
    artType
  });

  return sortArtists(filtered, sort).slice(0, limit);
}

async function findPublicArtistById({ artistId, viewerId = null }) {
  const artistOwner = await prisma.artist.findUnique({
    where: {
      id: artistId
    },
    select: {
      userId: true,
      verified: true
    }
  });

  if (!artistOwner || !artistOwner.verified) {
    return null;
  }

  await syncArtistCollectionsOwnership(artistOwner.userId);

  const artist = await prisma.artist.findUnique({
    where: {
      id: artistId
    },
    include: {
      ...buildArtistInclude(viewerId),
      artworks: {
        where: {
          moderationStatus: ARTWORK_MODERATION_STATUS.APPROVED
        },
        include: buildArtworkInclude(viewerId),
        orderBy: [
          {
            createdAt: "desc"
          },
          {
            id: "desc"
          }
        ]
      }
    }
  });

  if (!artist || !artist.verified) {
    return null;
  }

  return artist;
}

async function findPublicMemberById({ userId }) {
  const member = await prisma.user.findUnique({
    where: {
      id: userId
    },
    include: {
      admin: true,
      artist: {
        include: {
          _count: {
            select: {
              artworks: true,
              followers: true,
              collections: true
            }
          }
        }
      }
    }
  });

  if (!member || member.admin || member.role === "admin") {
    return null;
  }

  return member;
}

async function getMarketplaceOverview({ viewerId = null } = {}) {
  const [artworks, artists, artworksCount, artistsCount] = await Promise.all([
    listPublicArtworks({
      viewerId,
      limit: 6,
      sort: "popular"
    }),
    listPublicArtists({
      viewerId,
      limit: 4,
      sort: "featured"
    }),
    prisma.artwork.count({
      where: {
        moderationStatus: ARTWORK_MODERATION_STATUS.APPROVED,
        artist: {
          verified: true
        }
      }
    }),
    prisma.artist.count({
      where: {
        verified: true
      }
    })
  ]);

  return {
    artworks,
    artists,
    stats: {
      artworks: artworksCount,
      artists: artistsCount
    }
  };
}

async function listCollectionArtworkOptions({ viewerId, limit = 60 } = {}) {
  return listPublicArtworks({
    viewerId,
    limit,
    sort: "latest"
  });
}

module.exports = {
  listPublicArtworks,
  findPublicArtworkById,
  listRelatedArtworks,
  listPublicArtists,
  findPublicArtistById,
  findPublicMemberById,
  getMarketplaceOverview,
  listCollectionArtworkOptions
};
