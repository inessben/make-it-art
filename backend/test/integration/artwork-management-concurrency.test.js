const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const test = require("node:test");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

databaseTest("checkout confirmation and artwork update have one coherent winner", async () => {
  const prisma = require("../../src/lib/prisma");
  const artworkRepository = require("../../src/repositories/artwork.repository");
  const {
    getCartSummary,
    setCartItem,
    withLockedPayableCart
  } = require("../../src/services/cart.service");
  const marker = randomUUID();
  const userIds = [];
  let artworkId = null;

  try {
    const artistUser = await prisma.user.create({
      data: {
        email: `artwork-race-artist-${marker}@make-it-art.test`,
        username: `artwork-race-artist-${marker}`,
        isActive: true,
        verified: true
      }
    });
    const buyer = await prisma.user.create({
      data: {
        email: `artwork-race-buyer-${marker}@make-it-art.test`,
        username: `artwork-race-buyer-${marker}`,
        isActive: true,
        verified: true
      }
    });
    userIds.push(artistUser.id, buyer.id);
    const artist = await prisma.artist.create({
      data: {
        userId: artistUser.id,
        displayName: `Race artist ${marker}`,
        verified: true
      }
    });
    const artwork = await prisma.artwork.create({
      data: {
        artistId: artist.id,
        title: `Race artwork ${marker}`,
        description: "Before concurrent checkout",
        price: "25.00",
        priceTokens: "25.00",
        priceAmount: 2500,
        currency: "EUR",
        licenseType: "PERSONAL",
        saleStatus: "AVAILABLE",
        visibility: "PUBLISHED",
        moderationStatus: "approved",
        stockQuantity: 0,
        reservedQuantity: 0,
        version: 1
      }
    });
    artworkId = artwork.id;

    await setCartItem(buyer.id, { artworkId: artwork.id, quantity: 1 });
    const cart = await getCartSummary(buyer.id);
    const purchase = withLockedPayableCart(
      {
        userId: buyer.id,
        expectedVersion: cart.version,
        expectedPricingFingerprint: cart.pricingFingerprint
      },
      async (transaction, summary, lockedCart) => {
        const now = new Date();
        return transaction.order.create({
          data: {
            userId: buyer.id,
            cartId: lockedCart.id,
            cartVersion: summary.version,
            pricingFingerprint: summary.pricingFingerprint,
            status: "PAID",
            subtotalAmount: summary.subtotalAmount,
            discountAmount: summary.discountAmount,
            subtotalExcludingTaxAmount: summary.netAmount,
            taxAmount: summary.taxAmount,
            taxRateBps: summary.taxRateBps,
            taxBehavior: summary.taxBehavior,
            commissionAmount: summary.commissionAmount,
            commissionRateBps: summary.commissionRateBps,
            totalAmount: summary.totalAmount,
            currency: summary.currency,
            expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
            paidAt: now,
            items: {
              create: summary.items.map((item) => ({
                artworkId: item.artworkId,
                artworkTitle: item.title,
                artistName: item.artistName,
                licenseType: item.licenseType,
                quantity: item.quantity,
                unitAmount: item.unitAmount,
                subtotalAmount: item.subtotalAmount,
                discountAmount: item.discountAmount,
                netAmount: item.netAmount,
                taxAmount: item.taxAmount,
                taxRateBps: item.taxRateBps,
                commissionAmount: item.commissionAmount,
                commissionRateBps: item.commissionRateBps,
                currency: item.currency
              }))
            }
          }
        });
      }
    );
    const mutation = artworkRepository.updateArtwork({
      artworkId: artwork.id,
      artistId: artist.id,
      title: "Changed during checkout",
      description: "After concurrent checkout",
      categoryId: null,
      price: "30.00",
      licenseType: "PERSONAL",
      protection: false,
      expectedVersion: 1,
      audit: {
        actorUserId: artistUser.id,
        correlationId: marker
      }
    });

    const [purchaseResult, mutationResult] = await Promise.allSettled([purchase, mutation]);
    assert.equal(
      [purchaseResult, mutationResult].filter(({ status }) => status === "fulfilled").length,
      1
    );

    const [paidOrderCount, finalArtwork] = await Promise.all([
      prisma.order.count({ where: { userId: buyer.id, status: "PAID" } }),
      prisma.artwork.findUnique({ where: { id: artwork.id } })
    ]);

    if (paidOrderCount === 1) {
      assert.equal(purchaseResult.status, "fulfilled");
      assert.equal(mutationResult.status, "rejected");
      assert.match(mutationResult.reason.message, /ARTWORK_HAS_PURCHASES/);
      assert.equal(finalArtwork.priceAmount, 2500);
      assert.equal(finalArtwork.version, 1);
    } else {
      assert.equal(purchaseResult.status, "rejected");
      assert.equal(mutationResult.status, "fulfilled");
      assert.equal(finalArtwork.priceAmount, 3000);
      assert.equal(finalArtwork.version, 2);
    }
  } finally {
    if (artworkId) {
      await prisma.auditLog.deleteMany({
        where: { entityType: "ARTWORK", entityId: String(artworkId) }
      });
    }
    await prisma.orderItem.deleteMany({ where: { order: { userId: { in: userIds } } } });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: userIds } } } });
    await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
    if (artworkId) await prisma.artwork.deleteMany({ where: { id: artworkId } });
    await prisma.artist.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }
});
