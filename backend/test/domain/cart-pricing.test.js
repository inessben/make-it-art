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
          licenseType: "EXCLUSIVE",
          saleStatus: "AVAILABLE",
          stockQuantity: 3,
          reservedQuantity: 0,
          artist: {
            displayName: "Artist",
            verified: false,
            user: { id: 25, username: "artist" }
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
  assert.equal(cart.netAmount, 2083);
  assert.equal(cart.taxAmount, 417);
  assert.equal(cart.taxRateBps, 2000);
  assert.equal(cart.totalAmount, 2500);
  assert.equal(cart.commissionAmount, 146);
  assert.equal(cart.commissionRateBps, 700);
  assert.equal(cart.currency, "EUR");
  assert.equal(cart.payable, true);
  assert.match(cart.pricingFingerprint, /^[a-f0-9]{64}$/);
});

test("the 7 percent commission is calculated from the amount excluding tax", () => {
  assert.equal(calculateCommissionAmount(10000, 700), 700);
});

test("an unavailable artwork makes the cart non-payable", () => {
  const cartData = createCart();
  cartData.items[0].artwork.saleStatus = "UNLISTED";
  const cart = buildCartSummary(cartData);

  assert.equal(cart.payable, false);
  assert.deepEqual(cart.issues, [{ artworkId: 10, code: "ARTWORK_NOT_AVAILABLE" }]);
});

test("an artist's own artwork makes their cart non-payable", () => {
  const cart = buildCartSummary(createCart(), { buyerUserId: 25 });

  assert.equal(cart.payable, false);
  assert.deepEqual(cart.issues, [{ artworkId: 10, code: "SELF_PURCHASE_NOT_ALLOWED" }]);
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

test("personal and commercial artworks stay payable without inventory", () => {
  for (const licenseType of ["PERSONAL", "COMMERCIAL"]) {
    const cartData = createCart();
    cartData.items[0].artwork.licenseType = licenseType;
    cartData.items[0].artwork.stockQuantity = 0;
    cartData.items[0].artwork.reservedQuantity = 0;
    const cart = buildCartSummary(cartData);

    assert.equal(cart.payable, true);
    assert.equal(cart.items[0].availableQuantity, null);
    assert.equal(cart.items[0].isUnlimited, true);
  }
});
