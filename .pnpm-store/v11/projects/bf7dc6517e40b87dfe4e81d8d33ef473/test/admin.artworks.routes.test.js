const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/admin.routes");
const authRequiredPath = require.resolve("../src/middlewares/auth-required.middleware");
const adminRequiredPath = require.resolve("../src/middlewares/admin-required.middleware");
const applicationRepositoryPath =
  require.resolve("../src/repositories/artist-application-draft.repository");
const userRepositoryPath = require.resolve("../src/repositories/user.repository");
const artistRepositoryPath = require.resolve("../src/repositories/artist.repository");
const artworkRepositoryPath = require.resolve("../src/repositories/artwork.repository");
const orderRepositoryPath = require.resolve("../src/repositories/order.repository");
const paymentRepositoryPath = require.resolve("../src/repositories/payment.repository");
const authServicePath = require.resolve("../src/services/auth.service");

const adminUser = {
  id: 1,
  email: "admin@example.com",
  username: "Admin"
};

function authMiddleware(req, _res, next) {
  req.user = adminUser;
  next();
}

function adminMiddleware(_req, _res, next) {
  next();
}

function buildArtwork(id, overrides = {}) {
  return {
    id,
    artistId: 3,
    title: `Artwork ${id}`,
    price: "120",
    priceTokens: "120",
    favoriteCount: 4,
    protection: true,
    moderationStatus: "pending",
    moderationNote: null,
    moderatedAt: null,
    createdAt: new Date("2026-07-10T11:00:00.000Z"),
    category: {
      id: 1,
      name: "Illustration"
    },
    artist: {
      id: 3,
      displayName: "Ada Art",
      user: {
        username: "Ada Lovelace",
        email: "artist@example.com"
      }
    },
    moderatedByAdmin: null,
    _count: {
      favorites: 4,
      orderItems: 2
    },
    ...overrides
  };
}

async function startAdminArtworksApp(t, overrides = {}) {
  const calls = {
    updateArtworkModeration: []
  };

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authRequiredPath]: {
      authRequired: authMiddleware
    },
    [adminRequiredPath]: {
      adminRequired: adminMiddleware,
      superAdminRequired: adminMiddleware,
      isAdminUser() {
        return true;
      },
      isSuperAdminUser() {
        return false;
      }
    },
    [applicationRepositoryPath]: {
      async listSubmittedApplications() {
        return [];
      },
      async findById() {
        return null;
      }
    },
    [userRepositoryPath]: {
      async listUsersForAdmin() {
        return [];
      }
    },
    [artistRepositoryPath]: {
      async listArtistsForAdmin() {
        return [];
      },
      async updateArtistVerification() {
        return null;
      }
    },
    [artworkRepositoryPath]: {
      async listArtworksForAdmin() {
        return (
          overrides.listArtworksForAdminResult || [
            buildArtwork(10, {
              moderationStatus: "pending"
            }),
            buildArtwork(11, {
              moderationStatus: "approved",
              moderatedAt: new Date("2026-07-11T08:30:00.000Z"),
              moderatedByAdmin: {
                id: adminUser.id,
                username: adminUser.username,
                email: adminUser.email
              }
            }),
            buildArtwork(12, {
              moderationStatus: "hidden",
              moderationNote: "Masquee temporairement."
            })
          ]
        );
      },
      async updateArtworkModeration(payload) {
        calls.updateArtworkModeration.push(payload);

        return (
          overrides.updateArtworkModerationResult ||
          buildArtwork(payload.artworkId, {
            moderationStatus: payload.status,
            moderationNote: payload.moderationNote || null,
            moderatedAt: new Date("2026-07-11T09:00:00.000Z"),
            moderatedByAdmin: {
              id: adminUser.id,
              username: adminUser.username,
              email: adminUser.email
            }
          })
        );
      }
    },
    [orderRepositoryPath]: {
      async listOrdersForAdmin() {
        return [];
      }
    },
    [paymentRepositoryPath]: {
      async listPaymentsForAdmin() {
        return [];
      }
    },
    [authServicePath]: {
      async inviteAdminUser() {
        return null;
      }
    }
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

test("GET /admin/artworks returns real moderation statuses and summary counts", async (t) => {
  const { baseUrl } = await startAdminArtworksApp(t);
  const response = await requestJson(baseUrl, "/admin/artworks");

  assert.equal(response.status, 200);
  assert.equal(response.body.summary.totalArtworks, 3);
  assert.equal(response.body.summary.pendingArtworks, 1);
  assert.equal(response.body.summary.approvedArtworks, 1);
  assert.equal(response.body.summary.hiddenArtworks, 1);
  assert.equal(response.body.artworks[1].status, "approved");
  assert.equal(response.body.artworks[1].statusLabel, "Approved");
  assert.equal(response.body.artworks[1].reviewerName, "Admin");
});

test("PATCH /admin/artworks/:id/moderation updates the artwork moderation status", async (t) => {
  const { baseUrl, calls } = await startAdminArtworksApp(t);
  const response = await requestJson(baseUrl, "/admin/artworks/12/moderation", {
    method: "PATCH",
    body: {
      status: "rejected",
      moderationNote: "Le visuel doit etre retravaille."
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.artwork.status, "rejected");
  assert.equal(response.body.artwork.statusLabel, "Rejected");
  assert.equal(response.body.artwork.moderationNote, "Le visuel doit etre retravaille.");
  assert.equal(calls.updateArtworkModeration.length, 1);
  assert.deepEqual(calls.updateArtworkModeration[0], {
    artworkId: 12,
    status: "rejected",
    moderationNote: "Le visuel doit etre retravaille.",
    moderatedByAdminId: adminUser.id
  });
});
