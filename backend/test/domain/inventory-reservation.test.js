const test = require("node:test");
const assert = require("node:assert/strict");

const { releaseReservedArtwork } = require("../../src/services/inventory-reservation.service");

test("an exclusive reservation is released only while the artwork is still available", async () => {
  const updates = [];
  const transaction = {
    artwork: {
      async updateMany(input) {
        updates.push(input);
        return { count: 1 };
      }
    }
  };

  const released = await releaseReservedArtwork(transaction, {
    artworkId: 42,
    quantity: 1
  });

  assert.equal(released, true);
  assert.deepEqual(updates, [
    {
      where: {
        id: 42,
        licenseType: "EXCLUSIVE",
        saleStatus: "AVAILABLE",
        isSold: false,
        stockQuantity: 1,
        reservedQuantity: 1
      },
      data: {
        reservedQuantity: 0,
        saleStatus: "AVAILABLE",
        isSold: false
      }
    }
  ]);
});

test("a sold exclusive artwork cannot be reopened by a late release", async () => {
  const updates = [];
  const transaction = {
    artwork: {
      async updateMany(input) {
        updates.push(input);
        return { count: 0 };
      }
    }
  };

  const released = await releaseReservedArtwork(transaction, {
    artworkId: 42,
    quantity: 1
  });

  assert.equal(released, false);
  assert.equal(updates.length, 2);
  assert.deepEqual(updates[1].where, {
    id: 42,
    licenseType: { not: "EXCLUSIVE" },
    reservedQuantity: { gte: 1 }
  });
});
