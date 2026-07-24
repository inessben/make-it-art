const prisma = require("../lib/prisma");

const DEFAULT_FAVORITES_TITLE = "Favoris";
const DEFAULT_FAVORITES_DESCRIPTION = "Vos oeuvres favorites et votre liste de souhaits.";

function getDbClient(tx) {
  return tx || prisma;
}

async function findDefaultFavoritesCollection(userId, tx) {
  const db = getDbClient(tx);

  return db.collection.findFirst({
    where: {
      userId,
      isDefaultFavorites: true
    }
  });
}

async function syncFavoritesIntoDefaultCollection(userId, collectionId, tx) {
  const db = getDbClient(tx);
  const favorites = await db.favorite.findMany({
    where: {
      userId
    },
    select: {
      artworkId: true
    }
  });

  for (const favorite of favorites) {
    const existingItem = await db.collectionItem.findFirst({
      where: {
        collectionId,
        artworkId: favorite.artworkId
      }
    });

    if (!existingItem) {
      await db.collectionItem.create({
        data: {
          collectionId,
          artworkId: favorite.artworkId
        }
      });
    }
  }
}

async function ensureDefaultFavoritesCollection(userId, tx) {
  const db = getDbClient(tx);
  let collection = await findDefaultFavoritesCollection(userId, db);

  if (!collection) {
    collection = await db.collection.create({
      data: {
        userId,
        title: DEFAULT_FAVORITES_TITLE,
        description: DEFAULT_FAVORITES_DESCRIPTION,
        isPrivate: true,
        isDefaultFavorites: true,
        createdAt: new Date()
      }
    });
  }

  await syncFavoritesIntoDefaultCollection(userId, collection.id, db);

  return collection;
}

async function addArtworkToDefaultFavoritesCollection(userId, artworkId, tx) {
  const db = getDbClient(tx);
  const collection = await ensureDefaultFavoritesCollection(userId, db);
  const existingItem = await db.collectionItem.findFirst({
    where: {
      collectionId: collection.id,
      artworkId
    }
  });

  if (!existingItem) {
    await db.collectionItem.create({
      data: {
        collectionId: collection.id,
        artworkId
      }
    });
  }
}

async function removeArtworkFromDefaultFavoritesCollection(userId, artworkId, tx) {
  const db = getDbClient(tx);
  const collection = await findDefaultFavoritesCollection(userId, db);

  if (!collection) {
    return;
  }

  await db.collectionItem.deleteMany({
    where: {
      collectionId: collection.id,
      artworkId
    }
  });
}

async function upsertFavoriteRecord(tx, userId, artworkId) {
  await tx.favorite.upsert({
    where: {
      userId_artworkId: {
        userId,
        artworkId
      }
    },
    create: {
      userId,
      artworkId,
      createdAt: new Date()
    },
    update: {}
  });

  await syncArtworkFavoriteCount(tx, artworkId);
}

async function deleteFavoriteRecord(tx, userId, artworkId) {
  await tx.favorite.deleteMany({
    where: {
      userId,
      artworkId
    }
  });

  const artwork = await tx.artwork.findUnique({
    where: {
      id: artworkId
    }
  });

  if (artwork) {
    await syncArtworkFavoriteCount(tx, artworkId);
  }
}

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
        followers: {
          where: {
            userId: viewerId
          },
          select: {
            id: true
          }
        }
      }
    },
    _count: {
      select: {
        favorites: true
      }
    },
    favorites: {
      where: {
        userId: viewerId
      },
      select: {
        id: true
      }
    }
  };
}

function buildCollectionInclude(userId) {
  return {
    items: {
      orderBy: [
        {
          id: "desc"
        }
      ],
      include: {
        artwork: {
          include: buildArtworkInclude(userId)
        }
      }
    }
  };
}

async function ensurePublicArtwork(artworkId) {
  const artwork = await prisma.artwork.findFirst({
    where: {
      id: artworkId,
      artist: {
        verified: true
      }
    }
  });

  if (!artwork) {
    throw new Error("ARTWORK_NOT_FOUND");
  }

  return artwork;
}

async function ensurePublicArtist(artistId) {
  const artist = await prisma.artist.findFirst({
    where: {
      id: artistId,
      verified: true
    }
  });

  if (!artist) {
    throw new Error("ARTIST_NOT_FOUND");
  }

  return artist;
}

async function syncArtworkFavoriteCount(tx, artworkId) {
  const count = await tx.favorite.count({
    where: {
      artworkId
    }
  });

  await tx.artwork.update({
    where: {
      id: artworkId
    },
    data: {
      favoriteCount: count
    }
  });
}

async function listFavoriteArtworks(userId) {
  await ensureDefaultFavoritesCollection(userId);

  const favorites = await prisma.favorite.findMany({
    where: {
      userId
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
      artwork: {
        include: buildArtworkInclude(userId)
      }
    }
  });

  return favorites.map((favorite) => favorite.artwork).filter(Boolean);
}

async function addFavorite({ userId, artworkId }) {
  await ensurePublicArtwork(artworkId);

  await prisma.$transaction(async (tx) => {
    await upsertFavoriteRecord(tx, userId, artworkId);
    await addArtworkToDefaultFavoritesCollection(userId, artworkId, tx);
  });
}

async function removeFavorite({ userId, artworkId }) {
  await prisma.$transaction(async (tx) => {
    await deleteFavoriteRecord(tx, userId, artworkId);
    await removeArtworkFromDefaultFavoritesCollection(userId, artworkId, tx);
  });
}

async function followArtist({ userId, artistId }) {
  await ensurePublicArtist(artistId);

  await prisma.follow.upsert({
    where: {
      userId_artistId: {
        userId,
        artistId
      }
    },
    create: {
      userId,
      artistId,
      createdAt: new Date()
    },
    update: {}
  });
}

async function unfollowArtist({ userId, artistId }) {
  await prisma.follow.deleteMany({
    where: {
      userId,
      artistId
    }
  });
}

async function listFollowedArtists(userId) {
  const follows = await prisma.follow.findMany({
    where: {
      userId
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
          followers: {
            where: {
              userId
            },
            select: {
              id: true
            }
          }
        }
      }
    }
  });

  return follows.map((follow) => follow.artist).filter(Boolean);
}

async function listPersonalCollections(userId) {
  await ensureDefaultFavoritesCollection(userId);

  return prisma.collection.findMany({
    where: {
      userId
    },
    orderBy: [
      {
        isDefaultFavorites: "desc"
      },
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    include: buildCollectionInclude(userId)
  });
}

async function createPersonalCollection({ userId, title, description, isPrivate }) {
  return prisma.collection.create({
    data: {
      userId,
      title,
      description,
      isPrivate,
      createdAt: new Date()
    },
    include: buildCollectionInclude(userId)
  });
}

async function findPersonalCollectionById({ userId, collectionId }) {
  return prisma.collection.findFirst({
    where: {
      id: collectionId,
      userId
    },
    include: buildCollectionInclude(userId)
  });
}

async function updatePersonalCollection({ userId, collectionId, title, description, isPrivate }) {
  const existingCollection = await findPersonalCollectionById({
    userId,
    collectionId
  });

  if (!existingCollection) {
    throw new Error("COLLECTION_NOT_FOUND");
  }

  if (existingCollection.isDefaultFavorites) {
    return prisma.collection.update({
      where: {
        id: collectionId
      },
      data: {
        description
      },
      include: buildCollectionInclude(userId)
    });
  }

  return prisma.collection.update({
    where: {
      id: collectionId
    },
    data: {
      title,
      description,
      isPrivate
    },
    include: buildCollectionInclude(userId)
  });
}

async function deletePersonalCollection({ userId, collectionId }) {
  const existingCollection = await findPersonalCollectionById({
    userId,
    collectionId
  });

  if (!existingCollection) {
    throw new Error("COLLECTION_NOT_FOUND");
  }

  if (existingCollection.isDefaultFavorites) {
    throw new Error("DEFAULT_FAVORITES_COLLECTION_PROTECTED");
  }

  await prisma.collection.delete({
    where: {
      id: collectionId
    }
  });
}

async function addArtworkToPersonalCollection({ userId, collectionId, artworkId }) {
  const existingCollection = await findPersonalCollectionById({
    userId,
    collectionId
  });

  if (!existingCollection) {
    throw new Error("COLLECTION_NOT_FOUND");
  }

  await ensurePublicArtwork(artworkId);

  if (existingCollection.isDefaultFavorites) {
    await addFavorite({
      userId,
      artworkId
    });

    return findPersonalCollectionById({
      userId,
      collectionId
    });
  }

  const existingItem = await prisma.collectionItem.findFirst({
    where: {
      collectionId,
      artworkId
    }
  });

  if (!existingItem) {
    await prisma.collectionItem.create({
      data: {
        collectionId,
        artworkId
      }
    });
  }

  return findPersonalCollectionById({
    userId,
    collectionId
  });
}

async function removeArtworkFromPersonalCollection({ userId, collectionId, artworkId }) {
  const existingCollection = await findPersonalCollectionById({
    userId,
    collectionId
  });

  if (!existingCollection) {
    throw new Error("COLLECTION_NOT_FOUND");
  }

  if (existingCollection.isDefaultFavorites) {
    await removeFavorite({
      userId,
      artworkId
    });

    return findPersonalCollectionById({
      userId,
      collectionId
    });
  }

  await prisma.collectionItem.deleteMany({
    where: {
      collectionId,
      artworkId
    }
  });

  return findPersonalCollectionById({
    userId,
    collectionId
  });
}

module.exports = {
  listFavoriteArtworks,
  addFavorite,
  removeFavorite,
  followArtist,
  unfollowArtist,
  listFollowedArtists,
  listPersonalCollections,
  createPersonalCollection,
  updatePersonalCollection,
  deletePersonalCollection,
  addArtworkToPersonalCollection,
  removeArtworkFromPersonalCollection,
  ensureDefaultFavoritesCollection
};
