const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

databaseTest("the payment schema enforces monetary integrity and uniqueness", async () => {
  const prisma = require("../../src/lib/prisma");
  const marker = randomUUID();
  const email = `payment-schema-${marker}@make-it-art.test`;
  let userId;

  try {
    const user = await prisma.user.create({
      data: {
        email,
        username: `payment-schema-${marker}`,
        isActive: true,
        verified: true
      }
    });
    userId = user.id;

    const artist = await prisma.artist.create({
      data: {
        userId,
        displayName: "Payment Schema Test"
      }
    });

    const artwork = await prisma.artwork.create({
      data: {
        artistId: artist.id,
        title: `Artwork ${marker}`,
        priceAmount: 1000,
        currency: "EUR"
      }
    });

    const cart = await prisma.cart.create({
      data: { userId }
    });

    const order = await prisma.order.create({
      data: {
        userId,
        cartId: cart.id,
        cartVersion: 1,
        pricingFingerprint: "a".repeat(64),
        subtotalAmount: 1000,
        commissionAmount: 150,
        totalAmount: 1000,
        currency: "EUR",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        items: {
          create: {
            artworkId: artwork.id,
            artworkTitle: artwork.title,
            artistName: artist.displayName,
            quantity: 1,
            unitAmount: 1000,
            subtotalAmount: 1000,
            commissionAmount: 150,
            currency: "EUR"
          }
        }
      },
      include: { items: true }
    });

    assert.match(
      order.publicId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    assert.equal(order.status, "PENDING_PAYMENT");
    assert.equal(order.items[0].unitAmount, 1000);

    const providerPaymentId = `pi_test_${marker}`;
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        providerPaymentId,
        amount: 1000,
        currency: "EUR"
      }
    });

    assert.equal(payment.status, "PENDING");
    assert.equal(payment.refundedAmount, 0);

    const eventId = `evt_test_${marker}`;
    await prisma.stripeWebhookEvent.create({
      data: {
        eventId,
        eventType: "payment_intent.created",
        stripeObjectId: providerPaymentId,
        paymentId: payment.id
      }
    });

    await assert.rejects(
      prisma.stripeWebhookEvent.create({
        data: {
          eventId,
          eventType: "payment_intent.created",
          stripeObjectId: providerPaymentId
        }
      })
    );

    await assert.rejects(
      prisma.order.create({
        data: {
          userId,
          cartId: cart.id,
          cartVersion: 2,
          pricingFingerprint: "b".repeat(64),
          subtotalAmount: 1000,
          totalAmount: 999,
          currency: "EUR",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      })
    );
  } finally {
    if (userId) {
      await prisma.stripeWebhookEvent.deleteMany({
        where: { eventId: { contains: marker } }
      });
      await prisma.payment.deleteMany({
        where: { order: { userId } }
      });
      await prisma.inventoryReservation.deleteMany({
        where: { order: { userId } }
      });
      await prisma.orderItem.deleteMany({
        where: { order: { userId } }
      });
      await prisma.order.deleteMany({ where: { userId } });
      await prisma.cart.deleteMany({ where: { userId } });
      await prisma.artwork.deleteMany({
        where: { artist: { userId } }
      });
      await prisma.artist.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }

    await prisma.$disconnect();
  }
});
