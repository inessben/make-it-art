const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const servicePath = require.resolve("../src/services/artist-analytics.service");
const orderRepositoryPath = require.resolve("../src/repositories/order.repository");
const notificationRepositoryPath = require.resolve("../src/repositories/notification.repository");

function loadService({ orderItems = [], notifications = [], unreadCount = 0 } = {}) {
  const calls = {
    countUnreadForUser: [],
    listNotificationsForUser: [],
    listOrderItemsForArtist: []
  };

  const { moduleExports, restore } = loadModuleWithMocks(
    servicePath,
    {
      [orderRepositoryPath]: {
        async listOrderItemsForArtist(artistId) {
          calls.listOrderItemsForArtist.push(artistId);
          return orderItems;
        }
      },
      [notificationRepositoryPath]: {
        async listNotificationsForUser(userId, options) {
          calls.listNotificationsForUser.push({ userId, options });
          return notifications;
        },
        async countUnreadForUser(userId) {
          calls.countUnreadForUser.push(userId);
          return unreadCount;
        }
      }
    },
    {
      invalidate: [servicePath]
    }
  );

  return {
    calls,
    restore,
    ...moduleExports
  };
}

test("buildArtistDashboardPayload aggregates Stripe sales, refunds and notifications", async () => {
  const { buildArtistDashboardPayload, calls, restore } = loadService({
    orderItems: [
      {
        id: 10,
        artworkId: 7,
        title: "Aurora",
        quantity: 1,
        subtotalAmount: 5000,
        netAmount: 4167,
        commissionAmount: 292,
        artwork: { title: "Aurora" },
        order: {
          id: 31,
          publicId: "11111111-1111-1111-1111-111111111111",
          status: "PAID",
          totalAmount: 5000,
          createdAt: new Date("2026-07-20T12:00:00.000Z"),
          user: {
            username: "buyer-one",
            email: "buyer-one@example.com"
          },
          payments: [
            {
              status: "SUCCEEDED",
              amount: 5000,
              refunds: []
            }
          ]
        }
      },
      {
        id: 11,
        artworkId: 8,
        title: "Nocturne",
        quantity: 1,
        subtotalAmount: 2400,
        netAmount: 2000,
        commissionAmount: 140,
        artwork: { title: "Nocturne" },
        order: {
          id: 32,
          publicId: "22222222-2222-2222-2222-222222222222",
          status: "PARTIALLY_REFUNDED",
          totalAmount: 2400,
          createdAt: new Date("2026-07-21T12:00:00.000Z"),
          user: {
            username: "buyer-two",
            email: "buyer-two@example.com"
          },
          payments: [
            {
              status: "PARTIALLY_REFUNDED",
              amount: 2400,
              refunds: [
                {
                  status: "SUCCEEDED",
                  amount: 1200
                }
              ]
            }
          ]
        }
      },
      {
        id: 12,
        artworkId: 9,
        title: "Pulse",
        quantity: 1,
        subtotalAmount: 1000,
        netAmount: 833,
        commissionAmount: 58,
        artwork: { title: "Pulse" },
        order: {
          id: 33,
          publicId: "33333333-3333-3333-3333-333333333333",
          status: "PENDING_PAYMENT",
          totalAmount: 1000,
          createdAt: new Date("2026-07-25T12:00:00.000Z"),
          user: {
            username: "buyer-three",
            email: "buyer-three@example.com"
          },
          payments: [
            {
              status: "PENDING",
              amount: 1000,
              refunds: []
            }
          ]
        }
      }
    ],
    notifications: [
      {
        id: 1,
        type: "sale",
        title: "Nouvelle vente",
        message: "Une nouvelle vente est disponible.",
        payload: {
          orderReference: "#ORD-0031"
        },
        createdAt: new Date("2026-07-25T14:00:00.000Z"),
        readAt: null
      }
    ],
    unreadCount: 2
  });

  try {
    const payload = await buildArtistDashboardPayload(7, {
      userId: 42,
      artworks: 4,
      followers: 12,
      favorites: 24
    });

    assert.equal(calls.listOrderItemsForArtist[0], 7);
    assert.equal(calls.listNotificationsForUser[0].userId, 42);
    assert.equal(payload.finance.grossRevenueValue, 74);
    assert.equal(payload.finance.totalCommissionValue, 4.32);
    assert.equal(payload.finance.artistEarningsValue, 57.35);
    assert.equal(payload.finance.availableBalanceValue, 48.05);
    assert.equal(payload.finance.pendingBalanceValue, 7.75);
    assert.equal(payload.finance.refundedAmountValue, 12);
    assert.equal(payload.notifications.unreadCount, 2);
    assert.equal(payload.notifications.items[0].type, "sale");
    assert.equal(payload.recentSales[1].settlementStatus, "Partially refunded");
    assert.equal(payload.recentSales[2].status, "Pending");
    assert.equal(payload.analytics.topArtworks[0].title, "Aurora");
  } finally {
    restore();
  }
});

test("buildArtistSalesPayload falls back to legacy string prices when Stripe fields are absent", async () => {
  const { buildArtistSalesPayload, restore } = loadService({
    orderItems: [
      {
        id: 21,
        artworkId: 5,
        priceTokens: "120.00",
        artwork: { title: "Legacy artwork" },
        order: {
          id: 44,
          publicId: "44444444-4444-4444-4444-444444444444",
          createdAt: new Date("2026-07-10T10:00:00.000Z"),
          user: {
            username: "legacy-buyer",
            email: "legacy@example.com"
          },
          payments: [
            {
              status: "Succeeded"
            }
          ]
        }
      }
    ]
  });

  try {
    const payload = await buildArtistSalesPayload(5);

    assert.equal(payload.summary.totalSales, 1);
    assert.equal(payload.summary.grossRevenueValue, 120);
    assert.equal(payload.summary.totalCommissionValue, 7);
    assert.equal(payload.summary.artistEarningsValue, 93);
    assert.equal(payload.sales[0].status, "Paid");
    assert.equal(payload.sales[0].artistEarningsValue, 93);
  } finally {
    restore();
  }
});
