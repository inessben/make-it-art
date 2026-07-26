const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/artist.routes");
const authRequiredPath = require.resolve("../src/middlewares/auth-required.middleware");
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
const analyticsServicePath = require.resolve("../src/services/artist-analytics.service");

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
  _count: {
    artworks: 2,
    followers: 5,
    collections: 1
  }
};

function buildAuthMiddleware(user) {
  return {
    authRequired(req, _res, next) {
      req.user = user;
      next();
    }
  };
}

async function startArtistDashboardApp(t, overrides = {}) {
  const calls = {
    buildArtistDashboardPayload: [],
    buildArtistSalesPayload: [],
    listArtworksByArtistId: []
  };

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authRequiredPath]: buildAuthMiddleware(overrides.authUser || authUser),
    [applicationRepositoryPath]: {
      async findByUserId() {
        return null;
      }
    },
    [artistRepositoryPath]: {
      async findByUserId() {
        return verifiedArtist;
      }
    },
    [artworkRepositoryPath]: {
      async listArtworksByArtistId(artistId) {
        calls.listArtworksByArtistId.push(artistId);
        return (
          overrides.artworks || [
            { id: 1, favoriteCount: 3 },
            { id: 2, favoriteCount: 7 }
          ]
        );
      }
    },
    [categoryRepositoryPath]: {},
    [userRepositoryPath]: {},
    [contractServicePath]: {},
    [serializeAuthUserPath]: {},
    [uploadArtworkMiddlewarePath]: {
      handleArtworkUpload(_req, _res, next) {
        next();
      }
    },
    [artistRequiredMiddlewarePath]: {
      async ensureVerifiedArtist(req, _res, next) {
        req.artist = verifiedArtist;
        next();
      }
    },
    [analyticsServicePath]: {
      async buildArtistDashboardPayload(artistId, artistStats) {
        calls.buildArtistDashboardPayload.push({ artistId, artistStats });
        return (
          overrides.dashboard || {
            stats: [{ label: "Ventes", value: 2 }],
            performance: { salesToday: 1 },
            analytics: { salesByMonth: [], topArtworks: [] },
            recentSales: []
          }
        );
      },
      async buildArtistSalesPayload(artistId) {
        calls.buildArtistSalesPayload.push(artistId);
        return (
          overrides.sales || {
            summary: { totalSales: 2 },
            sales: []
          }
        );
      }
    }
  });

  const app = express();
  app.use(express.json());
  app.use(router);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  t.after(async () => {
    restore();
    await new Promise((resolve) => server.close(resolve));
  });

  return { port, calls };
}

test("GET /artists/me/dashboard returns analytics payload", async (t) => {
  const { port, calls } = await startArtistDashboardApp(t);

  const response = await fetch(`http://127.0.0.1:${port}/artists/me/dashboard`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.stats[0].label, "Ventes");
  assert.equal(calls.buildArtistDashboardPayload.length, 1);
  assert.equal(calls.buildArtistDashboardPayload[0].artistStats.favorites, 10);
});

test("GET /artists/me/sales returns sales payload", async (t) => {
  const { port, calls } = await startArtistDashboardApp(t);

  const response = await fetch(`http://127.0.0.1:${port}/artists/me/sales`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.summary.totalSales, 2);
  assert.deepEqual(calls.buildArtistSalesPayload, [verifiedArtist.id]);
});
