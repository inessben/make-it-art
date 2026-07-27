const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/artist.routes");
const authRequiredPath = require.resolve("../src/middlewares/auth-required.middleware");
const csrfMiddlewarePath = require.resolve("../src/middlewares/csrf.middleware");
const rateLimitMiddlewarePath = require.resolve("../src/middlewares/rate-limit.middleware");
const artistRequiredPath = require.resolve("../src/middlewares/artist-required.middleware");
const applicationRepositoryPath =
  require.resolve("../src/repositories/artist-application-draft.repository");
const artistRepositoryPath = require.resolve("../src/repositories/artist.repository");
const artworkRepositoryPath = require.resolve("../src/repositories/artwork.repository");
const categoryRepositoryPath = require.resolve("../src/repositories/category.repository");
const userRepositoryPath = require.resolve("../src/repositories/user.repository");
const contractServicePath = require.resolve("../src/services/artist-contract.service");
const serializeAuthUserPath = require.resolve("../src/utils/serialize-auth-user");
const uploadArtworkMiddlewarePath = require.resolve("../src/middlewares/upload-artwork.middleware");
const artistRequiredMiddlewarePath =
  require.resolve("../src/middlewares/artist-required.middleware");
const artworkMediaPipelinePath = require.resolve("../src/services/artwork-media-pipeline.service");

const authUser = {
  id: 7,
  email: "artist@example.com",
  username: "Ada Lovelace"
};

const verifiedArtist = {
  id: 3,
  userId: authUser.id,
  displayName: "Ada Art",
  verified: true,
  createdAt: new Date("2026-07-04T12:00:00.000Z"),
  user: {
    email: authUser.email,
    username: authUser.username,
    bio: "Digital artist"
  },
  _count: {
    artworks: 0,
    followers: 0,
    collections: 0
  }
};

function hasOverride(overrides, key) {
  return Object.prototype.hasOwnProperty.call(overrides, key);
}

function buildAuthMiddleware(user) {
  return {
    authRequired(req, _res, next) {
      req.user = user;
      next();
    }
  };
}

async function startArtistArtworkRoutesApp(t, overrides = {}) {
  const currentAuthUser = overrides.authUser || authUser;
  const currentArtist = "artistResult" in overrides ? overrides.artistResult : verifiedArtist;
  const calls = {
    createArtwork: [],
    listArtworksByArtistId: [],
    findOwnedArtwork: [],
    updateArtwork: [],
    deleteArtwork: [],
    hideArtwork: [],
    publishArtwork: [],
    deleteArtworkMediaAssets: []
  };
  const originalArtistRequired = require.cache[artistRequiredPath];

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authRequiredPath]: buildAuthMiddleware(currentAuthUser),
    [csrfMiddlewarePath]: {
      csrfProtection(_req, _res, next) {
        next();
      }
    },
    [rateLimitMiddlewarePath]: {
      artworkManagementRateLimit(_req, _res, next) {
        next();
      }
    },
    [applicationRepositoryPath]: {
      async findByUserId() {
        return overrides.findByUserIdResult || null;
      }
    },
    [artistRepositoryPath]: {
      async findByUserId() {
        return hasOverride(overrides, "artistResult") ? overrides.artistResult : verifiedArtist;
      }
    },
    [artworkRepositoryPath]: {
      async listArtworksByArtistId(artistId) {
        calls.listArtworksByArtistId.push(artistId);

        return overrides.listArtworksResult || [];
      },
      async createArtwork(payload) {
        calls.createArtwork.push(payload);

        return (
          overrides.createArtworkResult || {
            id: 42,
            artistId: payload.artistId,
            title: payload.title,
            description: payload.description,
            price: payload.price,
            priceTokens: payload.price,
            licenseType: payload.licenseType,
            favoriteCount: 0,
            protection: payload.protection,
            imagePath: payload.imagePath || null,
            moderationStatus: "approved",
            moderationNote: null,
            moderatedAt: null,
            moderatedByAdmin: null,
            createdAt: new Date("2026-07-08T10:00:00.000Z"),
            category: {
              id: payload.categoryId || 1,
              name: "Illustration"
            },
            artist: verifiedArtist,
            favorites: []
          }
        );
      },
      async findOwnedArtwork(payload) {
        calls.findOwnedArtwork.push(payload);
        return hasOverride(overrides, "findOwnedArtworkResult")
          ? overrides.findOwnedArtworkResult
          : null;
      },
      async updateArtwork(payload) {
        calls.updateArtwork.push(payload);
        if (overrides.updateArtworkError) throw overrides.updateArtworkError;
        return overrides.updateArtworkResult || overrides.findOwnedArtworkResult;
      },
      async deleteArtwork(payload) {
        calls.deleteArtwork.push(payload);
        if (overrides.deleteArtworkError) throw overrides.deleteArtworkError;
        if (hasOverride(overrides, "deleteArtworkResult")) return overrides.deleteArtworkResult;
        throw new Error("ARTWORK_NOT_FOUND");
      },
      async hideArtwork(payload) {
        calls.hideArtwork.push(payload);
        if (overrides.hideArtworkError) throw overrides.hideArtworkError;
        return overrides.hideArtworkResult || overrides.findOwnedArtworkResult;
      },
      async publishArtwork(payload) {
        calls.publishArtwork.push(payload);
        if (overrides.publishArtworkError) throw overrides.publishArtworkError;
        return overrides.publishArtworkResult || overrides.findOwnedArtworkResult;
      }
    },
    [categoryRepositoryPath]: {
      async ensurePredefinedCategories() {
        return [{ id: 9, name: "Illustration" }];
      },
      async listCategories() {
        return [{ id: 9, name: "Illustration" }];
      },
      async findById(categoryId) {
        return {
          id: categoryId,
          name: "Illustration"
        };
      },
      async isPredefinedCategory(categoryId) {
        return categoryId === 9;
      }
    },
    [userRepositoryPath]: {
      async findById() {
        return currentAuthUser;
      }
    },
    [contractServicePath]: {
      CONTRACT_VERSION: "make-it-art-artist-contract-v2",
      extractArtistApplicationPayload() {
        return {};
      },
      resolveContractSignedAt() {
        return new Date("2026-07-04T12:34:00.000Z");
      },
      renderArtistContract() {
        return {
          contractText: "CONTRAT TEST",
          contractVersion: "make-it-art-artist-contract-v2"
        };
      },
      async generateArtistContractPdf() {
        return {
          contractVersion: "make-it-art-artist-contract-v2",
          contractText: "CONTRAT TEST",
          pdfBuffer: Buffer.from("pdf"),
          signedAt: new Date("2026-07-04T12:34:00.000Z")
        };
      }
    },
    [serializeAuthUserPath]: {
      serializeAuthUser(user) {
        return {
          id: user.id,
          email: user.email
        };
      }
    },
    [uploadArtworkMiddlewarePath]: {
      handleArtworkUpload(req, _res, next) {
        req.file = {
          filename: "test-artwork.jpg",
          path: "/tmp/test-artwork.jpg",
          mimetype: "image/jpeg",
          originalname: "test-artwork.jpg"
        };
        next();
      }
    },
    [artworkMediaPipelinePath]: {
      async processArtworkUpload() {
        return {
          storageProvider: "local",
          mediaStatus: "ready",
          hdPath: "artworks/hd/test-artwork.jpg",
          previewPath: "artworks/preview/test-artwork.jpg",
          imagePath: "artworks/preview/test-artwork.jpg",
          watermarkApplied: true,
          previewUrl: "/api/uploads/artworks/preview/test-artwork.jpg",
          hdUrl: "/api/uploads/artworks/hd/test-artwork.jpg"
        };
      },
      async deleteArtworkMediaAssets(artwork) {
        calls.deleteArtworkMediaAssets.push(artwork);
        return undefined;
      }
    },
    [artistRequiredMiddlewarePath]: {
      ensureVerifiedArtist(req, res, next) {
        if (!currentArtist) {
          return res.status(403).json({
            message: "Seuls les artistes peuvent publier des oeuvres."
          });
        }

        if (!currentArtist.verified) {
          return res.status(403).json({
            message: "Votre profil artiste doit etre valide avant de publier des oeuvres."
          });
        }

        req.artist = currentArtist;
        return next();
      }
    }
  });

  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(router);

  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  t.after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
    restore();

    if (originalArtistRequired) {
      require.cache[artistRequiredPath] = originalArtistRequired;
    } else {
      delete require.cache[artistRequiredPath];
    }
  });

  return {
    calls,
    baseUrl: `http://127.0.0.1:${server.address().port}`
  };
}

async function requestJson(baseUrl, path, { method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json();

  return {
    status: response.status,
    body: payload
  };
}

test("POST /artists/me/artworks creates an artwork for a verified artist", async (t) => {
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t);
  const response = await requestJson(baseUrl, "/artists/me/artworks", {
    method: "POST",
    body: {
      title: "Neon Garden",
      description: "A luminous digital landscape.",
      categoryId: 9,
      price: "120 tokens",
      licenseType: "COMMERCIAL",
      protection: true
    }
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.message, "Oeuvre publiee et visible dans le catalogue.");
  assert.equal(response.body.artwork.title, "Neon Garden");
  assert.equal(response.body.artwork.moderationStatus, "approved");
  assert.deepEqual(calls.createArtwork[0], {
    artistId: verifiedArtist.id,
    title: "Neon Garden",
    description: "A luminous digital landscape.",
    categoryId: 9,
    price: "120 tokens",
    licenseType: "COMMERCIAL",
    protection: true,
    imagePath: "artworks/preview/test-artwork.jpg",
    hdPath: "artworks/hd/test-artwork.jpg",
    previewPath: "artworks/preview/test-artwork.jpg",
    storageProvider: "local",
    mediaStatus: "ready",
    watermarkApplied: true
  });
});

test("POST /artists/me/artworks accepts every supported licence type", async (t) => {
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t);

  for (const licenseType of ["PERSONAL", "COMMERCIAL", "EXCLUSIVE"]) {
    const response = await requestJson(baseUrl, "/artists/me/artworks", {
      method: "POST",
      body: {
        title: `Licence ${licenseType}`,
        categoryId: 9,
        price: "120 tokens",
        licenseType,
        ...(licenseType === "COMMERCIAL"
          ? { description: "Utilisation autorisee sur les supports numeriques pendant un an." }
          : {})
      }
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.artwork.licenseType, licenseType);
  }

  assert.deepEqual(
    calls.createArtwork.map(({ licenseType }) => licenseType),
    ["PERSONAL", "COMMERCIAL", "EXCLUSIVE"]
  );
});

test("POST /artists/me/artworks requires commercial usage terms in the description", async (t) => {
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t);
  const response = await requestJson(baseUrl, "/artists/me/artworks", {
    method: "POST",
    body: {
      title: "Commercial without terms",
      categoryId: 9,
      price: "120 tokens",
      licenseType: "COMMERCIAL",
      description: "   "
    }
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /description.*conditions d'utilisation commerciale/i);
  assert.equal(calls.createArtwork.length, 0);
});

test("POST /artists/me/artworks requires a supported licence type", async (t) => {
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t);
  for (const [title, licenseType] of [
    ["Licence missing", undefined],
    ["Licence invalid", "RENTAL"]
  ]) {
    const response = await requestJson(baseUrl, "/artists/me/artworks", {
      method: "POST",
      body: {
        title,
        categoryId: 9,
        price: "80 tokens",
        ...(licenseType ? { licenseType } : {})
      }
    });

    assert.equal(response.status, 400);
    assert.match(response.body.message, /type de licence/i);
  }
  assert.equal(calls.createArtwork.length, 0);
});

test("POST /artists/me/artworks blocks users without a verified artist profile", async (t) => {
  const { baseUrl } = await startArtistArtworkRoutesApp(t, {
    artistResult: null
  });
  const response = await requestJson(baseUrl, "/artists/me/artworks", {
    method: "POST",
    body: {
      title: "Hidden Piece",
      categoryId: 9,
      price: "80 tokens"
    }
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.message, "Seuls les artistes peuvent publier des oeuvres.");
});

test("POST /artists/me/artworks blocks unverified artist accounts", async (t) => {
  const { baseUrl } = await startArtistArtworkRoutesApp(t, {
    artistResult: {
      ...verifiedArtist,
      verified: false
    }
  });
  const response = await requestJson(baseUrl, "/artists/me/artworks", {
    method: "POST",
    body: {
      title: "Draft Piece",
      categoryId: 9,
      price: "80 tokens"
    }
  });

  assert.equal(response.status, 403);
  assert.match(response.body.message, /profil artiste doit etre valide/i);
});

test("GET /artists/me/artworks lists artworks for the current artist", async (t) => {
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t, {
    listArtworksResult: [
      {
        id: 42,
        title: "Neon Garden",
        description: "A luminous digital landscape.",
        price: "120 tokens",
        priceTokens: "120 tokens",
        favoriteCount: 0,
        protection: true,
        moderationStatus: "pending",
        moderationNote: "Merci d'ajouter plus de details.",
        moderatedAt: new Date("2026-07-09T10:00:00.000Z"),
        moderatedByAdmin: {
          id: 1,
          username: "Admin",
          email: "admin@example.com"
        },
        createdAt: new Date("2026-07-08T10:00:00.000Z"),
        category: {
          id: 1,
          name: "Illustration"
        },
        artist: verifiedArtist,
        favorites: []
      }
    ]
  });

  const response = await requestJson(baseUrl, "/artists/me/artworks");

  assert.equal(response.status, 200);
  assert.equal(response.body.artworks.length, 1);
  assert.equal(response.body.artworks[0].title, "Neon Garden");
  assert.equal(response.body.artworks[0].moderationStatus, "pending");
  assert.equal(response.body.artworks[0].moderationReviewer, "Admin");
  assert.deepEqual(calls.listArtworksByArtistId, [verifiedArtist.id]);
});

test("GET /artists/me/artworks/:id returns private lifecycle capabilities to the owner", async (t) => {
  const ownedArtwork = {
    id: 42,
    title: "Private lifecycle",
    priceAmount: 12000,
    currency: "EUR",
    licenseType: "PERSONAL",
    saleStatus: "AVAILABLE",
    visibility: "HIDDEN",
    moderationStatus: "approved",
    stockQuantity: 0,
    reservedQuantity: 0,
    orderItems: [],
    reservations: [],
    artist: verifiedArtist,
    category: { id: 9, name: "Illustration" }
  };
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t, {
    findOwnedArtworkResult: ownedArtwork
  });

  const response = await requestJson(baseUrl, "/artists/me/artworks/42");

  assert.equal(response.status, 200);
  assert.equal(response.body.artwork.visibility, "HIDDEN");
  assert.equal(response.body.artwork.management.capabilities.canEdit, true);
  assert.equal(response.body.artwork.management.capabilities.canPublish, true);
  assert.deepEqual(calls.findOwnedArtwork, [{ artworkId: 42, artistId: verifiedArtist.id }]);
});

test("GET /artists/me/artworks/:id does not expose an artwork owned by another artist", async (t) => {
  const { baseUrl } = await startArtistArtworkRoutesApp(t, {
    findOwnedArtworkResult: null
  });

  const response = await requestJson(baseUrl, "/artists/me/artworks/42");

  assert.equal(response.status, 404);
  assert.equal(response.body.code, "ARTWORK_NOT_FOUND");
});

test("PATCH /artists/me/artworks/:id updates an eligible artwork with optimistic versioning", async (t) => {
  const previousArtwork = {
    id: 42,
    artistId: verifiedArtist.id,
    title: "Before",
    version: 3,
    storageProvider: "local",
    imagePath: "old-preview.jpg",
    previewPath: "old-preview.jpg",
    hdPath: "old-hd.jpg"
  };
  const updatedArtwork = {
    ...previousArtwork,
    title: "After",
    version: 4,
    priceAmount: 14500,
    currency: "EUR",
    price: "145",
    licenseType: "PERSONAL",
    saleStatus: "AVAILABLE",
    visibility: "PUBLISHED",
    moderationStatus: "approved",
    stockQuantity: 0,
    reservedQuantity: 0,
    orderItems: [],
    reservations: [],
    artist: verifiedArtist,
    category: { id: 9, name: "Illustration" }
  };
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t, {
    findOwnedArtworkResult: previousArtwork,
    updateArtworkResult: updatedArtwork
  });

  const response = await requestJson(baseUrl, "/artists/me/artworks/42", {
    method: "PATCH",
    body: {
      title: "After",
      description: "Updated description",
      categoryId: 9,
      price: "145",
      licenseType: "PERSONAL",
      protection: true,
      expectedVersion: 3
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, "Oeuvre mise a jour.");
  assert.equal(response.body.artwork.title, "After");
  assert.equal(calls.updateArtwork.length, 1);
  assert.equal(calls.updateArtwork[0].expectedVersion, 3);
  assert.equal(calls.updateArtwork[0].media.hdPath, "artworks/hd/test-artwork.jpg");
  assert.deepEqual(calls.deleteArtworkMediaAssets, [previousArtwork]);
});

test("PATCH /artists/me/artworks/:id requires the version opened by the artist", async (t) => {
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t);
  const response = await requestJson(baseUrl, "/artists/me/artworks/42", {
    method: "PATCH",
    body: {
      title: "Missing version",
      categoryId: 9,
      price: "145",
      licenseType: "PERSONAL"
    }
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, "ARTWORK_VERSION_REQUIRED");
  assert.equal(calls.updateArtwork.length, 0);
});

test("PATCH /artists/me/artworks/:id exposes purchase conflicts without changing media", async (t) => {
  const previousArtwork = { id: 42, artistId: verifiedArtist.id, version: 1 };
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t, {
    findOwnedArtworkResult: previousArtwork,
    updateArtworkError: new Error("ARTWORK_HAS_PURCHASES")
  });
  const response = await requestJson(baseUrl, "/artists/me/artworks/42", {
    method: "PATCH",
    body: {
      title: "Locked artwork",
      categoryId: 9,
      price: "145",
      licenseType: "PERSONAL",
      expectedVersion: 1
    }
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.code, "ARTWORK_HAS_PURCHASES");
  assert.equal(calls.updateArtwork.length, 1);
  assert.equal(calls.deleteArtworkMediaAssets.length, 1);
  assert.equal(calls.deleteArtworkMediaAssets[0].hdPath, "artworks/hd/test-artwork.jpg");
});

test("DELETE /artists/me/artworks/:id removes an eligible owned artwork and its media", async (t) => {
  const deletedArtwork = {
    id: 42,
    artistId: verifiedArtist.id,
    title: "Draft to delete",
    version: 3,
    storageProvider: "local",
    imagePath: "preview.jpg",
    previewPath: "preview.jpg",
    hdPath: "hd.jpg"
  };
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t, {
    deleteArtworkResult: deletedArtwork
  });

  const response = await requestJson(baseUrl, "/artists/me/artworks/42", {
    method: "DELETE",
    body: { expectedVersion: 3 }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, "Oeuvre supprimee definitivement.");
  assert.deepEqual(calls.deleteArtwork, [
    { artworkId: 42, artistId: verifiedArtist.id, expectedVersion: 3 }
  ]);
  assert.deepEqual(calls.deleteArtworkMediaAssets, [deletedArtwork]);
});

test("DELETE /artists/me/artworks/:id requires the version opened by the artist", async (t) => {
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t);

  const response = await requestJson(baseUrl, "/artists/me/artworks/42", {
    method: "DELETE",
    body: {}
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, "ARTWORK_VERSION_REQUIRED");
  assert.equal(calls.deleteArtwork.length, 0);
});

test("DELETE /artists/me/artworks/:id exposes purchase conflicts without deleting media", async (t) => {
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t, {
    deleteArtworkError: new Error("ARTWORK_HAS_PURCHASES")
  });

  const response = await requestJson(baseUrl, "/artists/me/artworks/42", {
    method: "DELETE",
    body: { expectedVersion: 2 }
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.code, "ARTWORK_HAS_PURCHASES");
  assert.equal(calls.deleteArtworkMediaAssets.length, 0);
});

test("POST /artists/me/artworks/:id/hide hides a published artwork with version control", async (t) => {
  const hiddenArtwork = {
    id: 42,
    artistId: verifiedArtist.id,
    title: "Hidden artwork",
    version: 4,
    visibility: "HIDDEN",
    priceAmount: 12000,
    currency: "EUR",
    licenseType: "PERSONAL",
    saleStatus: "AVAILABLE",
    moderationStatus: "approved",
    stockQuantity: 0,
    reservedQuantity: 0,
    orderItems: [{ order: { status: "PAID" } }],
    reservations: [],
    artist: verifiedArtist,
    category: { id: 9, name: "Illustration" }
  };
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t, {
    hideArtworkResult: hiddenArtwork
  });

  const response = await requestJson(baseUrl, "/artists/me/artworks/42/hide", {
    method: "POST",
    body: { expectedVersion: 3 }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.artwork.visibility, "HIDDEN");
  assert.equal(response.body.artwork.management.capabilities.canHide, false);
  assert.deepEqual(calls.hideArtwork, [
    { artworkId: 42, artistId: verifiedArtist.id, expectedVersion: 3 }
  ]);
});

test("POST /artists/me/artworks/:id/hide reports concurrent changes", async (t) => {
  const { baseUrl } = await startArtistArtworkRoutesApp(t, {
    hideArtworkError: new Error("ARTWORK_VERSION_CONFLICT")
  });

  const response = await requestJson(baseUrl, "/artists/me/artworks/42/hide", {
    method: "POST",
    body: { expectedVersion: 2 }
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.code, "ARTWORK_VERSION_CONFLICT");
});

test("POST /artists/me/artworks/:id/publish republishes an approved hidden artwork", async (t) => {
  const publishedArtwork = {
    id: 42,
    artistId: verifiedArtist.id,
    title: "Back online",
    version: 5,
    visibility: "PUBLISHED",
    priceAmount: 12000,
    currency: "EUR",
    licenseType: "EXCLUSIVE",
    saleStatus: "SOLD",
    isSold: true,
    moderationStatus: "approved",
    stockQuantity: 0,
    reservedQuantity: 0,
    orderItems: [{ order: { status: "PAID" } }],
    reservations: [],
    artist: verifiedArtist,
    category: { id: 9, name: "Illustration" }
  };
  const { baseUrl, calls } = await startArtistArtworkRoutesApp(t, {
    publishArtworkResult: publishedArtwork
  });

  const response = await requestJson(baseUrl, "/artists/me/artworks/42/publish", {
    method: "POST",
    body: { expectedVersion: 4 }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.artwork.visibility, "PUBLISHED");
  assert.equal(response.body.artwork.availabilityStatus, "SOLD");
  assert.equal(response.body.artwork.isAvailableForPurchase, false);
  assert.deepEqual(calls.publishArtwork, [
    { artworkId: 42, artistId: verifiedArtist.id, expectedVersion: 4 }
  ]);
});

test("POST /artists/me/artworks/:id/publish preserves moderation blocks", async (t) => {
  const { baseUrl } = await startArtistArtworkRoutesApp(t, {
    publishArtworkError: new Error("ARTWORK_MODERATION_BLOCKED")
  });

  const response = await requestJson(baseUrl, "/artists/me/artworks/42/publish", {
    method: "POST",
    body: { expectedVersion: 4 }
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.code, "ARTWORK_MODERATION_BLOCKED");
});
