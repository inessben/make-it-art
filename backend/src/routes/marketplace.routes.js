const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { isAdminUser } = require("../middlewares/admin-required.middleware");
const { getUserFromRequest } = require("../services/session.service");
const marketplaceRepository = require("../repositories/marketplace.repository");
const collectorRepository = require("../repositories/collector.repository");
const {
  serializeArtwork,
  serializeArtistSummary,
  serializeCollection,
} = require("../utils/serialize-marketplace");

const router = express.Router();

async function attachViewer(req, _res, next) {
  req.viewer = await getUserFromRequest(req);
  next();
}

function ensureCollectorAccount(req, res, next) {
  if (isAdminUser(req.user)) {
    return res.status(403).json({
      message:
        "Admin accounts cannot use collector features.",
    });
  }

  return next();
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLimit(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function serializeCollections(collections) {
  return collections
    .map((collection) => serializeCollection(collection))
    .filter(Boolean);
}

function mapRepositoryError(error) {
  if (error?.message === "ARTWORK_NOT_FOUND") {
    return {
      status: 404,
      message: "Artwork not found.",
    };
  }

  if (error?.message === "ARTIST_NOT_FOUND") {
    return {
      status: 404,
      message: "Artist not found.",
    };
  }

  if (error?.message === "COLLECTION_NOT_FOUND") {
    return {
      status: 404,
      message: "Collection not found.",
    };
  }

  return null;
}

router.get("/marketplace/overview", attachViewer, async (req, res) => {
  try {
    const overview = await marketplaceRepository.getMarketplaceOverview({
      viewerId: req.viewer?.id || null,
    });

    return res.status(200).json({
      stats: overview.stats,
      artworks: overview.artworks.map((artwork) => serializeArtwork(artwork)),
      artists: overview.artists.map((artist) => serializeArtistSummary(artist)),
    });
  } catch (error) {
    console.error("Marketplace overview error:", error);
    return res.status(500).json({
      message: "Unable to load the discovery page.",
    });
  }
});

router.get("/artworks", attachViewer, async (req, res) => {
  try {
    const artworks = await marketplaceRepository.listPublicArtworks({
      viewerId: req.viewer?.id || null,
      search: normalizeText(req.query.search).toLowerCase(),
      style: normalizeText(req.query.style).toLowerCase(),
      artType: normalizeText(req.query.artType).toLowerCase(),
      sort: normalizeText(req.query.sort) || "latest",
      limit: normalizeLimit(req.query.limit, 24, 80),
    });

    return res.status(200).json({
      artworks: artworks.map((artwork) => serializeArtwork(artwork)),
    });
  } catch (error) {
    console.error("Public artworks fetch error:", error);
    return res.status(500).json({
      message: "Unable to load the artwork catalogue.",
    });
  }
});

router.get("/artworks/:id(\\d+)", attachViewer, async (req, res) => {
  try {
    const artworkId = Number.parseInt(req.params.id, 10);
    const artwork = await marketplaceRepository.findPublicArtworkById({
      artworkId,
      viewerId: req.viewer?.id || null,
    });

    if (!artwork) {
      return res.status(404).json({
        message: "Artwork not found.",
      });
    }

    const relatedArtworks = await marketplaceRepository.listRelatedArtworks({
      viewerId: req.viewer?.id || null,
      artworkId,
      artistId: artwork.artistId,
      categoryId: artwork.categoryId,
      limit: 4,
    });

    return res.status(200).json({
      artwork: serializeArtwork(artwork),
      relatedArtworks: relatedArtworks.map((item) => serializeArtwork(item)),
    });
  } catch (error) {
    console.error("Public artwork detail error:", error);
    return res.status(500).json({
      message: "Unable to load this artwork.",
    });
  }
});

router.post(
  "/artworks/:id(\\d+)/favorite",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      await collectorRepository.addFavorite({
        userId: req.user.id,
        artworkId: Number.parseInt(req.params.id, 10),
      });

      return res.status(200).json({
        message: "Artwork added to favorites.",
      });
    } catch (error) {
      const mappedError = mapRepositoryError(error);

      if (mappedError) {
        return res.status(mappedError.status).json({
          message: mappedError.message,
        });
      }

      console.error("Favorite create error:", error);
      return res.status(500).json({
        message: "Unable to add this artwork to favorites.",
      });
    }
  },
);

router.delete(
  "/artworks/:id(\\d+)/favorite",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      await collectorRepository.removeFavorite({
        userId: req.user.id,
        artworkId: Number.parseInt(req.params.id, 10),
      });

      return res.status(200).json({
        message: "Artwork removed from favorites.",
      });
    } catch (error) {
      console.error("Favorite delete error:", error);
      return res.status(500).json({
        message: "Unable to remove this artwork from favorites.",
      });
    }
  },
);

router.get("/artists", attachViewer, async (req, res) => {
  try {
    const artists = await marketplaceRepository.listPublicArtists({
      viewerId: req.viewer?.id || null,
      search: normalizeText(req.query.search).toLowerCase(),
      style: normalizeText(req.query.style).toLowerCase(),
      artType: normalizeText(req.query.artType).toLowerCase(),
      sort: normalizeText(req.query.sort) || "featured",
      limit: normalizeLimit(req.query.limit, 18, 60),
    });

    return res.status(200).json({
      artists: artists.map((artist) => serializeArtistSummary(artist)),
    });
  } catch (error) {
    console.error("Public artists fetch error:", error);
    return res.status(500).json({
      message: "Unable to load artists.",
    });
  }
});

router.get("/artists/:id(\\d+)", attachViewer, async (req, res) => {
  try {
    const artist = await marketplaceRepository.findPublicArtistById({
      artistId: Number.parseInt(req.params.id, 10),
      viewerId: req.viewer?.id || null,
    });

    if (!artist) {
      return res.status(404).json({
        message: "Artist not found.",
      });
    }

    return res.status(200).json({
      artist: serializeArtistSummary(artist),
      artworks: artist.artworks.map((artwork) => serializeArtwork(artwork)),
      collections: serializeCollections(artist.collections),
    });
  } catch (error) {
    console.error("Public artist detail error:", error);
    return res.status(500).json({
      message: "Unable to load this artist profile.",
    });
  }
});

router.post(
  "/artists/:id(\\d+)/follow",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      await collectorRepository.followArtist({
        userId: req.user.id,
        artistId: Number.parseInt(req.params.id, 10),
      });

      return res.status(200).json({
        message: "You are now following this artist.",
      });
    } catch (error) {
      const mappedError = mapRepositoryError(error);

      if (mappedError) {
        return res.status(mappedError.status).json({
          message: mappedError.message,
        });
      }

      console.error("Follow create error:", error);
      return res.status(500).json({
        message: "Unable to follow this artist.",
      });
    }
  },
);

router.delete(
  "/artists/:id(\\d+)/follow",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      await collectorRepository.unfollowArtist({
        userId: req.user.id,
        artistId: Number.parseInt(req.params.id, 10),
      });

      return res.status(200).json({
        message: "You are no longer following this artist.",
      });
    } catch (error) {
      console.error("Follow delete error:", error);
      return res.status(500).json({
        message: "Unable to unfollow this artist.",
      });
    }
  },
);

router.get(
  "/favorites/me",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      const artworks = await collectorRepository.listFavoriteArtworks(
        req.user.id,
      );

      return res.status(200).json({
        artworks: artworks.map((artwork) => serializeArtwork(artwork)),
      });
    } catch (error) {
      console.error("Favorites fetch error:", error);
      return res.status(500).json({
        message: "Unable to load your favorites.",
      });
    }
  },
);

router.get(
  "/collections/me",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      const [collections, artworkOptions] = await Promise.all([
        collectorRepository.listPersonalCollections(req.user.id),
        marketplaceRepository.listCollectionArtworkOptions({
          viewerId: req.user.id,
          limit: 60,
        }),
      ]);

      return res.status(200).json({
        collections: serializeCollections(collections),
        artworkOptions: artworkOptions.map((artwork) =>
          serializeArtwork(artwork),
        ),
      });
    } catch (error) {
      console.error("Personal collections fetch error:", error);
      return res.status(500).json({
        message: "Unable to load your collections.",
      });
    }
  },
);

router.post(
  "/collections/me",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      const title = normalizeText(req.body.title);

      if (!title) {
        return res.status(400).json({
          message: "The collection title is required.",
        });
      }

      const collection = await collectorRepository.createPersonalCollection({
        userId: req.user.id,
        title,
        description: normalizeText(req.body.description),
        isPrivate: Boolean(req.body.isPrivate),
      });

      return res.status(201).json({
        message: "Collection created.",
        collection: serializeCollection(collection),
      });
    } catch (error) {
      console.error("Personal collection create error:", error);
      return res.status(500).json({
        message: "Unable to create this collection.",
      });
    }
  },
);

router.patch(
  "/collections/me/:id(\\d+)",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      const title = normalizeText(req.body.title);

      if (!title) {
        return res.status(400).json({
          message: "The collection title is required.",
        });
      }

      const collection = await collectorRepository.updatePersonalCollection({
        userId: req.user.id,
        collectionId: Number.parseInt(req.params.id, 10),
        title,
        description: normalizeText(req.body.description),
        isPrivate: Boolean(req.body.isPrivate),
      });

      return res.status(200).json({
        message: "Collection updated.",
        collection: serializeCollection(collection),
      });
    } catch (error) {
      const mappedError = mapRepositoryError(error);

      if (mappedError) {
        return res.status(mappedError.status).json({
          message: mappedError.message,
        });
      }

      console.error("Personal collection update error:", error);
      return res.status(500).json({
        message: "Unable to update this collection.",
      });
    }
  },
);

router.delete(
  "/collections/me/:id(\\d+)",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      await collectorRepository.deletePersonalCollection({
        userId: req.user.id,
        collectionId: Number.parseInt(req.params.id, 10),
      });

      return res.status(200).json({
        message: "Collection deleted.",
      });
    } catch (error) {
      const mappedError = mapRepositoryError(error);

      if (mappedError) {
        return res.status(mappedError.status).json({
          message: mappedError.message,
        });
      }

      console.error("Personal collection delete error:", error);
      return res.status(500).json({
        message: "Unable to delete this collection.",
      });
    }
  },
);

router.post(
  "/collections/me/:id(\\d+)/artworks",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      const artworkId = Number.parseInt(req.body.artworkId, 10);

      if (!Number.isInteger(artworkId)) {
        return res.status(400).json({
          message: "The selected artwork is invalid.",
        });
      }

      const collection =
        await collectorRepository.addArtworkToPersonalCollection({
          userId: req.user.id,
          collectionId: Number.parseInt(req.params.id, 10),
          artworkId,
        });

      return res.status(200).json({
        message: "Artwork added to the collection.",
        collection: serializeCollection(collection),
      });
    } catch (error) {
      const mappedError = mapRepositoryError(error);

      if (mappedError) {
        return res.status(mappedError.status).json({
          message: mappedError.message,
        });
      }

      console.error("Add artwork to personal collection error:", error);
      return res.status(500).json({
        message: "Unable to add this artwork to the collection.",
      });
    }
  },
);

router.delete(
  "/collections/me/:id(\\d+)/artworks/:artworkId(\\d+)",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      const collection =
        await collectorRepository.removeArtworkFromPersonalCollection({
          userId: req.user.id,
          collectionId: Number.parseInt(req.params.id, 10),
          artworkId: Number.parseInt(req.params.artworkId, 10),
        });

      return res.status(200).json({
        message: "Artwork removed from the collection.",
        collection: serializeCollection(collection),
      });
    } catch (error) {
      const mappedError = mapRepositoryError(error);

      if (mappedError) {
        return res.status(mappedError.status).json({
          message: mappedError.message,
        });
      }

      console.error("Remove artwork from personal collection error:", error);
      return res.status(500).json({
        message: "Unable to remove this artwork from the collection.",
      });
    }
  },
);

module.exports = router;
