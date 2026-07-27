const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

function stripeEvent(fixture, type, overrides = {}) {
  const statuses = {
    "payment_intent.processing": "processing",
    "payment_intent.succeeded": "succeeded",
    "payment_intent.payment_failed": "requires_payment_method",
    "payment_intent.canceled": "canceled"
  };

  return {
    id: `evt_${type.replaceAll(".", "_")}_${randomUUID()}`,
    type,
    data: {
      object: {
        id: fixture.providerPaymentId,
        amount: fixture.amount,
        amount_received: type === "payment_intent.succeeded" ? fixture.amount : 0,
        currency: "eur",
        status: statuses[type],
        metadata: { order_id: fixture.order.publicId },
        ...overrides
      }
    }
  };
}

databaseTest("a succeeded payment is finalized once in one auditable transaction", async () => {
  const prisma = require("../../src/lib/prisma");
  const { processStripePaymentEvent } = require("../../src/services/payment-finalization.service");
  const fixture = await createFixture(prisma);
  const event = stripeEvent(fixture, "payment_intent.succeeded");

  try {
    const first = await processStripePaymentEvent({ event, prismaClient: prisma });
    const replay = await processStripePaymentEvent({ event, prismaClient: prisma });

    assert.equal(first.outcome, "applied");
    assert.equal(replay.duplicate, true);

    const order = await prisma.order.findUnique({ where: { id: fixture.order.id } });
    const payment = await prisma.payment.findUnique({ where: { id: fixture.payment.id } });
    const artwork = await prisma.artwork.findUnique({ where: { id: fixture.artwork.id } });
    const reservation = await prisma.inventoryReservation.findFirst({
      where: { orderId: fixture.order.id }
    });
    const tasks = await prisma.fulfillmentTask.findMany({
      where: { orderId: fixture.order.id },
      orderBy: { taskType: "asc" }
    });
    const transitions = await prisma.financialTransition.findMany({
      where: { orderId: fixture.order.id }
    });
    const cart = await prisma.cart.findUnique({
      where: { id: fixture.cart.id },
      include: { items: true }
    });

    assert.equal(order.status, "PAID");
    assert.equal(payment.status, "SUCCEEDED");
    assert.equal(artwork.stockQuantity, 0);
    assert.equal(artwork.reservedQuantity, 0);
    assert.equal(reservation.status, "CONSUMED");
    assert.equal(tasks.length, 5);
    assert.deepEqual(
      tasks.map((task) => task.taskType),
      [
        "GENERATE_CERTIFICATE",
        "GRANT_DOWNLOAD_RIGHTS",
        "ISSUE_SALE_INVOICE",
        "NOTIFY_ARTIST_SALE",
        "SEND_PAYMENT_CONFIRMATION"
      ]
    );
    assert.equal(transitions.length, 2);
    assert.equal(cart.items.length, 0);
    assert.equal(cart.version, fixture.cart.version + 1);
  } finally {
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

databaseTest(
  "concurrent success events produce one fulfillment and no double stock decrement",
  async () => {
    const prisma = require("../../src/lib/prisma");
    const {
      processStripePaymentEvent
    } = require("../../src/services/payment-finalization.service");
    const fixture = await createFixture(prisma);

    try {
      await Promise.all([
        processStripePaymentEvent({
          event: stripeEvent(fixture, "payment_intent.succeeded"),
          prismaClient: prisma
        }),
        processStripePaymentEvent({
          event: stripeEvent(fixture, "payment_intent.succeeded"),
          prismaClient: prisma
        })
      ]);

      const artwork = await prisma.artwork.findUnique({ where: { id: fixture.artwork.id } });
      const tasks = await prisma.fulfillmentTask.count({ where: { orderId: fixture.order.id } });
      assert.equal(artwork.stockQuantity, 0);
      assert.equal(artwork.reservedQuantity, 0);
      assert.equal(tasks, 5);
    } finally {
      await cleanup(prisma, fixture);
      await prisma.$disconnect();
    }
  }
);

databaseTest("a succeeded payment preserves items added after checkout", async () => {
  const prisma = require("../../src/lib/prisma");
  const { processStripePaymentEvent } = require("../../src/services/payment-finalization.service");
  const fixture = await createFixture(prisma);
  const extraArtwork = await prisma.artwork.create({
    data: {
      artistId: fixture.artist.id,
      title: `Later addition ${fixture.marker}`,
      priceAmount: 1800,
      currency: "EUR",
      saleStatus: "AVAILABLE",
      stockQuantity: 1
    }
  });
  fixture.extraArtworkIds.push(extraArtwork.id);

  try {
    await prisma.cartItem.create({
      data: {
        cartId: fixture.cart.id,
        artworkId: extraArtwork.id,
        quantity: 1
      }
    });
    await prisma.cart.update({
      where: { id: fixture.cart.id },
      data: { version: { increment: 1 } }
    });

    await processStripePaymentEvent({
      event: stripeEvent(fixture, "payment_intent.succeeded"),
      prismaClient: prisma
    });

    const cart = await prisma.cart.findUnique({
      where: { id: fixture.cart.id },
      include: { items: true }
    });

    assert.deepEqual(
      cart.items.map((item) => ({ artworkId: item.artworkId, quantity: item.quantity })),
      [{ artworkId: extraArtwork.id, quantity: 1 }]
    );
    assert.equal(cart.version, fixture.cart.version + 2);
  } finally {
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

databaseTest("a financial mismatch creates review and alert without fulfillment", async () => {
  const prisma = require("../../src/lib/prisma");
  const { processStripePaymentEvent } = require("../../src/services/payment-finalization.service");
  const fixture = await createFixture(prisma);

  try {
    const result = await processStripePaymentEvent({
      event: stripeEvent(fixture, "payment_intent.succeeded", {
        amount: fixture.amount + 100,
        amount_received: fixture.amount + 100
      }),
      prismaClient: prisma
    });

    const order = await prisma.order.findUnique({ where: { id: fixture.order.id } });
    const alert = await prisma.paymentOperatorAlert.findFirst({
      where: { orderId: fixture.order.id }
    });
    const taskCount = await prisma.fulfillmentTask.count({ where: { orderId: fixture.order.id } });
    assert.equal(result.outcome, "review");
    assert.equal(order.status, "PAYMENT_REVIEW");
    assert.match(alert.code, /PAYMENT_AMOUNT_MISMATCH/);
    assert.equal(taskCount, 0);
  } finally {
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

databaseTest("a later failure event cannot regress an already paid order", async () => {
  const prisma = require("../../src/lib/prisma");
  const { processStripePaymentEvent } = require("../../src/services/payment-finalization.service");
  const fixture = await createFixture(prisma);

  try {
    await processStripePaymentEvent({
      event: stripeEvent(fixture, "payment_intent.succeeded"),
      prismaClient: prisma
    });
    await processStripePaymentEvent({
      event: stripeEvent(fixture, "payment_intent.payment_failed"),
      prismaClient: prisma
    });

    const order = await prisma.order.findUnique({ where: { id: fixture.order.id } });
    const payment = await prisma.payment.findUnique({ where: { id: fixture.payment.id } });
    assert.equal(order.status, "PAID");
    assert.equal(payment.status, "SUCCEEDED");
  } finally {
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

databaseTest("a declined attempt can be retried with a new successful charge", async () => {
  const prisma = require("../../src/lib/prisma");
  const { processStripePaymentEvent } = require("../../src/services/payment-finalization.service");
  const fixture = await createFixture(prisma);
  const failedChargeId = `ch_failed_${fixture.marker}`;
  const successfulChargeId = `ch_succeeded_${fixture.marker}`;

  try {
    await processStripePaymentEvent({
      event: stripeEvent(fixture, "payment_intent.payment_failed", {
        latest_charge: failedChargeId,
        last_payment_error: { code: "card_declined" }
      }),
      prismaClient: prisma
    });

    const result = await processStripePaymentEvent({
      event: stripeEvent(fixture, "payment_intent.succeeded", {
        latest_charge: successfulChargeId
      }),
      prismaClient: prisma
    });

    const order = await prisma.order.findUnique({ where: { id: fixture.order.id } });
    const payment = await prisma.payment.findUnique({ where: { id: fixture.payment.id } });
    const taskCount = await prisma.fulfillmentTask.count({
      where: { orderId: fixture.order.id }
    });
    const alertCount = await prisma.paymentOperatorAlert.count({
      where: { orderId: fixture.order.id }
    });

    assert.equal(result.outcome, "applied");
    assert.equal(order.status, "PAID");
    assert.equal(payment.status, "SUCCEEDED");
    assert.equal(payment.providerChargeId, successfulChargeId);
    assert.equal(payment.failureCode, null);
    assert.equal(taskCount, 5);
    assert.equal(alertCount, 0);
  } finally {
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

async function createFixture(prisma) {
  const marker = randomUUID();
  const artistUser = await prisma.user.create({
    data: { email: `finalize-artist-${marker}@test.local`, isActive: true, verified: true }
  });
  const buyer = await prisma.user.create({
    data: { email: `finalize-buyer-${marker}@test.local`, isActive: true, verified: true }
  });
  const artist = await prisma.artist.create({
    data: { userId: artistUser.id, displayName: "Finalization Test" }
  });
  const artwork = await prisma.artwork.create({
    data: {
      artistId: artist.id,
      title: `Finalization ${marker}`,
      priceAmount: 4200,
      currency: "EUR",
      saleStatus: "AVAILABLE",
      stockQuantity: 1,
      reservedQuantity: 1
    }
  });
  const cart = await prisma.cart.create({
    data: {
      userId: buyer.id,
      items: {
        create: {
          artworkId: artwork.id,
          quantity: 1
        }
      }
    }
  });
  const providerPaymentId = `pi_${marker}`;
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      cartId: cart.id,
      cartVersion: 1,
      pricingFingerprint: "f".repeat(64),
      customerType: "B2C",
      marketCountry: "FR",
      billingSnapshot: {
        customerType: "B2C",
        name: "Finalization Buyer",
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
      },
      reservations: {
        create: {
          artworkId: artwork.id,
          quantity: 1,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      },
      payments: {
        create: {
          providerPaymentId,
          amount: 4200,
          currency: "EUR"
        }
      }
    },
    include: { payments: true }
  });

  return {
    marker,
    userIds: [artistUser.id, buyer.id],
    artist,
    artwork,
    cart,
    order,
    payment: order.payments[0],
    amount: 4200,
    providerPaymentId,
    extraArtworkIds: []
  };
}

async function cleanup(prisma, fixture) {
  await prisma.paymentOperatorAlert.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.financialTransition.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.fulfillmentTask.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.stripeWebhookEvent.deleteMany({
    where: { stripeObjectId: fixture.providerPaymentId }
  });
  await prisma.inventoryReservation.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.payment.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.order.delete({ where: { id: fixture.order.id } });
  await prisma.cart.delete({ where: { id: fixture.cart.id } });
  await prisma.artwork.deleteMany({
    where: { id: { in: [fixture.artwork.id, ...fixture.extraArtworkIds] } }
  });
  await prisma.artist.delete({ where: { id: fixture.artist.id } });
  await prisma.user.deleteMany({ where: { id: { in: fixture.userIds } } });
}
