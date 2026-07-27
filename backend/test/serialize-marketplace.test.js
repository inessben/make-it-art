const test = require("node:test");
const assert = require("node:assert/strict");

const { serializeArtwork } = require("../src/utils/serialize-marketplace");

function artwork(overrides = {}) {
  return {
    id: 12,
    title: "Reusable artwork",
    priceAmount: 2500,
    currency: "EUR",
    saleStatus: "AVAILABLE",
    stockQuantity: 0,
    reservedQuantity: 0,
    licenseType: "PERSONAL",
    ...overrides
  };
}

test("personal and commercial artworks remain available without stock", () => {
  for (const licenseType of ["PERSONAL", "COMMERCIAL"]) {
    const serialized = serializeArtwork(
      artwork({ licenseType, isSold: true, stockQuantity: 0, reservedQuantity: 0 })
    );

    assert.equal(serialized.isUnlimited, true);
    assert.equal(serialized.availableQuantity, null);
    assert.equal(serialized.isSold, false);
    assert.equal(serialized.isAvailableForPurchase, true);
  }
});

test("exclusive artworks still require one available inventory unit", () => {
  const serialized = serializeArtwork(
    artwork({ licenseType: "EXCLUSIVE", stockQuantity: 1, reservedQuantity: 1 })
  );

  assert.equal(serialized.isUnlimited, false);
  assert.equal(serialized.availableQuantity, 0);
  assert.equal(serialized.isAvailableForPurchase, false);
});
