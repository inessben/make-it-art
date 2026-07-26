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
  username: "Admin",
  email: "admin@example.com",
  role: "admin",
  admin: {
    isSuperAdmin: true
  }
};

function authMiddleware(req, _res, next) {
  req.user = adminUser;
  next();
}

function adminMiddleware(_req, _res, next) {
  next();
}

async function startAdminDetailsApp(t, overrides = {}) {
  const calls = {
    listAdminAuditLogs: []
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
      isAdminUser(user) {
        return user?.role === "admin" || Boolean(user?.admin);
      },
      isSuperAdminUser(user) {
        return user?.admin?.isSuperAdmin === true;
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
      },
      async findUserDetailForAdmin() {
        return overrides.userDetail || null;
      }
    },
    [artistRepositoryPath]: {
      async listArtistsForAdmin() {
        return [];
      },
      async updateArtistVerification() {
        return null;
      },
      async findArtistDetailForAdmin() {
        return overrides.artistDetail || null;
      }
    },
    [artworkRepositoryPath]: {
      async listArtworksForAdmin() {
        return [];
      }
    },
    [orderRepositoryPath]: {
      async listOrdersForAdmin() {
        return [];
      },
      async findOrderDetailForAdmin() {
        return overrides.orderDetail || null;
      }
    },
    [paymentRepositoryPath]: {
      async listPaymentsForAdmin() {
        return [];
      },
      async findPaymentDetailForAdmin() {
        return overrides.paymentDetail || null;
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
      async listAdminAuditLogs(payload) {
        calls.listAdminAuditLogs.push(payload);

        return (
          overrides.auditLogList || {
            entries: [],
            totalEntries: 0,
            groupedEntries: [],
            filters: {
              entityType: payload.entityType || "",
              entityId: payload.entityId || "",
              actorUserId: payload.actorUserId || null,
              actionQuery: payload.actionQuery || "",
              limit: payload.limit || 120
            }
          }
        );
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
      async writeAdminAuditLog() {
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

async function requestJson(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  const payload = await response.json();

  return {
    status: response.status,
    body: payload
  };
}

test("GET /admin/users/:id returns a full admin user detail payload", async (t) => {
  const { baseUrl } = await startAdminDetailsApp(t, {
    userDetail: {
      id: 10,
      username: "Collector",
      email: "collector@example.com",
      phone: "+33600000000",
      bio: "Collector bio",
      verified: true,
      isActive: true,
      blockedAt: null,
      role: null,
      admin: null,
      artist: {
        id: 7,
        userId: 10,
        displayName: "Collector Art",
        verified: true,
        createdAt: new Date("2026-07-01T09:00:00.000Z"),
        artworks: [],
        collections: [],
        _count: {
          artworks: 0,
          followers: 0,
          collections: 0
        }
      },
      artistApplicationDraft: {
        id: 4,
        status: "approved",
        payload: {
          firstName: "Ada",
          lastName: "Lovelace",
          displayName: "Collector Art"
        },
        reviewNote: "Approved",
        submittedAt: new Date("2026-07-02T09:00:00.000Z"),
        reviewedAt: new Date("2026-07-03T09:00:00.000Z"),
        contractPdf: Buffer.from("pdf"),
        contractSignedAt: new Date("2026-07-02T09:10:00.000Z"),
        contractAcceptedAt: new Date("2026-07-02T09:10:00.000Z"),
        reviewedByAdmin: {
          id: 1,
          username: "Admin",
          email: "admin@example.com",
          admin: {
            isSuperAdmin: true
          }
        }
      },
      orders: [
        {
          id: 42,
          publicId: "11111111-1111-1111-1111-111111111111",
          status: "PAID",
          totalAmount: 3500,
          currency: "EUR",
          createdAt: new Date("2026-07-10T10:00:00.000Z"),
          items: [{ id: 1 }],
          payments: [
            {
              id: 5,
              status: "SUCCEEDED",
              amount: 3500,
              currency: "EUR",
              refunds: []
            }
          ]
        }
      ],
      personalCollections: [
        {
          id: 2,
          title: "Favorites",
          description: "Personal picks",
          isPrivate: false,
          isDefaultFavorites: true,
          createdAt: new Date("2026-07-11T10:00:00.000Z"),
          _count: {
            items: 3
          }
        }
      ],
      favorites: [],
      follows: [],
      auditLogs: [
        {
          id: 90,
          action: "LOGIN_SUCCESS",
          entityType: "SESSION",
          entityId: "10",
          ipAddress: "127.0.0.1",
          createdAt: new Date("2026-07-12T10:00:00.000Z"),
          user: adminUser
        }
      ],
      accountAuditLogs: [
        {
          id: 91,
          action: "USER_ACCOUNT_SUSPENDED",
          entityType: "USER",
          entityId: "10",
          ipAddress: "127.0.0.1",
          createdAt: new Date("2026-07-13T10:00:00.000Z"),
          user: adminUser
        }
      ],
      _count: {
        orders: 1,
        personalCollections: 1,
        favorites: 0,
        follows: 0,
        auditLogs: 1,
        refundsRequested: 0
      },
      createdAt: new Date("2026-07-01T08:00:00.000Z")
    }
  });

  const response = await requestJson(baseUrl, "/admin/users/10");

  assert.equal(response.status, 200);
  assert.equal(response.body.user.id, 10);
  assert.equal(response.body.user.artistProfile.id, 7);
  assert.equal(response.body.user.artistApplication.status, "approved");
  assert.equal(response.body.recentOrders[0].reference, "#ORD-0042");
  assert.equal(response.body.collections[0].itemsCount, 3);
  assert.equal(response.body.accountHistory[0].action, "USER_ACCOUNT_SUSPENDED");
});

test("GET /admin/artists/:id returns artist profile detail with recent sales", async (t) => {
  const { baseUrl } = await startAdminDetailsApp(t, {
    artistDetail: {
      id: 7,
      userId: 10,
      displayName: "Artist One",
      verified: true,
      createdAt: new Date("2026-07-01T09:00:00.000Z"),
      user: {
        id: 10,
        username: "artist",
        email: "artist@example.com",
        phone: "+33600000000",
        verified: true,
        isActive: true,
        role: null,
        admin: null,
        createdAt: new Date("2026-07-01T08:00:00.000Z"),
        artistApplicationDraft: null
      },
      artworks: [],
      collections: [],
      followers: [],
      recentSales: [
        {
          id: 12,
          artworkId: 8,
          artworkTitle: "Aurora",
          artistName: "Artist One",
          quantity: 1,
          unitAmount: 4200,
          subtotalAmount: 4200,
          currency: "EUR",
          createdAt: new Date("2026-07-20T12:00:00.000Z"),
          artwork: {
            id: 8,
            artistId: 7,
            title: "Aurora",
            priceAmount: 4200,
            currency: "EUR",
            favoriteCount: 2,
            moderationStatus: "approved",
            saleStatus: "AVAILABLE",
            stockQuantity: 1,
            reservedQuantity: 0,
            category: {
              name: "Illustration"
            },
            artist: {
              displayName: "Artist One",
              user: {
                username: "artist"
              }
            },
            _count: {
              favorites: 2,
              orderItems: 1
            }
          },
          order: {
            id: 31,
            publicId: "22222222-2222-2222-2222-222222222222",
            status: "PAID",
            currency: "EUR",
            totalAmount: 4200,
            createdAt: new Date("2026-07-20T12:00:00.000Z"),
            user: {
              id: 55,
              username: "Buyer",
              email: "buyer@example.com"
            }
          }
        }
      ],
      auditLogs: [
        {
          id: 77,
          action: "ARTIST_VERIFIED",
          entityType: "ARTIST",
          entityId: "7",
          ipAddress: "127.0.0.1",
          createdAt: new Date("2026-07-20T14:00:00.000Z"),
          user: adminUser
        }
      ],
      soldItemsCount: 1,
      _count: {
        artworks: 1,
        followers: 0,
        collections: 0
      }
    }
  });

  const response = await requestJson(baseUrl, "/admin/artists/7");

  assert.equal(response.status, 200);
  assert.equal(response.body.artist.id, 7);
  assert.equal(response.body.metrics.soldItemsCount, 1);
  assert.equal(response.body.recentSales[0].order.reference, "#ORD-0031");
  assert.equal(response.body.recentSales[0].artwork.title, "Aurora");
  assert.equal(response.body.auditLog[0].action, "ARTIST_VERIFIED");
});

test("GET /admin/orders/:publicId returns order history sections", async (t) => {
  const { baseUrl } = await startAdminDetailsApp(t, {
    orderDetail: {
      id: 42,
      publicId: "33333333-3333-3333-3333-333333333333",
      status: "PAID",
      customerType: "B2C",
      marketCountry: "FR",
      currency: "EUR",
      subtotalAmount: 5000,
      discountAmount: 0,
      subtotalExcludingTaxAmount: 4167,
      taxAmount: 833,
      taxRateBps: 2000,
      taxBehavior: "INCLUSIVE",
      feeAmount: 0,
      commissionAmount: 350,
      commissionRateBps: 700,
      totalAmount: 5000,
      pricingFingerprint: "fingerprint",
      billingSnapshot: { city: "Paris" },
      createdAt: new Date("2026-07-20T10:00:00.000Z"),
      updatedAt: new Date("2026-07-20T10:10:00.000Z"),
      paidAt: new Date("2026-07-20T10:15:00.000Z"),
      canceledAt: null,
      expiresAt: new Date("2026-07-21T10:00:00.000Z"),
      user: {
        id: 55,
        username: "Buyer",
        email: "buyer@example.com"
      },
      items: [],
      payments: [
        {
          id: 6,
          orderId: 42,
          provider: "STRIPE",
          method: "card",
          status: "SUCCEEDED",
          amount: 5000,
          refundedAmount: 0,
          currency: "EUR",
          providerPaymentId: "pi_123",
          providerChargeId: "ch_123",
          providerStatus: "succeeded",
          failureCode: null,
          createdAt: new Date("2026-07-20T10:15:00.000Z"),
          updatedAt: new Date("2026-07-20T10:15:00.000Z"),
          refunds: []
        }
      ],
      refunds: [],
      financialTransitions: [
        {
          id: 7,
          paymentId: 6,
          stripeEventId: "evt_123",
          stripeObjectId: "pi_123",
          entityType: "ORDER",
          previousStatus: "PENDING_PAYMENT",
          nextStatus: "PAID",
          reasonCode: "PAYMENT_SUCCEEDED",
          createdAt: new Date("2026-07-20T10:15:00.000Z")
        }
      ],
      fulfillmentTasks: [
        {
          id: 9,
          taskType: "ISSUE_CERTIFICATE",
          taskKey: "order:33333333-3333-3333-3333-333333333333:ISSUE_CERTIFICATE",
          status: "COMPLETED",
          attemptCount: 1,
          availableAt: new Date("2026-07-20T10:16:00.000Z"),
          lockedAt: null,
          lastErrorCode: null,
          effectReference: "cert_1",
          createdAt: new Date("2026-07-20T10:16:00.000Z"),
          processedAt: new Date("2026-07-20T10:17:00.000Z")
        }
      ],
      operatorAlerts: [],
      disputes: [],
      invoices: [],
      digitalEntitlements: [],
      ownershipCertificates: [],
      reservations: [],
      auditLogs: [
        {
          id: 80,
          action: "REFUND_REQUESTED",
          entityType: "ORDER",
          entityId: "33333333-3333-3333-3333-333333333333",
          ipAddress: "127.0.0.1",
          createdAt: new Date("2026-07-20T11:00:00.000Z"),
          user: adminUser
        }
      ]
    }
  });

  const response = await requestJson(baseUrl, "/admin/orders/33333333-3333-3333-3333-333333333333");

  assert.equal(response.status, 200);
  assert.equal(response.body.order.reference, "#ORD-0042");
  assert.equal(response.body.payments[0].reference, "PAY-00006");
  assert.equal(response.body.transitions[0].nextStatus, "PAID");
  assert.equal(response.body.fulfillmentTasks[0].taskType, "ISSUE_CERTIFICATE");
  assert.equal(response.body.auditLog[0].action, "REFUND_REQUESTED");
});

test("GET /admin/payments/:id returns payment detail with linked order history", async (t) => {
  const { baseUrl } = await startAdminDetailsApp(t, {
    paymentDetail: {
      id: 6,
      orderId: 42,
      provider: "STRIPE",
      method: "card",
      status: "SUCCEEDED",
      amount: 5000,
      refundedAmount: 0,
      currency: "EUR",
      providerPaymentId: "pi_123",
      providerChargeId: "ch_123",
      providerStatus: "succeeded",
      failureCode: null,
      createdAt: new Date("2026-07-20T10:15:00.000Z"),
      updatedAt: new Date("2026-07-20T10:15:00.000Z"),
      succeededAt: new Date("2026-07-20T10:15:00.000Z"),
      failedAt: null,
      canceledAt: null,
      order: {
        id: 42,
        publicId: "33333333-3333-3333-3333-333333333333",
        status: "PAID",
        currency: "EUR",
        subtotalAmount: 5000,
        taxAmount: 833,
        totalAmount: 5000,
        createdAt: new Date("2026-07-20T10:00:00.000Z"),
        paidAt: new Date("2026-07-20T10:15:00.000Z"),
        user: {
          id: 55,
          username: "Buyer",
          email: "buyer@example.com"
        },
        items: []
      },
      refunds: [],
      webhookEvents: [
        {
          id: 21,
          eventId: "evt_123",
          eventType: "payment_intent.succeeded",
          stripeObjectId: "pi_123",
          status: "PROCESSED",
          attemptCount: 1,
          lastErrorCode: null,
          createdAt: new Date("2026-07-20T10:15:00.000Z"),
          processedAt: new Date("2026-07-20T10:15:01.000Z")
        }
      ],
      financialTransitions: [],
      operatorAlerts: [],
      disputes: [],
      auditLogs: [
        {
          id: 88,
          action: "STRIPE_WEBHOOK_REPLAYED",
          entityType: "STRIPE_WEBHOOK_EVENT",
          entityId: "evt_123",
          ipAddress: "127.0.0.1",
          createdAt: new Date("2026-07-20T12:00:00.000Z"),
          user: adminUser
        }
      ]
    }
  });

  const response = await requestJson(baseUrl, "/admin/payments/6");

  assert.equal(response.status, 200);
  assert.equal(response.body.payment.reference, "PAY-00006");
  assert.equal(response.body.payment.order.reference, "#ORD-0042");
  assert.equal(response.body.webhookEvents[0].eventType, "payment_intent.succeeded");
  assert.equal(response.body.auditLog[0].action, "STRIPE_WEBHOOK_REPLAYED");
});

test("GET /admin/audit-log returns filtered admin audit entries", async (t) => {
  const { baseUrl, calls } = await startAdminDetailsApp(t, {
    auditLogList: {
      entries: [
        {
          id: 102,
          action: "USER_ACCOUNT_SUSPENDED",
          entityType: "USER",
          entityId: "10",
          ipAddress: "127.0.0.1",
          createdAt: new Date("2026-07-24T09:00:00.000Z"),
          user: adminUser
        }
      ],
      totalEntries: 1,
      groupedEntries: [
        {
          entityType: "USER",
          label: "Users",
          count: 1
        }
      ],
      filters: {
        entityType: "USER",
        entityId: "10",
        actorUserId: null,
        actionQuery: "SUSPENDED",
        limit: 60
      }
    }
  });

  const response = await requestJson(
    baseUrl,
    "/admin/audit-log?entityType=USER&entityId=10&action=SUSPENDED&limit=60"
  );

  assert.equal(response.status, 200);
  assert.equal(calls.listAdminAuditLogs.length, 1);
  assert.equal(calls.listAdminAuditLogs[0].entityType, "USER");
  assert.equal(calls.listAdminAuditLogs[0].entityId, "10");
  assert.equal(calls.listAdminAuditLogs[0].actionQuery, "SUSPENDED");
  assert.equal(calls.listAdminAuditLogs[0].limit, 60);
  assert.equal(response.body.summary.totalEntries, 1);
  assert.equal(response.body.entries[0].action, "USER_ACCOUNT_SUSPENDED");
  assert.equal(response.body.entries[0].entityLabel, "Users");
  assert.equal(response.body.entityTypes[0].value, "USER");
});
