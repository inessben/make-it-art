const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateCommissionAmount, buildCartSummary } = require("../../src/domain/cart-pricing");

function createCart(overrides = {}) {
  return {
    version: 3,
    updatedAt: new Date("2026-07-18T10:00:00.000Z"),
    items: [
      {
        artworkId: 10,
        quantity: 2,
        artwork: {
          id: 10,
          title: "Server-priced artwork",
          priceAmount: 1250,
          currency: "EUR",
          saleStatus: "AVAILABLE",
          stockQuantity: 3,
          reservedQuantity: 0,
          artist: {
            displayName: "Artist",
            verified: false,
            user: { username: "artist" }
          }
        }
      }
    ],
    ...overrides
  };
}

test("the cart total and commission are calculated from server artwork data", () => {
  const cart = buildCartSummary(createCart());

  assert.equal(cart.subtotalAmount, 2500);
  assert.equal(cart.totalAmount, 2500);
  assert.equal(cart.commissionAmount, 375);
  assert.equal(cart.currency, "EUR");
  assert.equal(cart.payable, true);
  assert.match(cart.pricingFingerprint, /^[a-f0-9]{64}$/);
});

test("verified artists use the reduced commission", () => {
  assert.equal(calculateCommissionAmount(10000, true), 1000);
  assert.equal(calculateCommissionAmount(10000, false), 1500);
});

test("an unavailable artwork makes the cart non-payable", () => {
  const cartData = createCart();
  cartData.items[0].artwork.saleStatus = "UNLISTED";
  const cart = buildCartSummary(cartData);

  assert.equal(cart.payable, false);
  assert.deepEqual(cart.issues, [{ artworkId: 10, code: "ARTWORK_NOT_AVAILABLE" }]);
});

test("reserved stock is excluded from the available quantity", () => {
  const cartData = createCart();
  cartData.items[0].artwork.stockQuantity = 2;
  cartData.items[0].artwork.reservedQuantity = 1;
  const cart = buildCartSummary(cartData);

  assert.equal(cart.items[0].availableQuantity, 1);
  assert.equal(cart.payable, false);
  assert.equal(cart.items[0].issue, "INSUFFICIENT_STOCK");
});
