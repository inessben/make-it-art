const prisma = require("../lib/prisma");
const { extractArtistApplicationPayload } = require("../services/artist-contract.service");
const { parsePriceValue } = require("../utils/serialize-marketplace");

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
        }
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

function applyArtworkFilters(artworks, { search, style, artType }) {
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

    return matchesSearchTerm && matchesStyle && matchesArtType;
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
      const leftPrice = parsePriceValue(left.price || left.priceTokens);
      const rightPrice = parsePriceValue(right.price || right.priceTokens);

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
  sort = "latest",
  limit = 24
} = {}) {
  const artworks = await prisma.artwork.findMany({
    where: {
      artist: {
        verified: true
      }
    },
    include: buildArtworkInclude(viewerId)
  });

  const filtered = applyArtworkFilters(artworks, {
    search,
    style,
    artType
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
  const artist = await prisma.artist.findUnique({
    where: {
      id: artistId
    },
    include: {
      ...buildArtistInclude(viewerId),
      artworks: {
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
  getMarketplaceOverview,
  listCollectionArtworkOptions
};
