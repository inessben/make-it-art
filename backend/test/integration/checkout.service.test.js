const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

databaseTest("checkout creates one server-priced PaymentIntent and reuses it", async () => {
  const prisma = require("../../src/lib/prisma");
  const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
  const { CheckoutError, initializeCheckout } = require("../../src/services/checkout.service");
  const marker = randomUUID();
  const fixture = await createFixture(prisma, marker, 2750);
  const stripe = createFakeStripe();
  const clientIdempotencyKey = randomUUID();

  try {
    await setCartItem(fixture.buyer.id, {
      artworkId: fixture.artwork.id,
      quantity: 1
    });
    const cart = await getCartSummary(fixture.buyer.id);
    const input = {
      userId: fixture.buyer.id,
      cartVersion: cart.version,
      pricingFingerprint: cart.pricingFingerprint,
      clientIdempotencyKey,
      stripeClient: stripe.client
    };

    const first = await initializeCheckout(input);
    const repeated = await initializeCheckout(input);

    assert.equal(first.created, true);
    assert.equal(repeated.created, false);
    assert.equal(first.clientSecret, repeated.clientSecret);
    assert.equal(first.amount, 2750);
    assert.equal(first.currency, "EUR");
    assert.equal(stripe.intents.size, 1);

    const createdIntent = [...stripe.intents.values()][0];
    assert.equal(createdIntent.amount, 2750);
    assert.equal(createdIntent.currency, "eur");
    assert.equal(createdIntent.metadata.order_id, first.orderId);

    const orders = await prisma.order.findMany({
      where: { userId: fixture.buyer.id },
      include: { payments: true, reservations: true, items: true }
    });
    assert.equal(orders.length, 1);
    assert.equal(orders[0].payments.length, 1);
    assert.equal(orders[0].reservations.length, 1);
    assert.equal(orders[0].items[0].unitAmount, 2750);
    assert.equal(orders[0].payments[0].providerPaymentId, createdIntent.id);
    assert.equal(orders[0].payments[0].idempotencyKey.includes(clientIdempotencyKey), false);

    const reservedArtwork = await prisma.artwork.findUnique({
      where: { id: fixture.artwork.id }
    });
    assert.equal(reservedArtwork.reservedQuantity, 1);

    await assert.rejects(
      initializeCheckout({
        ...input,
        clientIdempotencyKey: randomUUID()
      }),
      (error) => error instanceof CheckoutError && error.code === "CHECKOUT_ALREADY_INITIALIZED"
    );
  } finally {
    await cleanup(prisma, marker, fixture.userIds);
    await prisma.$disconnect();
  }
});

databaseTest("concurrent retries return one order and one PaymentIntent", async () => {
  const prisma = require("../../src/lib/prisma");
  const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
  const { initializeCheckout } = require("../../src/services/checkout.service");
  const marker = randomUUID();
  const fixture = await createFixture(prisma, marker, 6400);
  const stripe = createFakeStripe();

  try {
    await setCartItem(fixture.buyer.id, {
      artworkId: fixture.artwork.id,
      quantity: 1
    });
    const cart = await getCartSummary(fixture.buyer.id);
    const input = {
      userId: fixture.buyer.id,
      cartVersion: cart.version,
      pricingFingerprint: cart.pricingFingerprint,
      clientIdempotencyKey: randomUUID(),
      stripeClient: stripe.client
    };

    const results = await Promise.all([initializeCheckout(input), initializeCheckout(input)]);

    assert.equal(results[0].clientSecret, results[1].clientSecret);
    assert.equal(stripe.intents.size, 1);
    assert.equal(await prisma.order.count({ where: { userId: fixture.buyer.id } }), 1);
    assert.equal(
      await prisma.payment.count({
        where: { order: { userId: fixture.buyer.id } }
      }),
      1
    );
  } finally {
    await cleanup(prisma, marker, fixture.userIds);
    await prisma.$disconnect();
  }
});

databaseTest("a Stripe amount mismatch blocks checkout and flags the order", async () => {
  const prisma = require("../../src/lib/prisma");
  const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
  const { CheckoutError, initializeCheckout } = require("../../src/services/checkout.service");
  const marker = randomUUID();
  const fixture = await createFixture(prisma, marker, 3200);
  const stripe = createFakeStripe({ amountOffset: 1 });

  try {
    await setCartItem(fixture.buyer.id, {
      artworkId: fixture.artwork.id,
      quantity: 1
    });
    const cart = await getCartSummary(fixture.buyer.id);

    await assert.rejects(
      initializeCheckout({
        userId: fixture.buyer.id,
        cartVersion: cart.version,
        pricingFingerprint: cart.pricingFingerprint,
        clientIdempotencyKey: randomUUID(),
        stripeClient: stripe.client
      }),
      (error) => error instanceof CheckoutError && error.code === "CHECKOUT_REVIEW_REQUIRED"
    );

    const order = await prisma.order.findFirst({
      where: { userId: fixture.buyer.id }
    });
    assert.equal(order.status, "PAYMENT_REVIEW");
  } finally {
    await cleanup(prisma, marker, fixture.userIds);
    await prisma.$disconnect();
  }
});

function createFakeStripe({ amountOffset = 0 } = {}) {
  const intents = new Map();
  const byId = new Map();

  return {
    intents,
    client: {
      paymentIntents: {
        async create(parameters, options) {
          if (intents.has(options.idempotencyKey)) {
            return intents.get(options.idempotencyKey);
          }

          const id = `pi_test_${intents.size + 1}`;
          const intent = {
            id,
            amount: parameters.amount + amountOffset,
            currency: parameters.currency,
            metadata: parameters.metadata,
            status: "requires_payment_method",
            client_secret: `${id}_secret_test`
          };
          intents.set(options.idempotencyKey, intent);
          byId.set(id, intent);
          await new Promise((resolve) => setTimeout(resolve, 10));
          return intent;
        },
        async retrieve(id) {
          return byId.get(id);
        }
      }
    }
  };
}

async function createFixture(prisma, marker, priceAmount) {
  const artistUser = await prisma.user.create({
    data: {
      email: `checkout-artist-${marker}@make-it-art.test`,
      username: `checkout-artist-${marker}`,
      isActive: true,
      verified: true
    }
  });
  const buyer = await prisma.user.create({
    data: {
      email: `checkout-buyer-${marker}@make-it-art.test`,
      username: `checkout-buyer-${marker}`,
      isActive: true,
      verified: true
    }
  });
  const artist = await prisma.artist.create({
    data: {
      userId: artistUser.id,
      displayName: "Checkout Test Artist"
    }
  });
  const artwork = await prisma.artwork.create({
    data: {
      artistId: artist.id,
      title: `Checkout artwork ${marker}`,
      priceAmount,
      currency: "EUR",
      saleStatus: "AVAILABLE",
      stockQuantity: 1
    }
  });

  return {
    artistUser,
    buyer,
    artist,
    artwork,
    userIds: [artistUser.id, buyer.id]
  };
}

async function cleanup(prisma, marker, userIds) {
  await prisma.stripeWebhookEvent.deleteMany({
    where: { eventId: { contains: marker } }
  });
  await prisma.inventoryReservation.deleteMany({
    where: { order: { userId: { in: userIds } } }
  });
  await prisma.payment.deleteMany({
    where: { order: { userId: { in: userIds } } }
  });
  await prisma.orderItem.deleteMany({
    where: { order: { userId: { in: userIds } } }
  });
  await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
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
