const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("../helpers/mock-require");
const {
  createInMemoryCommerceDb,
  createSamplePublishedArtwork
} = require("../helpers/in-memory-commerce-db");

const cartRoutesPath = require.resolve("../../src/routes/cart.routes");
const authRequiredPath = require.resolve("../../src/middlewares/auth-required.middleware");
const csrfPath = require.resolve("../../src/middlewares/csrf.middleware");
const rateLimitPath = require.resolve("../../src/middlewares/rate-limit.middleware");
const cartServicePath = require.resolve("../../src/services/cart.service");

const collector = { id: 42, email: "collector@make-it-art.test", username: "Collector" };

class CartError extends Error {
  constructor(code, message, status = 400, cart = undefined) {
    super(message);
    this.name = "CartError";
    this.code = code;
    this.status = status;
    this.cart = cart;
  }
}

async function startCartE2E(t, { user = collector } = {}) {
  const db = createInMemoryCommerceDb();
  db.seedArtwork(createSamplePublishedArtwork());
  db.seedArtwork(
    createSamplePublishedArtwork({
      id: 202,
      title: "Sold-out piece",
      saleStatus: "SOLD_OUT",
      stockQuantity: 0
    })
  );

  const { moduleExports: cartRouter, restore } = loadModuleWithMocks(cartRoutesPath, {
    [authRequiredPath]: {
      authRequired(req, res, next) {
        if (!user) {
          return res.status(401).json({ message: "Authentication required", code: "UNAUTHORIZED" });
        }
        req.user = user;
        return next();
      }
    },
    [csrfPath]: {
      csrfProtection(_req, _res, next) {
        next();
      }
    },
    [rateLimitPath]: {
      cartRateLimit(_req, _res, next) {
        next();
      }
    },
    [cartServicePath]: {
      CartError,
      async getCartSummary(userId) {
        return db.summarizeCart(userId, { buyerUserId: userId });
      },
      async setCartItem(userId, { artworkId, quantity }) {
        try {
          return db.setCartItem(userId, artworkId, quantity);
        } catch (error) {
          throw new CartError(error.code, error.message, error.status);
        }
      },
      async removeCartItem(userId, artworkId) {
        try {
          return db.removeCartItem(userId, artworkId);
        } catch (error) {
          throw new CartError(error.code, error.message, error.status);
        }
      },
      async clearCart(userId) {
        return db.clearCart(userId);
      },
      async validateCartForCheckout({ userId, expectedVersion, expectedPricingFingerprint }) {
        try {
          return db.validateForCheckout(userId, {
            expectedVersion,
            expectedPricingFingerprint
          });
        } catch (error) {
          throw new CartError(error.code, error.message, error.status, error.cart);
        }
      }
    }
  });

  const app = express();
  app.use(express.json());
  app.use("/v1", cartRouter);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    restore();
    server.close();
  });

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}/v1`,
    db
  };
}

test("e2e collector journey: empty cart → add → validate → clear (in-memory db)", async (t) => {
  const { baseUrl, db } = await startCartE2E(t);

  const emptyResponse = await fetch(`${baseUrl}/cart`);
  const emptyBody = await emptyResponse.json();
  assert.equal(emptyResponse.status, 200);
  assert.equal(emptyBody.cart.itemCount, 0);
  assert.equal(emptyBody.cart.payable, false);

  const addResponse = await fetch(`${baseUrl}/cart/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ artworkId: 101, quantity: 2 })
  });
  const addBody = await addResponse.json();
  assert.equal(addResponse.status, 200);
  assert.equal(addBody.cart.itemCount, 2);
  assert.equal(addBody.cart.totalAmount, 8400);
  assert.equal(addBody.cart.payable, true);
  assert.match(addBody.cart.pricingFingerprint, /^[a-f0-9]{64}$/);

  const validateResponse = await fetch(`${baseUrl}/cart/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      cartVersion: addBody.cart.version,
      pricingFingerprint: addBody.cart.pricingFingerprint
    })
  });
  const validateBody = await validateResponse.json();
  assert.equal(validateResponse.status, 200);
  assert.equal(validateBody.valid, true);
  assert.equal(validateBody.cart.totalAmount, 8400);

  const staleValidate = await fetch(`${baseUrl}/cart/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      cartVersion: addBody.cart.version,
      pricingFingerprint: "0".repeat(64)
    })
  });
  assert.equal(staleValidate.status, 409);
  assert.equal((await staleValidate.json()).code, "PRICE_CHANGED");

  const clearResponse = await fetch(`${baseUrl}/cart`, { method: "DELETE" });
  const clearBody = await clearResponse.json();
  assert.equal(clearResponse.status, 200);
  assert.equal(clearBody.cart.itemCount, 0);
  assert.equal(db.snapshot().carts[0].itemCount, 0);
});

test("e2e collector journey rejects unavailable artworks from the in-memory catalog", async (t) => {
  const { baseUrl } = await startCartE2E(t);

  const response = await fetch(`${baseUrl}/cart/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ artworkId: 202, quantity: 1 })
  });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.code, "ARTWORK_NOT_AVAILABLE");
});
