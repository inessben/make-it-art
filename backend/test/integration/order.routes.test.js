const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { franceB2COrderFields, franceB2COrderItemFields } = require("../helpers/commerce-fixture");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

databaseTest("order status is private, owner-scoped, minimal and never cached", async () => {
  const jwt = require("jsonwebtoken");
  const app = require("../../src/app");
  const env = require("../../src/config/env");
  const prisma = require("../../src/lib/prisma");
  const fixture = await createFixture(prisma);
  let server;

  try {
    server = await startServer(app);
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const ownerHeaders = { cookie: sessionCookie(jwt, env, fixture.owner) };
    const strangerHeaders = { cookie: sessionCookie(jwt, env, fixture.stranger) };

    const ownerResponse = await fetch(`${baseUrl}/api/v1/orders/${fixture.order.publicId}`, {
      headers: ownerHeaders
    });
    assert.equal(ownerResponse.status, 200);
    assert.equal(ownerResponse.headers.get("cache-control"), "private, no-store");
    assert.equal(ownerResponse.headers.get("x-content-type-options"), "nosniff");
    assert.equal(ownerResponse.headers.get("x-frame-options"), "DENY");
    assert.equal(ownerResponse.headers.get("referrer-policy"), "no-referrer");
    const ownerBody = await ownerResponse.json();
    assert.equal(ownerBody.order.id, fixture.order.publicId);
    assert.equal(ownerBody.order.payment.status, "PROCESSING");
    assert.doesNotMatch(JSON.stringify(ownerBody), /pi_private|client_secret|webhook|idempotency/i);

    const strangerResponse = await fetch(`${baseUrl}/api/v1/orders/${fixture.order.publicId}`, {
      headers: strangerHeaders
    });
    assert.equal(strangerResponse.status, 404);
    assert.deepEqual(await strangerResponse.json(), { message: "Order not found" });

    const historyResponse = await fetch(`${baseUrl}/api/v1/orders`, { headers: ownerHeaders });
    assert.equal(historyResponse.status, 200);
    assert.equal(historyResponse.headers.get("cache-control"), "private, no-store");
    assert.equal((await historyResponse.json()).orders[0].id, fixture.order.publicId);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

function sessionCookie(jwt, env, user) {
  const token = jwt.sign({ sub: String(user.id), email: user.email }, env.jwtSecret, {
    expiresIn: "5m"
  });
  return `${env.sessionCookieName}=${token}`;
}

function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

async function createFixture(prisma) {
  const marker = randomUUID();
  const [artistUser, owner, stranger] = await Promise.all([
    prisma.user.create({
      data: { email: `orders-artist-${marker}@test.local`, isActive: true, verified: true }
    }),
    prisma.user.create({
      data: { email: `orders-owner-${marker}@test.local`, isActive: true, verified: true }
    }),
    prisma.user.create({
      data: { email: `orders-stranger-${marker}@test.local`, isActive: true, verified: true }
    })
  ]);
  const artist = await prisma.artist.create({
    data: { userId: artistUser.id, displayName: "Private Orders Artist" }
  });
  const artwork = await prisma.artwork.create({
    data: {
      artistId: artist.id,
      title: `Private order ${marker}`,
      priceAmount: 1700,
      currency: "EUR",
      saleStatus: "AVAILABLE",
      stockQuantity: 1
    }
  });
  const cart = await prisma.cart.create({ data: { userId: owner.id } });
  const order = await prisma.order.create({
    data: {
      userId: owner.id,
      cartId: cart.id,
      cartVersion: 1,
      pricingFingerprint: "a".repeat(64),
      status: "PAYMENT_PROCESSING",
      subtotalAmount: 1700,
      totalAmount: 1700,
      ...franceB2COrderFields({ buyer: owner, grossAmount: 1700 }),
      currency: "EUR",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      items: {
        create: {
          artworkId: artwork.id,
          artworkTitle: artwork.title,
          artistName: artist.displayName,
          unitAmount: 1700,
          subtotalAmount: 1700,
          ...franceB2COrderItemFields({ grossAmount: 1700 }),
          currency: "EUR"
        }
      },
      payments: {
        create: {
          providerPaymentId: `pi_private_${marker}`,
          providerStatus: "processing",
          status: "PROCESSING",
          amount: 1700,
          currency: "EUR"
        }
      }
    }
  });
  return {
    marker,
    userIds: [artistUser.id, owner.id, stranger.id],
    artist,
    artwork,
    cart,
    order,
    owner,
    stranger
  };
}

async function cleanup(prisma, fixture) {
  await prisma.payment.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.order.delete({ where: { id: fixture.order.id } });
  await prisma.cart.delete({ where: { id: fixture.cart.id } });
  await prisma.artwork.delete({ where: { id: fixture.artwork.id } });
  await prisma.artist.delete({ where: { id: fixture.artist.id } });
  await prisma.user.deleteMany({ where: { id: { in: fixture.userIds } } });
}
