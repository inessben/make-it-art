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

function loadRepository({ existing = existingArtwork(), updateCount = 1 } = {}) {
  const calls = { updateMany: [], transactionOptions: null };
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
