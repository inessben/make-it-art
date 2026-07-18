const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

databaseTest("cart pricing is isolated per owner and revalidated server-side", async () => {
  const prisma = require("../../src/lib/prisma");
  const {
    CartError,
    getCartSummary,
    setCartItem,
    validateCartForCheckout
  } = require("../../src/services/cart.service");
  const marker = randomUUID();
  const userIds = [];

  try {
    const artistUser = await prisma.user.create({
      data: {
        email: `cart-artist-${marker}@make-it-art.test`,
        username: `cart-artist-${marker}`,
        isActive: true,
        verified: true
      }
    });
    userIds.push(artistUser.id);

    const buyer = await prisma.user.create({
      data: {
        email: `cart-buyer-${marker}@make-it-art.test`,
        username: `cart-buyer-${marker}`,
        isActive: true,
        verified: true
      }
    });
    userIds.push(buyer.id);

    const otherBuyer = await prisma.user.create({
      data: {
        email: `cart-other-${marker}@make-it-art.test`,
        username: `cart-other-${marker}`,
        isActive: true,
        verified: true
      }
    });
    userIds.push(otherBuyer.id);

    const artist = await prisma.artist.create({
      data: {
        userId: artistUser.id,
        displayName: "Cart Test Artist",
        verified: false
      }
    });

    const artwork = await prisma.artwork.create({
      data: {
        artistId: artist.id,
        title: `Cart artwork ${marker}`,
        priceAmount: 2500,
        currency: "EUR",
        saleStatus: "AVAILABLE",
        stockQuantity: 2
      }
    });

    const buyerCart = await setCartItem(buyer.id, {
      artworkId: artwork.id,
      quantity: 1
    });
    await setCartItem(otherBuyer.id, {
      artworkId: artwork.id,
      quantity: 1
    });

    assert.equal(buyerCart.totalAmount, 2500);
    assert.equal(buyerCart.items[0].commissionAmount, 375);
    assert.equal((await getCartSummary(buyer.id)).itemCount, 1);
    assert.equal((await getCartSummary(otherBuyer.id)).itemCount, 1);
    assert.equal((await getCartSummary(artistUser.id)).itemCount, 0);

    await prisma.artwork.update({
      where: { id: artwork.id },
      data: { priceAmount: 3000 }
    });

    await assert.rejects(
      validateCartForCheckout({
        userId: buyer.id,
        expectedVersion: buyerCart.version,
        expectedPricingFingerprint: buyerCart.pricingFingerprint
      }),
      (error) =>
        error instanceof CartError &&
        error.code === "PRICE_CHANGED" &&
        error.cart.totalAmount === 3000
    );

    const refreshedCart = await getCartSummary(buyer.id);
    const validatedCart = await validateCartForCheckout({
      userId: buyer.id,
      expectedVersion: refreshedCart.version,
      expectedPricingFingerprint: refreshedCart.pricingFingerprint
    });

    assert.equal(validatedCart.totalAmount, 3000);
  } finally {
    await cleanup(prisma, marker, userIds);
    await prisma.$disconnect();
  }
});

databaseTest("locking allows only one cart to reserve the last copy", async () => {
  const prisma = require("../../src/lib/prisma");
  const {
    getCartSummary,
    setCartItem,
    withLockedPayableCart
  } = require("../../src/services/cart.service");
  const marker = randomUUID();
  const userIds = [];

  try {
    const artistUser = await prisma.user.create({
      data: {
        email: `stock-artist-${marker}@make-it-art.test`,
        username: `stock-artist-${marker}`,
        isActive: true,
        verified: true
      }
    });
    userIds.push(artistUser.id);

    const buyers = await Promise.all(
      ["first", "second"].map((name) =>
        prisma.user.create({
          data: {
            email: `stock-${name}-${marker}@make-it-art.test`,
            username: `stock-${name}-${marker}`,
            isActive: true,
            verified: true
          }
        })
      )
    );
    userIds.push(...buyers.map((buyer) => buyer.id));

    const artist = await prisma.artist.create({
      data: {
        userId: artistUser.id,
        displayName: "Stock Test Artist"
      }
    });
    const artwork = await prisma.artwork.create({
      data: {
        artistId: artist.id,
        title: `Last copy ${marker}`,
        priceAmount: 5000,
        currency: "EUR",
        saleStatus: "AVAILABLE",
        stockQuantity: 1
      }
    });

    await Promise.all(
      buyers.map((buyer) => setCartItem(buyer.id, { artworkId: artwork.id, quantity: 1 }))
    );
    const cartSummaries = await Promise.all(buyers.map((buyer) => getCartSummary(buyer.id)));

    const attempts = await Promise.allSettled(
      buyers.map((buyer, index) =>
        withLockedPayableCart(
          {
            userId: buyer.id,
            expectedVersion: cartSummaries[index].version,
            expectedPricingFingerprint: cartSummaries[index].pricingFingerprint
          },
          async (transaction, cart) => {
            await transaction.artwork.update({
              where: { id: artwork.id },
              data: {
                reservedQuantity: { increment: cart.items[0].quantity }
              }
            });
            return buyer.id;
          }
        )
      )
    );

    assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
    assert.equal(attempts.filter((attempt) => attempt.status === "rejected").length, 1);

    const updatedArtwork = await prisma.artwork.findUnique({
      where: { id: artwork.id }
    });
    assert.equal(updatedArtwork.reservedQuantity, 1);
  } finally {
    await cleanup(prisma, marker, userIds);
    await prisma.$disconnect();
  }
});

async function cleanup(prisma, marker, userIds) {
  if (userIds.length === 0) {
    return;
  }

  await prisma.cartItem.deleteMany({
    where: { cart: { userId: { in: userIds } } }
  });
  await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.artwork.deleteMany({
    where: { title: { contains: marker } }
  });
  await prisma.artist.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
