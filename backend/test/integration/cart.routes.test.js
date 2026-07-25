const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

databaseTest("cart routes require ownership and reject client-managed prices", async () => {
  const jwt = require("jsonwebtoken");
  const app = require("../../src/app");
  const env = require("../../src/config/env");
  const prisma = require("../../src/lib/prisma");
  const marker = randomUUID();
  const email = `cart-route-${marker}@make-it-art.test`;
  let server;
  let userId;

  try {
    const user = await prisma.user.create({
      data: {
        email,
        username: `cart-route-${marker}`,
        isActive: true,
        verified: true
      }
    });
    userId = user.id;

    const artist = await prisma.artist.create({
      data: {
        userId,
        displayName: "Cart Route Artist"
      }
    });
    const artwork = await prisma.artwork.create({
      data: {
        artistId: artist.id,
        title: `Cart route artwork ${marker}`,
        priceAmount: 4200,
        currency: "EUR",
        saleStatus: "AVAILABLE",
        stockQuantity: 1
      }
    });

    server = await startServer(app);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const token = jwt.sign({ sub: String(user.id), email: user.email }, env.jwtSecret, {
      expiresIn: "5m"
    });
    const headers = {
      "content-type": "application/json",
      cookie: `${env.sessionCookieName}=${token}`
    };

    const unauthenticatedResponse = await fetch(`${baseUrl}/api/v1/cart`);
    assert.equal(unauthenticatedResponse.status, 401);

    const mutationWithoutCsrf = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers,
      body: JSON.stringify({ artworkId: artwork.id, quantity: 1 })
    });
    assert.equal(mutationWithoutCsrf.status, 403);
    assert.equal((await mutationWithoutCsrf.json()).code, "CSRF_VALIDATION_FAILED");

    const csrfResponse = await fetch(`${baseUrl}/api/v1/security/csrf-token`, { headers });
    assert.equal(csrfResponse.status, 200);
    assert.equal(csrfResponse.headers.get("cache-control"), "no-store");
    const csrfCookie = csrfResponse.headers.get("set-cookie").split(";")[0];
    const { csrfToken } = await csrfResponse.json();
    const mutationHeaders = {
      ...headers,
      cookie: `${headers.cookie}; ${csrfCookie}`,
      origin: env.appBaseUrl,
      "x-csrf-token": csrfToken
    };

    const manipulatedResponse = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: mutationHeaders,
      body: JSON.stringify({
        artworkId: artwork.id,
        quantity: 1,
        priceAmount: 1
      })
    });
    assert.equal(manipulatedResponse.status, 400);
    assert.equal((await manipulatedResponse.json()).code, "INVALID_CART_INPUT");

    const addResponse = await fetch(`${baseUrl}/api/v1/cart/items`, {
      method: "POST",
      headers: mutationHeaders,
      body: JSON.stringify({ artworkId: artwork.id, quantity: 1 })
    });
    assert.equal(addResponse.status, 200);
    const addedCart = (await addResponse.json()).cart;
    assert.equal(addedCart.totalAmount, 4200);
    assert.equal(addedCart.currency, "EUR");

    const checkoutBody = {
      cartVersion: addedCart.version,
      pricingFingerprint: addedCart.pricingFingerprint
    };
    const checkoutWithoutCsrf = await fetch(`${baseUrl}/api/v1/orders/checkout`, {
      method: "POST",
      headers: {
        ...headers,
        "idempotency-key": randomUUID()
      },
      body: JSON.stringify(checkoutBody)
    });
    assert.equal(checkoutWithoutCsrf.status, 403);
    assert.equal((await checkoutWithoutCsrf.json()).code, "CSRF_VALIDATION_FAILED");

    const checkoutHeaders = {
      ...mutationHeaders,
      "idempotency-key": randomUUID()
    };

    const manipulatedCheckoutResponse = await fetch(`${baseUrl}/api/v1/orders/checkout`, {
      method: "POST",
      headers: checkoutHeaders,
      body: JSON.stringify({
        ...checkoutBody,
        amount: 1
      })
    });
    assert.equal(manipulatedCheckoutResponse.status, 400);
    assert.equal((await manipulatedCheckoutResponse.json()).code, "INVALID_CHECKOUT_INPUT");

    const readResponse = await fetch(`${baseUrl}/api/v1/cart`, { headers });
    assert.equal(readResponse.status, 200);
    assert.equal((await readResponse.json()).cart.items[0].artworkId, artwork.id);

    const removeResponse = await fetch(`${baseUrl}/api/v1/cart/items/${artwork.id}`, {
      method: "DELETE",
      headers: mutationHeaders
    });
    assert.equal(removeResponse.status, 200);
    assert.equal((await removeResponse.json()).cart.itemCount, 0);
  } finally {
    if (server) {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }

    if (userId) {
      await prisma.cartItem.deleteMany({
        where: { cart: { userId } }
      });
      await prisma.cart.deleteMany({ where: { userId } });
      await prisma.artwork.deleteMany({
        where: { title: { contains: marker } }
      });
      await prisma.artist.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }

    await prisma.$disconnect();
  }
});

function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}
