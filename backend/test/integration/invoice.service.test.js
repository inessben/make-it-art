const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

databaseTest(
  "a paid France B2C order produces one immutable owner-scoped sale invoice PDF",
  async () => {
    const prisma = require("../../src/lib/prisma");
    const {
      getOwnedSaleInvoicePdf,
      issueSaleInvoice
    } = require("../../src/services/invoice.service");
    const fixture = await createFixture(prisma);
    const task = { orderId: fixture.order.id };
    const issuedAt = new Date("2026-07-24T18:00:00.000Z");

    try {
      const [first, concurrentRetry] = await Promise.all([
        issueSaleInvoice({ task, prismaClient: prisma, now: issuedAt }),
        issueSaleInvoice({ task, prismaClient: prisma, now: issuedAt })
      ]);

      assert.equal(first.effectReference, concurrentRetry.effectReference);
      const invoices = await prisma.invoice.findMany({
        where: { orderId: fixture.order.id }
      });
      assert.equal(invoices.length, 1);

      const invoice = invoices[0];
      assert.match(invoice.number, /^MIA-VTE-2026-\d{6}$/);
      assert.equal(invoice.type, "SALE");
      assert.equal(invoice.netAmount, 3500);
      assert.equal(invoice.taxAmount, 700);
      assert.equal(invoice.totalAmount, 4200);
      assert.equal(invoice.recipientSnapshot.customerType, "B2C");
      assert.equal(invoice.recipientSnapshot.address.country, "FR");
      assert.equal(invoice.issuerSnapshot.merchantOfRecord, true);
      assert.match(invoice.fingerprint, /^[a-f0-9]{64}$/);
      assert.equal(Buffer.from(invoice.pdf).subarray(0, 4).toString("ascii"), "%PDF");

      const owned = await getOwnedSaleInvoicePdf({
        userId: fixture.buyer.id,
        orderPublicId: fixture.order.publicId,
        invoicePublicId: invoice.publicId
      });
      const denied = await getOwnedSaleInvoicePdf({
        userId: fixture.artistUser.id,
        orderPublicId: fixture.order.publicId,
        invoicePublicId: invoice.publicId
      });
      assert.equal(owned.number, invoice.number);
      assert.equal(Buffer.from(owned.pdf).subarray(0, 4).toString("ascii"), "%PDF");
      assert.equal(denied, null);
    } finally {
      await cleanup(prisma, fixture);
      await prisma.$disconnect();
    }
  }
);

async function createFixture(prisma) {
  const marker = randomUUID();
  const artistUser = await prisma.user.create({
    data: {
      email: `invoice-artist-${marker}@test.local`,
      username: `invoice-artist-${marker}`,
      isActive: true,
      verified: true
    }
  });
  const buyer = await prisma.user.create({
    data: {
      email: `invoice-buyer-${marker}@test.local`,
      username: `invoice-buyer-${marker}`,
      isActive: true,
      verified: true
    }
  });
  const artist = await prisma.artist.create({
    data: { userId: artistUser.id, displayName: "Invoice Test Artist" }
  });
  const artwork = await prisma.artwork.create({
    data: {
      artistId: artist.id,
      title: `Invoice artwork ${marker}`,
      priceAmount: 4200,
      currency: "EUR",
      saleStatus: "AVAILABLE",
      stockQuantity: 0
    }
  });
  const cart = await prisma.cart.create({ data: { userId: buyer.id } });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      cartId: cart.id,
      cartVersion: 1,
      pricingFingerprint: "a".repeat(64),
      status: "PAID",
      customerType: "B2C",
      marketCountry: "FR",
      billingSnapshot: {
        customerType: "B2C",
        name: "Invoice Buyer",
        email: buyer.email,
        address: {
          line1: "1 rue de Paris",
          postalCode: "75001",
          city: "Paris",
          country: "FR"
        }
      },
      subtotalAmount: 4200,
      discountAmount: 0,
      subtotalExcludingTaxAmount: 3500,
      taxAmount: 700,
      taxRateBps: 2000,
      taxBehavior: "INCLUSIVE",
      commissionAmount: 245,
      commissionRateBps: 700,
      totalAmount: 4200,
      currency: "EUR",
      paidAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      items: {
        create: {
          artworkId: artwork.id,
          artworkTitle: artwork.title,
          artistName: artist.displayName,
          quantity: 1,
          unitAmount: 4200,
          subtotalAmount: 4200,
          discountAmount: 0,
          netAmount: 3500,
          taxAmount: 700,
          taxRateBps: 2000,
          commissionAmount: 245,
          commissionRateBps: 700,
          currency: "EUR"
        }
      }
    }
  });

  return { marker, artistUser, buyer, artist, artwork, cart, order };
}

async function cleanup(prisma, fixture) {
  await prisma.invoice.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.order.delete({ where: { id: fixture.order.id } });
  await prisma.cart.delete({ where: { id: fixture.cart.id } });
  await prisma.artwork.delete({ where: { id: fixture.artwork.id } });
  await prisma.artist.delete({ where: { id: fixture.artist.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [fixture.artistUser.id, fixture.buyer.id] } }
  });
}
