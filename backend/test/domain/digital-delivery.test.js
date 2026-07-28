const test = require("node:test");
const assert = require("node:assert/strict");

const {
  certificateNumber,
  certificateSnapshot,
  deliveryState
} = require("../../src/services/digital-delivery.service");

test("certificate identifiers and snapshots are deterministic server artifacts", () => {
  const order = {
    publicId: "75ad34cf-5ee4-4838-b36f-fac65a40f1e9",
    user: { username: "Buyer" },
    paidAt: new Date("2026-07-19T12:00:00Z")
  };
  const item = {
    id: 42,
    artworkId: 7,
    artworkTitle: "Artwork",
    artistName: "Artist",
    licenseType: "EXCLUSIVE",
    quantity: 1,
    unitAmount: 2500,
    currency: "EUR"
  };

  assert.equal(
    certificateNumber(order.publicId, item.id),
    certificateNumber(order.publicId, item.id)
  );
  assert.deepEqual(certificateSnapshot(order, item), {
    version: 1,
    orderId: order.publicId,
    orderItemId: 42,
    artworkId: 7,
    artworkTitle: "Artwork",
    artistName: "Artist",
    licenseType: "EXCLUSIVE",
    owner: "Buyer",
    quantity: 1,
    unitAmount: 2500,
    currency: "EUR",
    paidAt: "2026-07-19T12:00:00.000Z"
  });
});

test("a lost dispute changes delivery only under the explicitly selected policy", () => {
  const order = { status: "PAID", disputes: [{ status: "LOST" }] };

  assert.equal(deliveryState(order, "KEEP_ACTIVE"), "ACTIVE");
  assert.equal(deliveryState(order, "SUSPEND_ON_OPEN"), "REVOKED");
});
