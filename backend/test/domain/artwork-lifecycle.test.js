const assert = require("node:assert/strict");
const { test } = require("node:test");

const { buildArtworkManagement } = require("../../src/services/artwork-lifecycle.service");

function artwork(overrides = {}) {
  return {
    visibility: "PUBLISHED",
    moderationStatus: "approved",
    reservedQuantity: 0,
    orderItems: [],
    reservations: [],
    ...overrides
  };
}

test("an unpurchased artwork without an open transaction exposes owner mutations", () => {
  const management = buildArtworkManagement(artwork());

  assert.equal(management.lifecycle.hasConfirmedPurchase, false);
  assert.equal(management.lifecycle.hasTransactionInProgress, false);
  assert.equal(management.capabilities.canEdit, true);
  assert.equal(management.capabilities.canDelete, true);
  assert.equal(management.capabilities.canHide, true);
  assert.equal(management.capabilities.canArchive, true);
});

test("paid and refunded orders permanently block edit and delete", () => {
  for (const status of ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]) {
    const management = buildArtworkManagement(artwork({ orderItems: [{ order: { status } }] }));

    assert.equal(management.lifecycle.hasConfirmedPurchase, true);
    assert.equal(management.capabilities.canEdit, false);
    assert.equal(management.capabilities.canDelete, false);
    assert.equal(management.capabilities.reasons.edit, "ARTWORK_HAS_PURCHASES");
  }
});

test("an open payment or reservation temporarily blocks destructive mutations", () => {
  const paymentManagement = buildArtworkManagement(
    artwork({ orderItems: [{ order: { status: "PAYMENT_PROCESSING" } }] })
  );
  const reservationManagement = buildArtworkManagement(
    artwork({ reservations: [{ status: "ACTIVE" }] })
  );

  for (const management of [paymentManagement, reservationManagement]) {
    assert.equal(management.lifecycle.hasTransactionInProgress, true);
    assert.equal(management.capabilities.canEdit, false);
    assert.equal(management.capabilities.canDelete, false);
    assert.equal(management.capabilities.canArchive, false);
    assert.equal(management.capabilities.canHide, true);
  }
});

test("an archived artwork can only be restored from its current lifecycle state", () => {
  const management = buildArtworkManagement(artwork({ visibility: "ARCHIVED" }));

  assert.equal(management.capabilities.canEdit, false);
  assert.equal(management.capabilities.canDelete, false);
  assert.equal(management.capabilities.canHide, false);
  assert.equal(management.capabilities.canArchive, false);
  assert.equal(management.capabilities.canRestore, true);
});
