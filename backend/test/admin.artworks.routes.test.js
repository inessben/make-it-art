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
const auditLogRepositoryPath = require.resolve("../src/repositories/audit-log.repository");
const prismaPath = require.resolve("../src/lib/prisma");
const authServicePath = require.resolve("../src/services/auth.service");
const adminAuditServicePath = require.resolve("../src/services/admin-audit.service");
const adminUserManagementServicePath =
  require.resolve("../src/services/admin-user-management.service");

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
    updateArtworkModeration: [],
    auditLogs: []
  };

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [prismaPath]: {
      async $transaction(callback) {
        return callback({});
      }
    },
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
        return overrides.listOrdersForAdminResult || [];
      }
    },
    [paymentRepositoryPath]: {
      async listPaymentsForAdmin() {
        return [];
      }
    },
    [auditLogRepositoryPath]: {
      ADMIN_AUDIT_ENTITY_LABELS: {
        USER: "Users",
        ARTIST: "Artists",
        ARTIST_APPLICATION: "Artist applications",
        ARTWORK: "Artworks",
        ORDER: "Orders",
        PAYMENT: "Payments"
      },
      ADMIN_AUDIT_ENTITY_TYPES: [
        "USER",
        "ARTIST",
        "ARTIST_APPLICATION",
        "ARTWORK",
        "ORDER",
        "PAYMENT"
      ],
      isAdminAuditEntityType(value) {
        return ["USER", "ARTIST", "ARTIST_APPLICATION", "ARTWORK", "ORDER", "PAYMENT"].includes(
          String(value || "")
            .trim()
            .toUpperCase()
        );
      },
      async listAdminAuditLogs() {
        return {
          entries: [],
          totalEntries: 0,
          groupedEntries: [],
          filters: {
            entityType: "",
            entityId: "",
            actorUserId: null,
            actionQuery: "",
            limit: 120
          }
        };
      },
      parseAuditLimit(value, fallbackValue = 120) {
        const parsedValue = Number.parseInt(String(value), 10);

        if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
          return fallbackValue;
        }

        return Math.min(parsedValue, 200);
      }
    },
    [authServicePath]: {
      async inviteAdminUser() {
        return null;
      }
    },
    [adminAuditServicePath]: {
      async writeAdminAuditLog(_prismaClient, payload) {
        calls.auditLogs.push(payload);
        return null;
      }
    },
    [adminUserManagementServicePath]: {
      AdminUserManagementError: class AdminUserManagementError extends Error {},
      async updateUserAccountStatus() {
        return null;
      },
      async removeAdminAccess() {
        return null;
      },
      async removeSuperAdminAccess() {
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
  assert.equal(response.body.artworks[1].statusLabel, "Published");
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
  assert.equal(calls.updateArtworkModeration[0].artworkId, 12);
  assert.equal(calls.updateArtworkModeration[0].status, "rejected");
  assert.equal(calls.updateArtworkModeration[0].moderationNote, "Le visuel doit etre retravaille.");
  assert.equal(calls.updateArtworkModeration[0].moderatedByAdminId, adminUser.id);
  assert.deepEqual(calls.updateArtworkModeration[0].prismaClient, {});
  assert.equal(calls.auditLogs.length, 1);
  assert.equal(calls.auditLogs[0].action, "ARTWORK_MODERATION_REJECTED");
  assert.equal(calls.auditLogs[0].entityType, "ARTWORK");
  assert.equal(calls.auditLogs[0].entityId, 12);
});

test("GET /admin/orders exposes only the safe refund balance and history", async (t) => {
  const orderPublicId = "b5cb23ef-d417-4ad4-af3f-0e8f3394262e";
  const { baseUrl } = await startAdminArtworksApp(t, {
    listOrdersForAdminResult: [
      {
        id: 42,
        publicId: orderPublicId,
        status: "PARTIALLY_REFUNDED",
        totalAmount: 1990,
        currency: "EUR",
        createdAt: new Date("2026-07-25T10:00:00.000Z"),
        user: {
          username: "Refund Buyer",
          email: "buyer@example.test"
        },
        items: [{ id: 1 }],
        payments: [
          {
            id: 7,
            checkoutVersion: 1,
            providerPaymentId: "pi_must_not_be_exposed",
            status: "PARTIALLY_REFUNDED",
            amount: 1990,
            currency: "EUR",
            refunds: [
              {
                publicId: "2b8294f5-dab0-40db-a22f-d1ec119045b4",
                providerRefundId: "re_must_not_be_exposed",
                idempotencyKey: "d78ff548-6138-46d9-8f55-f8a819e4a8af",
                status: "SUCCEEDED",
                amount: 500,
                currency: "EUR",
                reasonCode: "CUSTOMER_REQUEST",
                createdAt: new Date("2026-07-25T10:10:00.000Z"),
                updatedAt: new Date("2026-07-25T10:11:00.000Z")
              },
              {
                publicId: "3c0d5bc9-58eb-487d-a30a-ccdd86bbbc9c",
                status: "PENDING",
                amount: 300,
                currency: "EUR",
                reasonCode: "DUPLICATE",
                createdAt: new Date("2026-07-25T10:12:00.000Z"),
                updatedAt: new Date("2026-07-25T10:12:00.000Z")
              }
            ]
          }
        ]
      }
    ]
  });

  const response = await requestJson(baseUrl, "/admin/orders");

  assert.equal(response.status, 200);
  assert.equal(response.body.orders[0].publicId, orderPublicId);
  assert.equal(response.body.orders[0].status, "Partially refunded");
  assert.equal(response.body.orders[0].refundedAmount, 500);
  assert.equal(response.body.orders[0].pendingRefundAmount, 300);
  assert.equal(response.body.orders[0].refundableAmount, 1190);
  assert.equal(response.body.orders[0].canRefund, true);
  assert.deepEqual(response.body.orders[0].refunds[0], {
    id: "2b8294f5-dab0-40db-a22f-d1ec119045b4",
    status: "SUCCEEDED",
    amount: 500,
    currency: "EUR",
    reason: "CUSTOMER_REQUEST",
    createdAt: "2026-07-25T10:10:00.000Z",
    updatedAt: "2026-07-25T10:11:00.000Z"
  });
  assert.equal(JSON.stringify(response.body).includes("pi_must_not_be_exposed"), false);
  assert.equal(JSON.stringify(response.body).includes("re_must_not_be_exposed"), false);
  assert.equal(JSON.stringify(response.body).includes("d78ff548"), false);
});
