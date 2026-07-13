const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/marketplace.routes");
const authRequiredPath =
  require.resolve("../src/middlewares/auth-required.middleware");
const adminRequiredPath =
  require.resolve("../src/middlewares/admin-required.middleware");
const sessionServicePath = require.resolve("../src/services/session.service");
const marketplaceRepositoryPath =
  require.resolve("../src/repositories/marketplace.repository");
const collectorRepositoryPath =
  require.resolve("../src/repositories/collector.repository");

const collectorUser = {
  id: 7,
  email: "collector@example.com",
  username: "Collector",
  role: "user",
};

function buildAuthMiddleware(currentUser) {
  return {
    authRequired(req, _res, next) {
      req.user = currentUser;
      next();
    },
  };
}

function buildArtist(id) {
  return {
    id,
    displayName: `Artist ${id}`,
    verified: true,
    createdAt: new Date("2026-07-04T10:00:00.000Z"),
    user: {
      username: `Artist User ${id}`,
      bio: "Digital artist",
      artistApplicationDraft: {
        payload: {
          artType: "Digital Art",
          styles: ["Cyberpunk"],
          portfolioUrl: "https://portfolio.example",
          socialHandle: "@artist",
        },
      },
    },
    _count: {
      artworks: 3,
      followers: 12,
      collections: 1,
    },
    followers: [],
  };
}

function buildArtwork(id, overrides = {}) {
  return {
    id,
    title: `Artwork ${id}`,
    description: "Artwork description",
    price: "120",
    priceTokens: null,
    favoriteCount: 4,
    createdAt: new Date("2026-07-04T11:00:00.000Z"),
    protection: true,
    category: {
      id: 1,
      name: "Illustration",
    },
    artist: buildArtist(3),
    _count: {
      favorites: 4,
    },
    favorites: [],
    ...overrides,
  };
}

async function startMarketplaceApp(t, overrides = {}) {
  const currentUser = overrides.authUser || collectorUser;
  const calls = {
    addFavorite: [],
    createPersonalCollection: [],
  };

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authRequiredPath]: buildAuthMiddleware(currentUser),
    [adminRequiredPath]: {
      isAdminUser(user) {
        return user?.role === "admin";
      },
    },
    [sessionServicePath]: {
      async getUserFromRequest() {
        return overrides.viewerUser ?? null;
      },
    },
    [marketplaceRepositoryPath]: {
      async getMarketplaceOverview() {
        return {
          stats: {
            artworks: 1,
            artists: 1,
          },
          artworks: [buildArtwork(12)],
          artists: [buildArtist(3)],
        };
      },
      async listPublicArtworks() {
        return overrides.listPublicArtworksResult || [buildArtwork(12)];
      },
      async findPublicArtworkById() {
        return overrides.findPublicArtworkByIdResult || buildArtwork(12);
      },
      async listRelatedArtworks() {
        return [buildArtwork(18)];
      },
      async listPublicArtists() {
        return overrides.listPublicArtistsResult || [buildArtist(3)];
      },
      async findPublicArtistById() {
        return (
          overrides.findPublicArtistByIdResult || {
            ...buildArtist(3),
            artworks: [buildArtwork(12)],
            collections: [
              {
                id: 21,
                artistId: 3,
                userId: null,
                title: "Featured collection",
                description: "A curated set",
                isPrivate: false,
                createdAt: new Date("2026-07-04T09:00:00.000Z"),
                items: [
                  {
                    artwork: buildArtwork(12),
                  },
                ],
              },
            ],
          }
        );
      },
      async listCollectionArtworkOptions() {
        return [buildArtwork(12)];
      },
    },
    [collectorRepositoryPath]: {
      async addFavorite(payload) {
        calls.addFavorite.push(payload);
      },
      async removeFavorite() {},
      async followArtist() {},
      async unfollowArtist() {},
      async listFavoriteArtworks() {
        return [buildArtwork(12)];
      },
      async listPersonalCollections() {
        return overrides.listPersonalCollectionsResult || [];
      },
      async createPersonalCollection(payload) {
        calls.createPersonalCollection.push(payload);

        return {
          id: 40,
          artistId: null,
          userId: currentUser.id,
          title: payload.title,
          description: payload.description,
          isPrivate: payload.isPrivate,
          createdAt: new Date("2026-07-04T12:00:00.000Z"),
          items: [],
        };
      },
      async updatePersonalCollection() {
        return null;
      },
      async deletePersonalCollection() {},
      async addArtworkToPersonalCollection() {
        return null;
      },
      async removeArtworkFromPersonalCollection() {
        return null;
      },
    },
  });

  const app = express();
  app.use(express.json());
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

test("GET /artworks returns the public catalog payload", async (t) => {
  const { baseUrl } = await startMarketplaceApp(t, {
    viewerUser: collectorUser,
    listPublicArtworksResult: [buildArtwork(12, { favorites: [{ id: 1 }] })],
  });

  const response = await requestJson(baseUrl, "/artworks");

  assert.equal(response.status, 200);
  assert.equal(response.body.artworks.length, 1);
  assert.equal(response.body.artworks[0].id, 12);
  assert.equal(response.body.artworks[0].isFavorite, true);
  assert.equal(response.body.artworks[0].artist.displayName, "Artist 3");
});

test("POST /artworks/:id/favorite stores a favorite for a collector account", async (t) => {
  const { baseUrl, calls } = await startMarketplaceApp(t);
  const response = await requestJson(baseUrl, "/artworks/12/favorite", {
    method: "POST",
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, "Artwork added to favorites.");
  assert.deepEqual(calls.addFavorite[0], {
    userId: collectorUser.id,
    artworkId: 12,
  });
});

test("POST /artworks/:id/favorite blocks admin accounts from collector actions", async (t) => {
  const { baseUrl } = await startMarketplaceApp(t, {
    authUser: {
      id: 1,
      role: "admin",
    },
  });
  const response = await requestJson(baseUrl, "/artworks/12/favorite", {
    method: "POST",
  });

  assert.equal(response.status, 403);
  assert.equal(
    response.body.message,
    "Admin accounts cannot use collector features.",
  );
});

test("GET /artists/:id returns the public artist profile payload", async (t) => {
  const { baseUrl } = await startMarketplaceApp(t);
  const response = await requestJson(baseUrl, "/artists/3");

  assert.equal(response.status, 200);
  assert.equal(response.body.artist.id, 3);
  assert.equal(response.body.artworks.length, 1);
  assert.equal(response.body.collections.length, 1);
  assert.equal(response.body.collections[0].title, "Featured collection");
});

test("POST /collections/me validates the title before creating a collection", async (t) => {
  const { baseUrl } = await startMarketplaceApp(t);
  const response = await requestJson(baseUrl, "/collections/me", {
    method: "POST",
    body: {
      title: "   ",
    },
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "The collection title is required.");
});

test("POST /collections/me creates a personal collection for the collector", async (t) => {
  const { baseUrl, calls } = await startMarketplaceApp(t);
  const response = await requestJson(baseUrl, "/collections/me", {
    method: "POST",
    body: {
      title: "My neon picks",
      description: "Best cyber artworks",
      isPrivate: true,
    },
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.collection.title, "My neon picks");
  assert.equal(response.body.collection.isPrivate, true);
  assert.deepEqual(calls.createPersonalCollection[0], {
    userId: collectorUser.id,
    title: "My neon picks",
    description: "Best cyber artworks",
    isPrivate: true,
  });
});
