const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const repositoryPath = require.resolve("../src/repositories/artwork.repository");
const prismaPath = require.resolve("../src/lib/prisma");

function existingArtwork(overrides = {}) {
  return {
    id: 42,
    artistId: 3,
    title: "Before",
    version: 2,
    visibility: "PUBLISHED",
    moderationStatus: "approved",
    licenseType: "PERSONAL",
    saleStatus: "AVAILABLE",
    stockQuantity: 0,
    reservedQuantity: 0,
    orderItems: [],
    reservations: [],
    ...overrides
  };
}

function loadRepository({ existing = existingArtwork(), updateCount = 1, deleteCount = 1 } = {}) {
  const calls = {
    updateMany: [],
    deleteArtwork: [],
    cartItems: [],
    favorites: [],
    collectionItems: [],
    reservations: [],
    transactionOptions: null
  };
  let findCount = 0;
  const transaction = {
    artwork: {
      async findFirst() {
        findCount += 1;
        return findCount === 1 ? existing : { ...existing, version: existing.version + 1 };
      },
      async updateMany(input) {
        calls.updateMany.push(input);
        return { count: updateCount };
      },
      async deleteMany(input) {
        calls.deleteArtwork.push(input);
        return { count: deleteCount };
      }
    },
    cartItem: {
      async deleteMany(input) {
        calls.cartItems.push(input);
      }
    },
    favorite: {
      async deleteMany(input) {
        calls.favorites.push(input);
      }
    },
    collectionItem: {
      async deleteMany(input) {
        calls.collectionItems.push(input);
      }
    },
    inventoryReservation: {
      async deleteMany(input) {
        calls.reservations.push(input);
      }
    }
  };
  const prisma = {
    async $transaction(callback, options) {
      calls.transactionOptions = options;
      return callback(transaction);
    }
  };
  const loaded = loadModuleWithMocks(repositoryPath, { [prismaPath]: prisma });

  return { repository: loaded.moduleExports, restore: loaded.restore, calls };
}

function updateInput(overrides = {}) {
  return {
    artworkId: 42,
    artistId: 3,
    title: "After",
    description: "Updated description",
    categoryId: 9,
    price: "145.00",
    licenseType: "PERSONAL",
    protection: true,
    expectedVersion: 2,
    ...overrides
  };
}

test("artwork update rejects every confirmed purchase status", async () => {
  for (const status of ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]) {
    const loaded = loadRepository({
      existing: existingArtwork({ orderItems: [{ order: { status } }] })
    });

    await assert.rejects(
      () => loaded.repository.updateArtwork(updateInput()),
      /ARTWORK_HAS_PURCHASES/
    );
    assert.equal(loaded.calls.updateMany.length, 0);
    loaded.restore();
  }
});

test("artwork update rejects an active payment or reservation", async () => {
  for (const source of [
    { orderItems: [{ order: { status: "PAYMENT_PROCESSING" } }] },
    { reservations: [{ status: "ACTIVE" }] }
  ]) {
    const loaded = loadRepository({ existing: existingArtwork(source) });

    await assert.rejects(
      () => loaded.repository.updateArtwork(updateInput()),
      /ARTWORK_TRANSACTION_IN_PROGRESS/
    );
    assert.equal(loaded.calls.updateMany.length, 0);
    loaded.restore();
  }
});

test("artwork update rejects a stale optimistic version", async () => {
  const loaded = loadRepository();

  await assert.rejects(
    () => loaded.repository.updateArtwork(updateInput({ expectedVersion: 1 })),
    /ARTWORK_VERSION_CONFLICT/
  );
  assert.equal(loaded.calls.updateMany.length, 0);
  loaded.restore();
});

test("artwork update is serializable and atomically increments its version", async () => {
  const loaded = loadRepository();
  const updated = await loaded.repository.updateArtwork(
    updateInput({
      media: {
        imagePath: "preview-new.jpg",
        previewPath: "preview-new.jpg",
        hdPath: "hd-new.png",
        storageProvider: "local",
        mediaStatus: "ready",
        watermarkApplied: true
      }
    })
  );

  assert.equal(updated.version, 3);
  assert.deepEqual(loaded.calls.transactionOptions, { isolationLevel: "Serializable" });
  assert.equal(loaded.calls.updateMany.length, 1);
  assert.deepEqual(loaded.calls.updateMany[0].where, {
    id: 42,
    artistId: 3,
    version: 2
  });
  assert.deepEqual(loaded.calls.updateMany[0].data.version, { increment: 1 });
  assert.equal(loaded.calls.updateMany[0].data.hdPath, "hd-new.png");
  loaded.restore();
});

test("artwork deletion rejects every confirmed purchase status without cleanup", async () => {
  for (const status of ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]) {
    const loaded = loadRepository({
      existing: existingArtwork({ orderItems: [{ order: { status } }] })
    });

    await assert.rejects(
      () => loaded.repository.deleteArtwork({ artworkId: 42, artistId: 3, expectedVersion: 2 }),
      /ARTWORK_HAS_PURCHASES/
    );
    assert.equal(loaded.calls.deleteArtwork.length, 0);
    assert.equal(loaded.calls.cartItems.length, 0);
    loaded.restore();
  }
});

test("artwork deletion reports purchase history before archived state", async () => {
  const loaded = loadRepository({
    existing: existingArtwork({
      visibility: "ARCHIVED",
      orderItems: [{ order: { status: "REFUNDED" } }]
    })
  });

  await assert.rejects(
    () => loaded.repository.deleteArtwork({ artworkId: 42, artistId: 3, expectedVersion: 2 }),
    /ARTWORK_HAS_PURCHASES/
  );
  loaded.restore();
});

test("artwork deletion rejects an active payment or reservation", async () => {
  for (const source of [
    { orderItems: [{ order: { status: "PAYMENT_REVIEW" } }] },
    { reservations: [{ status: "ACTIVE" }] }
  ]) {
    const loaded = loadRepository({ existing: existingArtwork(source) });

    await assert.rejects(
      () => loaded.repository.deleteArtwork({ artworkId: 42, artistId: 3, expectedVersion: 2 }),
      /ARTWORK_TRANSACTION_IN_PROGRESS/
    );
    assert.equal(loaded.calls.deleteArtwork.length, 0);
    loaded.restore();
  }
});

test("artwork deletion cleans non-commercial references in a serializable transaction", async () => {
  const loaded = loadRepository();
  const deleted = await loaded.repository.deleteArtwork({
    artworkId: 42,
    artistId: 3,
    expectedVersion: 2
  });

  assert.equal(deleted.id, 42);
  assert.deepEqual(loaded.calls.transactionOptions, { isolationLevel: "Serializable" });
  assert.deepEqual(loaded.calls.cartItems, [{ where: { artworkId: 42 } }]);
  assert.deepEqual(loaded.calls.favorites, [{ where: { artworkId: 42 } }]);
  assert.deepEqual(loaded.calls.collectionItems, [{ where: { artworkId: 42 } }]);
  assert.deepEqual(loaded.calls.reservations, [
    { where: { artworkId: 42, status: { not: "ACTIVE" } } }
  ]);
  assert.deepEqual(loaded.calls.deleteArtwork, [{ where: { id: 42, artistId: 3, version: 2 } }]);
  loaded.restore();
});

test("artwork deletion rejects a stale version before cleaning references", async () => {
  const loaded = loadRepository();

  await assert.rejects(
    () => loaded.repository.deleteArtwork({ artworkId: 42, artistId: 3, expectedVersion: 1 }),
    /ARTWORK_VERSION_CONFLICT/
  );
  assert.equal(loaded.calls.deleteArtwork.length, 0);
  assert.equal(loaded.calls.cartItems.length, 0);
  loaded.restore();
});

test("artwork hiding is allowed with purchase history and updates visibility atomically", async () => {
  const loaded = loadRepository({
    existing: existingArtwork({ orderItems: [{ order: { status: "PAID" } }] })
  });

  await loaded.repository.hideArtwork({ artworkId: 42, artistId: 3, expectedVersion: 2 });

  assert.deepEqual(loaded.calls.transactionOptions, { isolationLevel: "Serializable" });
  assert.deepEqual(loaded.calls.updateMany, [
    {
      where: {
        id: 42,
        artistId: 3,
        visibility: "PUBLISHED",
        version: 2
      },
      data: {
        visibility: "HIDDEN",
        version: { increment: 1 }
      }
    }
  ]);
  loaded.restore();
});

test("artwork hiding is idempotent even when the repeated request has an old version", async () => {
  const loaded = loadRepository({
    existing: existingArtwork({ visibility: "HIDDEN", version: 3 })
  });

  const artwork = await loaded.repository.hideArtwork({
    artworkId: 42,
    artistId: 3,
    expectedVersion: 2
  });

  assert.equal(artwork.visibility, "HIDDEN");
  assert.equal(loaded.calls.updateMany.length, 0);
  loaded.restore();
});
