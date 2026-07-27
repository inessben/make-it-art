const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { isAdminUser } = require("../middlewares/admin-required.middleware");
const { getUserFromRequest } = require("../services/session.service");
const marketplaceRepository = require("../repositories/marketplace.repository");
const collectorRepository = require("../repositories/collector.repository");
const categoryRepository = require("../repositories/category.repository");
const notificationRepository = require("../repositories/notification.repository");
const {
  serializeArtwork,
  serializeArtistSummary,
  serializeCollection
} = require("../utils/serialize-marketplace");
const { buildUploadedImageUrl } = require("../services/uploaded-image.service");

const router = express.Router();

async function attachViewer(req, _res, next) {
  req.viewer = await getUserFromRequest(req);

  if (req.viewer?.artist?.id) {
    try {
      await collectorRepository.cleanupSelfFollowForUser(req.viewer.id);
    } catch (error) {
      console.error("Self follow cleanup error:", error);
    }
  }

  next();
}

function ensureCollectorAccount(req, res, next) {
  if (isAdminUser(req.user)) {
    return res.status(403).json({
      message: "Les comptes admin ne peuvent pas utiliser les fonctionnalites collectionneur."
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
  return collections.map((collection) => serializeCollection(collection)).filter(Boolean);
}

function serializePublicMember(member) {
  const publicArtist = member?.artist?.verified ? member.artist : null;
  const displayName =
    normalizeText(publicArtist?.displayName) || normalizeText(member?.username) || "Member";
  const username = normalizeText(member?.username);

  return {
    id: member.id,
    displayName,
    username,
    bio: normalizeText(member?.bio),
    avatarUrl: buildUploadedImageUrl(publicArtist?.avatarPath),
    coverUrl: buildUploadedImageUrl(publicArtist?.coverPath),
    isArtist: Boolean(publicArtist),
    artistId: publicArtist?.id || null,
    verifiedArtist: Boolean(publicArtist),
    stats: publicArtist
      ? {
          artworks: publicArtist._count?.artworks || 0,
          followers: publicArtist._count?.followers || 0,
          collections: publicArtist._count?.collections || 0
        }
      : null,
    joinedAt: member.createdAt || null,
    profileUrl: publicArtist ? `/artists/${publicArtist.id}` : `/members/${member.id}`
  };
}

function mapRepositoryError(error) {
  if (error?.message === "ARTWORK_NOT_FOUND") {
    return {
      status: 404,
      message: "Oeuvre introuvable."
    };
  }

  if (error?.message === "ARTIST_NOT_FOUND") {
    return {
      status: 404,
      message: "Artiste introuvable."
    };
  }

  if (error?.message === "COLLECTION_NOT_FOUND") {
    return {
      status: 404,
      message: "Collection introuvable."
    };
  }

  if (error?.message === "DEFAULT_FAVORITES_COLLECTION_PROTECTED") {
    return {
      status: 409,
      message: "La collection Favoris ne peut pas etre supprimee."
    };
  }

  if (error?.message === "SELF_FOLLOW_NOT_ALLOWED") {
    return {
      status: 409,
      message: "Vous ne pouvez pas suivre votre propre profil artiste."
    };
  }

  return null;
}

router.get("/marketplace/overview", attachViewer, async (req, res) => {
  try {
    const overview = await marketplaceRepository.getMarketplaceOverview({
      viewerId: req.viewer?.id || null
    });

    return res.status(200).json({
      stats: overview.stats,
      artworks: overview.artworks.map((artwork) => serializeArtwork(artwork)),
      artists: overview.artists.map((artist) => serializeArtistSummary(artist))
    });
  } catch (error) {
    console.error("Marketplace overview error:", error);
    return res.status(500).json({
      message: "Impossible de charger la page de decouverte."
    });
  }
});

router.get("/categories", async (_req, res) => {
  try {
    const categories = await categoryRepository.listCategories({ publicOnly: true });

    return res.status(200).json({
      categories: categories.map((category) => ({
        id: category.id,
        name: normalizeText(category.name) || "Sans categorie",
        imageUrl: buildUploadedImageUrl(category.imagePath),
        artworksCount: category._count?.artworks || 0
      }))
    });
  } catch (error) {
    console.error("Categories fetch error:", error);
    return res.status(500).json({
      message: "Impossible de charger les categories."
    });
  }
});

function normalizeCategoryId(value) {
  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeResourceId(value) {
  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

router.get("/artworks", attachViewer, async (req, res) => {
  try {
    const artworks = await marketplaceRepository.listPublicArtworks({
      viewerId: req.viewer?.id || null,
      search: normalizeText(req.query.search).toLowerCase(),
      style: normalizeText(req.query.style).toLowerCase(),
      artType: normalizeText(req.query.artType).toLowerCase(),
      categoryId: normalizeCategoryId(req.query.category),
      sort: normalizeText(req.query.sort) || "latest",
      limit: normalizeLimit(req.query.limit, 24, 80)
    });

    return res.status(200).json({
      artworks: artworks.map((artwork) => serializeArtwork(artwork))
    });
  } catch (error) {
    console.error("Public artworks fetch error:", error);
    return res.status(500).json({
      message: "Impossible de charger le catalogue des oeuvres."
    });
  }
});

router.get("/artworks/:id(\\d+)", attachViewer, async (req, res) => {
  try {
    const artworkId = normalizeResourceId(req.params.id);

    if (!artworkId) {
      return res.status(404).json({
        message: "Oeuvre introuvable."
      });
    }

    const artwork = await marketplaceRepository.findPublicArtworkById({
      artworkId,
      viewerId: req.viewer?.id || null
    });

    if (!artwork) {
      return res.status(404).json({
        message: "Oeuvre introuvable."
      });
    }

    const relatedArtworks = await marketplaceRepository.listRelatedArtworks({
      viewerId: req.viewer?.id || null,
      artworkId,
      artistId: artwork.artistId,
      categoryId: artwork.categoryId,
      limit: 4
    });
    const isOwner = Boolean(req.viewer?.id) && artwork.artist?.userId === req.viewer.id;

    return res.status(200).json({
      artwork: serializeArtwork(artwork, { includeManagement: isOwner }),
      relatedArtworks: relatedArtworks.map((item) => serializeArtwork(item))
    });
  } catch (error) {
    console.error("Public artwork detail error:", error);
    return res.status(500).json({
      message: "Impossible de charger cette oeuvre."
    });
  }
});

router.post(
  "/artworks/:id(\\d+)/favorite",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      const artworkId = normalizeResourceId(req.params.id);

      if (!artworkId) {
        return res.status(404).json({
          message: "Oeuvre introuvable."
        });
      }

      await collectorRepository.addFavorite({
        userId: req.user.id,
        artworkId
      });

      return res.status(200).json({
        message: "Oeuvre ajoutee aux favoris."
      });
    } catch (error) {
      const mappedError = mapRepositoryError(error);

      if (mappedError) {
        return res.status(mappedError.status).json({
          message: mappedError.message
        });
      }

      console.error("Favorite create error:", error);
      return res.status(500).json({
        message: "Impossible d'ajouter cette oeuvre aux favoris."
      });
    }
  }
);

router.delete(
  "/artworks/:id(\\d+)/favorite",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      const artworkId = normalizeResourceId(req.params.id);

      if (!artworkId) {
        return res.status(404).json({
          message: "Oeuvre introuvable."
        });
      }

      await collectorRepository.removeFavorite({
        userId: req.user.id,
        artworkId
      });

      return res.status(200).json({
        message: "Oeuvre retiree des favoris."
      });
    } catch (error) {
      console.error("Favorite delete error:", error);
      return res.status(500).json({
        message: "Impossible de retirer cette oeuvre des favoris."
      });
    }
  }
);

router.get("/artists", attachViewer, async (req, res) => {
  try {
    const artists = await marketplaceRepository.listPublicArtists({
      viewerId: req.viewer?.id || null,
      search: normalizeText(req.query.search).toLowerCase(),
      style: normalizeText(req.query.style).toLowerCase(),
      artType: normalizeText(req.query.artType).toLowerCase(),
      sort: normalizeText(req.query.sort) || "featured",
      limit: normalizeLimit(req.query.limit, 18, 60)
    });

    return res.status(200).json({
      artists: artists.map((artist) => serializeArtistSummary(artist))
    });
  } catch (error) {
    console.error("Public artists fetch error:", error);
    return res.status(500).json({
      message: "Impossible de charger les artistes."
    });
  }
});

router.get("/artists/:id(\\d+)", attachViewer, async (req, res) => {
  try {
    const artistId = normalizeResourceId(req.params.id);

    if (!artistId) {
      return res.status(404).json({
        message: "Artiste introuvable."
      });
    }

    const artist = await marketplaceRepository.findPublicArtistById({
      artistId,
      viewerId: req.viewer?.id || null
    });

    if (!artist) {
      return res.status(404).json({
        message: "Artiste introuvable."
      });
    }

    return res.status(200).json({
      artist: serializeArtistSummary(artist),
      artworks: artist.artworks.map((artwork) => serializeArtwork(artwork)),
      collections: serializeCollections(artist.collections)
    });
  } catch (error) {
    console.error("Public artist detail error:", error);
    return res.status(500).json({
      message: "Impossible de charger ce profil artiste."
    });
  }
});

router.get("/members/:id(\\d+)", async (req, res) => {
  try {
    const memberId = normalizeResourceId(req.params.id);

    if (!memberId) {
      return res.status(404).json({
        message: "Member not found."
      });
    }

    const member = await marketplaceRepository.findPublicMemberById({
      userId: memberId
    });

    if (!member) {
      return res.status(404).json({
        message: "Member not found."
      });
    }

    return res.status(200).json({
      member: serializePublicMember(member)
    });
  } catch (error) {
    console.error("Public member detail error:", error);
    return res.status(500).json({
      message: "Unable to load this member profile."
    });
  }
});

router.post("/artists/:id(\\d+)/follow", authRequired, ensureCollectorAccount, async (req, res) => {
  try {
    const artistId = normalizeResourceId(req.params.id);

    if (!artistId) {
      return res.status(404).json({
        message: "Artiste introuvable."
      });
    }

    const followResult = await collectorRepository.followArtist({
      userId: req.user.id,
      artistId
    });

    if (followResult?.created && followResult.artist?.userId) {
      const followerLabel = normalizeText(req.user.username) || normalizeText(req.user.email);
      const followerProfileUrl =
        req.user.artist?.verified && req.user.artist?.id
          ? `/artists/${req.user.artist.id}`
          : `/members/${req.user.id}`;

      try {
        await notificationRepository.createNotification({
          userId: followResult.artist.userId,
          type: "follower",
          title: "New follower",
          message: `${followerLabel || "A collector"} started following your artist profile.`,
          payload: {
            artistId: followResult.artist.id,
            followerUserId: req.user.id,
            followerUsername: normalizeText(req.user.username) || null,
            followerEmail: normalizeText(req.user.email) || null,
            followerArtistId: req.user.artist?.verified ? req.user.artist.id : null,
            profileUrl: followerProfileUrl
          }
        });
      } catch (notificationError) {
        console.error("Follow notification error:", notificationError);
      }
    }

    return res.status(200).json({
      message: "Vous suivez maintenant cet artiste."
    });
  } catch (error) {
    const mappedError = mapRepositoryError(error);

    if (mappedError) {
      return res.status(mappedError.status).json({
        message: mappedError.message
      });
    }

    console.error("Follow create error:", error);
    return res.status(500).json({
      message: "Impossible de suivre cet artiste."
    });
  }
});

router.delete(
  "/artists/:id(\\d+)/follow",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      const artistId = normalizeResourceId(req.params.id);

      if (!artistId) {
        return res.status(404).json({
          message: "Artiste introuvable."
        });
      }

      await collectorRepository.unfollowArtist({
        userId: req.user.id,
        artistId
      });

      return res.status(200).json({
        message: "Vous ne suivez plus cet artiste."
      });
    } catch (error) {
      console.error("Follow delete error:", error);
      return res.status(500).json({
        message: "Impossible de ne plus suivre cet artiste."
      });
    }
  }
);

router.get("/follows/me", authRequired, ensureCollectorAccount, async (req, res) => {
  try {
    const artists = await collectorRepository.listFollowedArtists(req.user.id);

    return res.status(200).json({
      artists: artists.map((artist) => serializeArtistSummary(artist))
    });
  } catch (error) {
    console.error("Followed artists fetch error:", error);
    return res.status(500).json({
      message: "Impossible de charger vos abonnements."
    });
  }
});

router.get("/favorites/me", authRequired, ensureCollectorAccount, async (req, res) => {
  try {
    const artworks = await collectorRepository.listFavoriteArtworks(req.user.id);

    return res.status(200).json({
      artworks: artworks.map((artwork) => ({
        ...serializeArtwork(artwork),
        isFavorite: true
      }))
    });
  } catch (error) {
    console.error("Favorites fetch error:", error);
    return res.status(500).json({
      message: "Impossible de charger vos favoris."
    });
  }
});

router.get("/collections/me", authRequired, ensureCollectorAccount, async (req, res) => {
  try {
    const [collections, artworkOptions] = await Promise.all([
      collectorRepository.listPersonalCollections(req.user.id),
      marketplaceRepository.listCollectionArtworkOptions({
        viewerId: req.user.id,
        limit: 60
      })
    ]);

    return res.status(200).json({
      collections: serializeCollections(collections),
      artworkOptions: artworkOptions.map((artwork) => serializeArtwork(artwork))
    });
  } catch (error) {
    console.error("Personal collections fetch error:", error);
    return res.status(500).json({
      message: "Impossible de charger vos collections."
    });
  }
});

router.post("/collections/me", authRequired, ensureCollectorAccount, async (req, res) => {
  try {
    const title = normalizeText(req.body.title);

    if (!title) {
      return res.status(400).json({
        message: "Le titre de la collection est requis."
      });
    }

    const collection = await collectorRepository.createPersonalCollection({
      userId: req.user.id,
      title,
      description: normalizeText(req.body.description),
      isPrivate: Boolean(req.body.isPrivate)
    });

    return res.status(201).json({
      message: "Collection creee.",
      collection: serializeCollection(collection)
    });
  } catch (error) {
    console.error("Personal collection create error:", error);
    return res.status(500).json({
      message: "Impossible de creer cette collection."
    });
  }
});

router.patch(
  "/collections/me/:id(\\d+)",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      const title = normalizeText(req.body.title);

      if (!title) {
        return res.status(400).json({
          message: "Le titre de la collection est requis."
        });
      }

      const collection = await collectorRepository.updatePersonalCollection({
        userId: req.user.id,
        collectionId: Number.parseInt(req.params.id, 10),
        title,
        description: normalizeText(req.body.description),
        isPrivate: Boolean(req.body.isPrivate)
      });

      return res.status(200).json({
        message: "Collection mise a jour.",
        collection: serializeCollection(collection)
      });
    } catch (error) {
      const mappedError = mapRepositoryError(error);

      if (mappedError) {
        return res.status(mappedError.status).json({
          message: mappedError.message
        });
      }

      console.error("Personal collection update error:", error);
      return res.status(500).json({
        message: "Impossible de mettre a jour cette collection."
      });
    }
  }
);

router.delete(
  "/collections/me/:id(\\d+)",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      await collectorRepository.deletePersonalCollection({
        userId: req.user.id,
        collectionId: Number.parseInt(req.params.id, 10)
      });

      return res.status(200).json({
        message: "Collection supprimee."
      });
    } catch (error) {
      const mappedError = mapRepositoryError(error);

      if (mappedError) {
        return res.status(mappedError.status).json({
          message: mappedError.message
        });
      }

      console.error("Personal collection delete error:", error);
      return res.status(500).json({
        message: "Impossible de supprimer cette collection."
      });
    }
  }
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
          message: "L'oeuvre a ajouter est invalide."
        });
      }

      const collection = await collectorRepository.addArtworkToPersonalCollection({
        userId: req.user.id,
        collectionId: Number.parseInt(req.params.id, 10),
        artworkId
      });

      return res.status(200).json({
        message: "Oeuvre ajoutee a la collection.",
        collection: serializeCollection(collection)
      });
    } catch (error) {
      const mappedError = mapRepositoryError(error);

      if (mappedError) {
        return res.status(mappedError.status).json({
          message: mappedError.message
        });
      }

      console.error("Add artwork to personal collection error:", error);
      return res.status(500).json({
        message: "Impossible d'ajouter cette oeuvre a la collection."
      });
    }
  }
);

router.delete(
  "/collections/me/:id(\\d+)/artworks/:artworkId(\\d+)",
  authRequired,
  ensureCollectorAccount,
  async (req, res) => {
    try {
      const collection = await collectorRepository.removeArtworkFromPersonalCollection({
        userId: req.user.id,
        collectionId: Number.parseInt(req.params.id, 10),
        artworkId: Number.parseInt(req.params.artworkId, 10)
      });

      return res.status(200).json({
        message: "Oeuvre retiree de la collection.",
        collection: serializeCollection(collection)
      });
    } catch (error) {
      const mappedError = mapRepositoryError(error);

      if (mappedError) {
        return res.status(mappedError.status).json({
          message: mappedError.message
        });
      }

      console.error("Remove artwork from personal collection error:", error);
      return res.status(500).json({
        message: "Impossible de retirer cette oeuvre de la collection."
      });
    }
  }
);

module.exports = router;
