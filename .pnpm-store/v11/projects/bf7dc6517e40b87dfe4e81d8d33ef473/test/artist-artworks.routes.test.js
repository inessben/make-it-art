const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/artist.routes");
const authRequiredPath =
  require.resolve("../src/middlewares/auth-required.middleware");
const artistRequiredPath =
  require.resolve("../src/middlewares/artist-required.middleware");
const applicationRepositoryPath =
  require.resolve("../src/repositories/artist-application-draft.repository");
const artistRepositoryPath =
  require.resolve("../src/repositories/artist.repository");
const artworkRepositoryPath =
  require.resolve("../src/repositories/artwork.repository");
const categoryRepositoryPath =
  require.resolve("../src/repositories/category.repository");
const userRepositoryPath =
  require.resolve("../src/repositories/user.repository");
const contractServicePath =
  require.resolve("../src/services/artist-contract.service");
const serializeAuthUserPath =
  require.resolve("../src/utils/serialize-auth-user");

const authUser = {
  id: 7,
  email: "artist@example.com",
  username: "Ada Lovelace",
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
    bio: "Digital artist",
  },
  _count: {
    artworks: 0,
    followers: 0,
    collections: 0,
  },
};

function hasOverride(overrides, key) {
  return Object.prototype.hasOwnProperty.call(overrides, key);
}

function buildAuthMiddleware(user) {
  return {
    authRequired(req, _res, next) {
      req.user = user;
      next();
    },
  };
}

async function startArtistArtworkRoutesApp(t, overrides = {}) {
  const currentAuthUser = overrides.authUser || authUser;
  const calls = {
    createArtwork: [],
    listArtworksByArtistId: [],
  };
  const originalArtistRequired = require.cache[artistRequiredPath];

  delete require.cache[artistRequiredPath];

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authRequiredPath]: buildAuthMiddleware(currentAuthUser),
    [applicationRepositoryPath]: {
      async findByUserId() {
        return overrides.findByUserIdResult || null;
      },
    },
    [artistRepositoryPath]: {
      async findByUserId() {
        return hasOverride(overrides, "artistResult")
          ? overrides.artistResult
          : verifiedArtist;
      },
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
            favoriteCount: 0,
            protection: payload.protection,
            createdAt: new Date("2026-07-08T10:00:00.000Z"),
            category: {
              id: payload.categoryId || 1,
              name: "Illustration",
            },
            artist: verifiedArtist,
            favorites: [],
          }
        );
      },
      async updateArtwork() {
        throw new Error("ARTWORK_NOT_FOUND");
      },
      async deleteArtwork() {
        throw new Error("ARTWORK_NOT_FOUND");
      },
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
          name: "Illustration",
        };
      },
      async isPredefinedCategory(categoryId) {
        return categoryId === 9;
      },
    },
    [userRepositoryPath]: {
      async findById() {
        return currentAuthUser;
      },
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
          contractVersion: "make-it-art-artist-contract-v2",
        };
      },
      async generateArtistContractPdf() {
        return {
          contractVersion: "make-it-art-artist-contract-v2",
          contractText: "CONTRAT TEST",
          pdfBuffer: Buffer.from("pdf"),
          signedAt: new Date("2026-07-04T12:34:00.000Z"),
        };
      },
    },
    [serializeAuthUserPath]: {
      serializeAuthUser(user) {
        return {
          id: user.id,
          email: user.email,
        };
      },
    },
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
    baseUrl: `http://127.0.0.1:${server.address().port}`,
  };
}

async function requestJson(baseUrl, path, { method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json();

  return {
    status: response.status,
    body: payload,
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
      protection: true,
    },
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.message, "Oeuvre publiee avec succes.");
  assert.equal(response.body.artwork.title, "Neon Garden");
  assert.deepEqual(calls.createArtwork[0], {
    artistId: verifiedArtist.id,
    title: "Neon Garden",
    description: "A luminous digital landscape.",
    categoryId: 9,
    price: "120 tokens",
    protection: true,
  });
});

test("POST /artists/me/artworks blocks users without a verified artist profile", async (t) => {
  const { baseUrl } = await startArtistArtworkRoutesApp(t, {
    artistResult: null,
  });
  const response = await requestJson(baseUrl, "/artists/me/artworks", {
    method: "POST",
    body: {
      title: "Hidden Piece",
      categoryId: 9,
      price: "80 tokens",
    },
  });

  assert.equal(response.status, 403);
  assert.equal(
    response.body.message,
    "Seuls les artistes peuvent publier des oeuvres.",
  );
});

test("POST /artists/me/artworks blocks unverified artist accounts", async (t) => {
  const { baseUrl } = await startArtistArtworkRoutesApp(t, {
    artistResult: {
      ...verifiedArtist,
      verified: false,
    },
  });
  const response = await requestJson(baseUrl, "/artists/me/artworks", {
    method: "POST",
    body: {
      title: "Draft Piece",
      categoryId: 9,
      price: "80 tokens",
    },
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
        createdAt: new Date("2026-07-08T10:00:00.000Z"),
        category: {
          id: 1,
          name: "Illustration",
        },
        artist: verifiedArtist,
        favorites: [],
      },
    ],
  });

  const response = await requestJson(baseUrl, "/artists/me/artworks");

  assert.equal(response.status, 200);
  assert.equal(response.body.artworks.length, 1);
  assert.equal(response.body.artworks[0].title, "Neon Garden");
  assert.deepEqual(calls.listArtworksByArtistId, [verifiedArtist.id]);
});
