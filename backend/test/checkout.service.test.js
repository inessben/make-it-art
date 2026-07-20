const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const servicePath = require.resolve("../src/services/checkout.service");
const prismaPath = require.resolve("../src/lib/prisma");
const orderRepositoryPath =
  require.resolve("../src/repositories/order.repository");
const notificationRepositoryPath =
  require.resolve("../src/repositories/notification.repository");
const mailServicePath = require.resolve("../src/services/mail.service");
const envPath = require.resolve("../src/config/env");

const buyer = {
  id: 5,
  username: "Collector One",
  email: "collector@example.com",
};

const artistUser = {
  id: 9,
  email: "artist@example.com",
  username: "Ada Art",
};

const artwork = {
  id: 12,
  title: "Neon Garden",
  price: "120 tokens",
  priceTokens: "120 tokens",
  artist: {
    id: 3,
    userId: artistUser.id,
    displayName: "Ada Art",
    user: artistUser,
  },
};

function loadCheckoutService(overrides = {}) {
  const calls = {
    createCheckoutOrder: [],
    createNotification: [],
    sendArtistSaleEmail: [],
    findMany: [],
    findUnique: [],
  };

  const { moduleExports: service, restore } = loadModuleWithMocks(servicePath, {
    [envPath]: {
      appBaseUrl: "http://localhost:3000",
    },
    [prismaPath]: {
      artwork: {
        async findMany(query) {
          calls.findMany.push(query);
          return overrides.artworks || [artwork];
        },
      },
      user: {
        async findUnique(query) {
          calls.findUnique.push(query);
          return buyer;
        },
      },
    },
    [orderRepositoryPath]: {
      async createCheckoutOrder(payload) {
        calls.createCheckoutOrder.push(payload);

        return {
          order: {
            id: 77,
            status: "Paid",
            totalToken: 120,
            createdAt: new Date("2026-07-08T10:00:00.000Z"),
          },
          payment: {
            id: 1,
            status: "Succeeded",
          },
        };
      },
    },
    [notificationRepositoryPath]: {
      async createNotification(payload) {
        calls.createNotification.push(payload);
        return {
          id: 1,
          ...payload,
        };
      },
    },
    [mailServicePath]: {
      async sendArtistSaleEmail(payload) {
        calls.sendArtistSaleEmail.push(payload);
      },
    },
  });

  return {
    service,
    calls,
    restore,
  };
}

test("createCheckout notifies artists in-app and by email after a sale", async (t) => {
  const { service, calls, restore } = loadCheckoutService();

  t.after(() => {
    restore();
  });

  const result = await service.createCheckout({
    userId: buyer.id,
    items: [{ artworkId: artwork.id, quantity: 1 }],
    paymentMethod: "card",
    billingEmail: buyer.email,
  });

  assert.equal(result.order.id, 77);
  assert.equal(calls.createNotification.length, 1);
  assert.equal(calls.createNotification[0].type, "sale");
  assert.equal(calls.createNotification[0].userId, artistUser.id);
  assert.equal(calls.sendArtistSaleEmail.length, 1);
  assert.equal(calls.sendArtistSaleEmail[0].to, artistUser.email);
  assert.equal(calls.sendArtistSaleEmail[0].artistName, "Ada Art");
  assert.equal(calls.sendArtistSaleEmail[0].orderReference, "#ORD-0077");
  assert.deepEqual(calls.sendArtistSaleEmail[0].artworkTitles, ["Neon Garden"]);
  assert.equal(calls.sendArtistSaleEmail[0].grossAmount, 120);
  assert.ok(
    Math.abs(calls.sendArtistSaleEmail[0].netAmount - 111.6) < 0.001,
  );
  assert.equal(calls.sendArtistSaleEmail[0].buyerLabel, buyer.username);
  assert.equal(
    calls.sendArtistSaleEmail[0].salesUrl,
    "http://localhost:3000/artist/sales",
  );
});

test("createCheckout still succeeds when artist sale email fails", async (t) => {
  const { moduleExports: service, restore } = loadModuleWithMocks(servicePath, {
    [envPath]: {
      appBaseUrl: "http://localhost:3000",
    },
    [prismaPath]: {
      artwork: {
        async findMany() {
          return [artwork];
        },
      },
      user: {
        async findUnique() {
          return buyer;
        },
      },
    },
    [orderRepositoryPath]: {
      async createCheckoutOrder() {
        return {
          order: {
            id: 78,
            status: "Paid",
          },
          payment: {
            id: 2,
            status: "Succeeded",
          },
        };
      },
    },
    [notificationRepositoryPath]: {
      async createNotification(payload) {
        return {
          id: 2,
          ...payload,
        };
      },
    },
    [mailServicePath]: {
      async sendArtistSaleEmail() {
        throw new Error("SMTP unavailable");
      },
    },
  });

  t.after(() => {
    restore();
  });

  const result = await service.createCheckout({
    userId: buyer.id,
    items: [{ artworkId: artwork.id, quantity: 1 }],
  });

  assert.equal(result.order.id, 78);
});
