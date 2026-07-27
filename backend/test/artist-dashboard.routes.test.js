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
const artistWithdrawalServicePath = require.resolve("../src/services/artist-withdrawal.service");

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
    buildArtistWithdrawalWorkspace: [],
    createArtistWithdrawalRequest: [],
    cancelArtistWithdrawal: [],
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
    },
    [artistWithdrawalServicePath]: {
      ArtistWithdrawalError: class ArtistWithdrawalError extends Error {
        constructor(code, message, statusCode = 400) {
          super(message);
          this.code = code;
          this.statusCode = statusCode;
        }
      },
      async buildArtistWithdrawalWorkspace(artistId) {
        calls.buildArtistWithdrawalWorkspace.push(artistId);
        return (
          overrides.withdrawals || {
            finance: {
              availableToWithdraw: "EUR 150.00",
              availableToWithdrawValue: 150,
              pendingWithdrawalAmount: "EUR 40.00",
              pendingWithdrawalAmountValue: 40,
              paidOutAmount: "EUR 60.00",
              paidOutAmountValue: 60,
              lifetimeAvailableBalance: "EUR 250.00",
              lifetimeAvailableBalanceValue: 250,
              minimumRequestAmount: "EUR 25.00",
              minimumRequestAmountValue: 25
            },
            summary: {
              totalRequests: 2,
              requestedCount: 1,
              approvedCount: 1,
              rejectedCount: 0,
              paidCount: 0,
              canceledCount: 0
            },
            requests: [
              {
                publicId: "11111111-1111-4111-8111-111111111111",
                status: "REQUESTED",
                amountLabel: "EUR 40.00",
                amountValue: 40,
                createdAt: "2026-07-25T10:00:00.000Z"
              }
            ]
          }
        );
      },
      async createArtistWithdrawalRequest(payload) {
        calls.createArtistWithdrawalRequest.push(payload);
        return (
          overrides.createdWithdrawal || {
            publicId: "22222222-2222-4222-8222-222222222222",
            status: "REQUESTED",
            amountLabel: "EUR 80.00",
            amountValue: 80
          }
        );
      },
      async cancelArtistWithdrawal(payload) {
        calls.cancelArtistWithdrawal.push(payload);
        return (
          overrides.canceledWithdrawal || {
            publicId: payload.publicId,
            status: "CANCELED",
            amountLabel: "EUR 40.00",
            amountValue: 40
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
  assert.equal(calls.buildArtistWithdrawalWorkspace.length, 1);
  assert.equal(calls.buildArtistDashboardPayload[0].artistStats.favorites, 10);
  assert.equal(body.withdrawals.availableToWithdraw, "EUR 150.00");
  assert.equal(body.recentWithdrawals[0].status, "REQUESTED");
});

test("GET /artists/me/sales returns sales payload", async (t) => {
  const { port, calls } = await startArtistDashboardApp(t);

  const response = await fetch(`http://127.0.0.1:${port}/artists/me/sales`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.summary.totalSales, 2);
  assert.deepEqual(calls.buildArtistSalesPayload, [verifiedArtist.id]);
});

test("GET /artists/me/withdrawals returns the artist withdrawal workspace", async (t) => {
  const { port, calls } = await startArtistDashboardApp(t);

  const response = await fetch(`http://127.0.0.1:${port}/artists/me/withdrawals`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(calls.buildArtistWithdrawalWorkspace.length, 1);
  assert.equal(body.finance.minimumRequestAmount, "EUR 25.00");
  assert.equal(body.requests[0].publicId, "11111111-1111-4111-8111-111111111111");
});

test("POST /artists/me/withdrawals submits a new withdrawal request", async (t) => {
  const { port, calls } = await startArtistDashboardApp(t);

  const response = await fetch(`http://127.0.0.1:${port}/artists/me/withdrawals`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      amount: "80.00",
      note: "Monthly payout"
    })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(calls.createArtistWithdrawalRequest.length, 1);
  assert.equal(calls.createArtistWithdrawalRequest[0].artist.id, verifiedArtist.id);
  assert.equal(calls.createArtistWithdrawalRequest[0].user.id, authUser.id);
  assert.equal(calls.createArtistWithdrawalRequest[0].amount, "80.00");
  assert.equal(body.withdrawal.status, "REQUESTED");
});

test("PATCH /artists/me/withdrawals/:publicId/cancel cancels a pending request", async (t) => {
  const { port, calls } = await startArtistDashboardApp(t);
  const publicId = "11111111-1111-4111-8111-111111111111";

  const response = await fetch(
    `http://127.0.0.1:${port}/artists/me/withdrawals/${publicId}/cancel`,
    {
      method: "PATCH"
    }
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(calls.cancelArtistWithdrawal.length, 1);
  assert.equal(calls.cancelArtistWithdrawal[0].artistId, verifiedArtist.id);
  assert.equal(calls.cancelArtistWithdrawal[0].actorUserId, authUser.id);
  assert.equal(calls.cancelArtistWithdrawal[0].publicId, publicId);
  assert.equal(body.withdrawal.status, "CANCELED");
});
