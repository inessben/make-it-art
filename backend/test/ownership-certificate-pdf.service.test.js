const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildOwnershipCertificatePdfPayload,
  getOwnedOwnershipCertificatePdf
} = require("../src/services/ownership-certificate-pdf.service");

test("purchase certificate PDF payload uses the immutable delivery snapshot", () => {
  const payload = buildOwnershipCertificatePdfPayload({
    certificateNumber: "MIA-0123456789ABCDEF0123",
    status: "ACTIVE",
    issuedAt: new Date("2026-07-18T10:03:00.000Z"),
    fingerprint: "a".repeat(64),
    snapshot: {
      version: 1,
      orderId: "75ad34cf-5ee4-4838-b36f-fac65a40f1e9",
      orderItemId: 12,
      artworkId: 42,
      artworkTitle: "Aube numerique",
      artistName: "Ada Art",
      licenseType: "PERSONAL",
      owner: "Collectionneur test",
      quantity: 1,
      unitAmount: 2500,
      currency: "EUR",
      paidAt: "2026-07-18T10:01:00.000Z"
    }
  });

  assert.equal(payload.number, "MIA-0123456789ABCDEF0123");
  assert.equal(payload.purchase.orderId, "75ad34cf-5ee4-4838-b36f-fac65a40f1e9");
  assert.equal(payload.purchase.owner, "Collectionneur test");
  assert.equal(payload.purchase.unitAmount, 2500);
  assert.equal(payload.artwork.title, "Aube numerique");
  assert.equal(payload.artwork.artistName, "Ada Art");
  assert.equal(payload.artwork.licenseType, "PERSONAL");
});

test("certificate lookup is scoped to both the authenticated owner and owned order", async () => {
  const calls = [];
  const prismaClient = {
    ownershipCertificate: {
      async findFirst(query) {
        calls.push(query);
        return null;
      }
    }
  };

  const result = await getOwnedOwnershipCertificatePdf({
    userId: 7,
    orderPublicId: "75ad34cf-5ee4-4838-b36f-fac65a40f1e9",
    certificatePublicId: "1b5d0a0c-d743-4a0b-aed4-e6402058dd77",
    prismaClient
  });

  assert.equal(result, null);
  assert.deepEqual(calls[0].where, {
    publicId: "1b5d0a0c-d743-4a0b-aed4-e6402058dd77",
    userId: 7,
    order: {
      publicId: "75ad34cf-5ee4-4838-b36f-fac65a40f1e9",
      userId: 7
    }
  });
});

test("an invalid stored snapshot cannot be rendered as a purchase certificate", () => {
  assert.throws(
    () =>
      buildOwnershipCertificatePdfPayload({
        certificateNumber: "MIA-INVALID",
        status: "ACTIVE",
        issuedAt: new Date(),
        fingerprint: "a".repeat(64),
        snapshot: null
      }),
    { code: "OWNERSHIP_CERTIFICATE_SNAPSHOT_INVALID" }
  );
});
