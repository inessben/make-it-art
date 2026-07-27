const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;
const billingDetails = Object.freeze({
  customerType: "B2C",
  consumerConfirmed: true,
  name: "Checkout Buyer",
  addressLine1: "1 rue de Paris",
  addressLine2: "",
  postalCode: "75001",
  city: "Paris",
  country: "FR"
});

databaseTest("checkout creates one server-priced PaymentIntent and reuses it", async () => {
  const prisma = require("../../src/lib/prisma");
  const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
  const { initializeCheckout } = require("../../src/services/checkout.service");
  const { resumeCheckout } = require("../../src/services/checkout-recovery.service");
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
      billingDetails,
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
    assert.equal(createdIntent.receipt_email, fixture.buyer.email);
    assert.match(createdIntent.customer, /^cus_/);
    assert.equal(createdIntent.metadata.order_id, first.orderId);
    assert.equal(createdIntent.metadata.merchant_of_record, "MAKE_IT_ART");
    assert.equal(createdIntent.metadata.customer_type, "B2C");
    assert.equal(createdIntent.metadata.market_country, "FR");

    const orders = await prisma.order.findMany({
      where: { userId: fixture.buyer.id },
      include: { payments: true, reservations: true, items: true }
    });
    assert.equal(orders.length, 1);
    assert.equal(orders[0].payments.length, 1);
    assert.equal(orders[0].reservations.length, 1);
    assert.equal(orders[0].items[0].unitAmount, 2750);
    assert.equal(orders[0].items[0].netAmount, 2292);
    assert.equal(orders[0].items[0].taxAmount, 458);
    assert.equal(orders[0].items[0].commissionAmount, 160);
    assert.equal(orders[0].customerType, "B2C");
    assert.equal(orders[0].marketCountry, "FR");
    assert.equal(orders[0].billingSnapshot.address.country, "FR");
    assert.equal(orders[0].subtotalExcludingTaxAmount, 2292);
    assert.equal(orders[0].taxAmount, 458);
    assert.equal(orders[0].taxRateBps, 2000);
    assert.equal(orders[0].commissionAmount, 160);
    assert.equal(orders[0].commissionRateBps, 700);
    assert.equal(orders[0].payments[0].providerPaymentId, createdIntent.id);
    assert.equal(orders[0].payments[0].idempotencyKey.includes(clientIdempotencyKey), false);
    assert.match(first.customerSessionClientSecret, /^cuss_/);
    assert.equal(first.savedPaymentMethodsAvailable, true);

    const reservedArtwork = await prisma.artwork.findUnique({
      where: { id: fixture.artwork.id }
    });
    assert.equal(reservedArtwork.reservedQuantity, 1);

    const lostBrowserRetry = await initializeCheckout({
      ...input,
      clientIdempotencyKey: randomUUID()
    });
    const resumed = await resumeCheckout({
      userId: fixture.buyer.id,
      publicId: first.orderId,
      stripeClient: stripe.client,
      prismaClient: prisma
    });
    assert.equal(lostBrowserRetry.clientSecret, first.clientSecret);
    assert.equal(resumed.clientSecret, first.clientSecret);
    assert.equal(stripe.intents.size, 1);
  } finally {
    await cleanup(prisma, marker, fixture.userIds);
    await prisma.$disconnect();
  }
});

for (const licenseType of ["PERSONAL", "COMMERCIAL"]) {
  databaseTest(
    `a ${licenseType.toLowerCase()} artwork can be purchased repeatedly without inventory`,
    async () => {
      const prisma = require("../../src/lib/prisma");
      const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
      const { initializeCheckout } = require("../../src/services/checkout.service");
      const {
        processStripePaymentEvent
      } = require("../../src/services/payment-finalization.service");
      const marker = randomUUID();
      const fixture = await createFixture(prisma, marker, 3200);
      const stripe = createFakeStripe();

      try {
        await prisma.artwork.update({
          where: { id: fixture.artwork.id },
          data: { licenseType, stockQuantity: 0 }
        });
        await setCartItem(fixture.buyer.id, { artworkId: fixture.artwork.id, quantity: 1 });
        const firstCart = await getCartSummary(fixture.buyer.id);
        const first = await initializeCheckout({
          userId: fixture.buyer.id,
          cartVersion: firstCart.version,
          pricingFingerprint: firstCart.pricingFingerprint,
          billingDetails,
          clientIdempotencyKey: randomUUID(),
          stripeClient: stripe.client
        });
        const firstOrder = await prisma.order.findUnique({
          where: { publicId: first.orderId },
          include: { reservations: true, items: true }
        });
        const intent = [...stripe.intents.values()][0];
        Object.assign(intent, {
          status: "succeeded",
          amount_received: intent.amount,
          latest_charge: `ch_${licenseType.toLowerCase()}_${marker.replaceAll("-", "")}`
        });

        await processStripePaymentEvent({
          prismaClient: prisma,
          event: {
            id: `evt_${licenseType.toLowerCase()}_${marker}`,
            type: "payment_intent.succeeded",
            data: { object: intent }
          }
        });

        const purchasedArtwork = await prisma.artwork.findUnique({
          where: { id: fixture.artwork.id }
        });
        assert.equal(firstOrder.reservations.length, 0);
        assert.equal(firstOrder.items[0].licenseType, licenseType);
        assert.equal(purchasedArtwork.saleStatus, "AVAILABLE");
        assert.equal(purchasedArtwork.stockQuantity, 0);
        assert.equal(purchasedArtwork.reservedQuantity, 0);

        await setCartItem(fixture.buyer.id, { artworkId: fixture.artwork.id, quantity: 1 });
        const secondCart = await getCartSummary(fixture.buyer.id);
        const second = await initializeCheckout({
          userId: fixture.buyer.id,
          cartVersion: secondCart.version,
          pricingFingerprint: secondCart.pricingFingerprint,
          billingDetails,
          clientIdempotencyKey: randomUUID(),
          stripeClient: stripe.client
        });
        const secondOrder = await prisma.order.findUnique({
          where: { publicId: second.orderId },
          include: { reservations: true, items: true }
        });

        assert.notEqual(second.orderId, first.orderId);
        assert.equal(secondOrder.reservations.length, 0);
        assert.equal(secondOrder.items[0].licenseType, licenseType);
        assert.equal(stripe.intents.size, 2);
      } finally {
        await cleanup(prisma, marker, fixture.userIds);
        await prisma.$disconnect();
      }
    }
  );
}

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
      billingDetails,
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

databaseTest("eight buyers racing for an exclusive artwork create only one payment", async () => {
  const prisma = require("../../src/lib/prisma");
  const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
  const { initializeCheckout } = require("../../src/services/checkout.service");
  const marker = randomUUID();
  const fixture = await createFixture(prisma, marker, 6800);
  const competingBuyers = await Promise.all(
    Array.from({ length: 7 }, (_, index) =>
      prisma.user.create({
        data: {
          email: `checkout-race-${index}-${marker}@make-it-art.test`,
          username: `checkout-race-${index}-${marker}`,
          isActive: true,
          verified: true
        }
      })
    )
  );
  fixture.userIds.push(...competingBuyers.map(({ id }) => id));
  const stripe = createFakeStripe();
  const buyers = [fixture.buyer, ...competingBuyers];

  try {
    await Promise.all(
      buyers.map((buyer) => setCartItem(buyer.id, { artworkId: fixture.artwork.id, quantity: 1 }))
    );
    const carts = await Promise.all(buyers.map((buyer) => getCartSummary(buyer.id)));
    const attempts = await Promise.allSettled(
      buyers.map((buyer, index) =>
        initializeCheckout({
          userId: buyer.id,
          cartVersion: carts[index].version,
          pricingFingerprint: carts[index].pricingFingerprint,
          billingDetails: { ...billingDetails, name: buyer.username },
          clientIdempotencyKey: randomUUID(),
          stripeClient: stripe.client
        })
      )
    );

    const winners = attempts.filter((attempt) => attempt.status === "fulfilled");
    const losers = attempts.filter((attempt) => attempt.status === "rejected");
    const storedArtwork = await prisma.artwork.findUnique({
      where: { id: fixture.artwork.id }
    });
    const activeReservations = await prisma.inventoryReservation.count({
      where: { artworkId: fixture.artwork.id, status: "ACTIVE" }
    });

    assert.equal(winners.length, 1);
    assert.equal(losers.length, 7);
    assert.ok(
      losers.every(({ reason }) =>
        ["CART_NOT_PAYABLE", "EXCLUSIVE_ARTWORK_UNAVAILABLE"].includes(reason.code)
      )
    );
    assert.equal(stripe.intents.size, 1);
    assert.equal(
      await prisma.order.count({ where: { items: { some: { artworkId: fixture.artwork.id } } } }),
      1
    );
    assert.equal(
      await prisma.payment.count({
        where: { order: { items: { some: { artworkId: fixture.artwork.id } } } }
      }),
      1
    );
    assert.equal(activeReservations, 1);
    assert.equal(storedArtwork.reservedQuantity, 1);
  } finally {
    await cleanup(prisma, marker, fixture.userIds);
    await prisma.$disconnect();
  }
});

databaseTest("an idempotency key cannot be reused for another cart snapshot", async () => {
  const prisma = require("../../src/lib/prisma");
  const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
  const { CheckoutError, initializeCheckout } = require("../../src/services/checkout.service");
  const marker = randomUUID();
  const fixture = await createFixture(prisma, marker, 2800);
  const stripe = createFakeStripe();
  const clientIdempotencyKey = randomUUID();

  try {
    await setCartItem(fixture.buyer.id, { artworkId: fixture.artwork.id, quantity: 1 });
    const firstCart = await getCartSummary(fixture.buyer.id);
    await initializeCheckout({
      userId: fixture.buyer.id,
      cartVersion: firstCart.version,
      pricingFingerprint: firstCart.pricingFingerprint,
      billingDetails,
      clientIdempotencyKey,
      stripeClient: stripe.client
    });

    const secondArtwork = await prisma.artwork.create({
      data: {
        artistId: fixture.artist.id,
        title: `Idempotency second artwork ${marker}`,
        priceAmount: 1200,
        currency: "EUR",
        licenseType: "EXCLUSIVE",
        saleStatus: "AVAILABLE",
        stockQuantity: 1
      }
    });
    await setCartItem(fixture.buyer.id, { artworkId: secondArtwork.id, quantity: 1 });
    const changedCart = await getCartSummary(fixture.buyer.id);

    await assert.rejects(
      initializeCheckout({
        userId: fixture.buyer.id,
        cartVersion: changedCart.version,
        pricingFingerprint: changedCart.pricingFingerprint,
        billingDetails,
        clientIdempotencyKey,
        stripeClient: stripe.client
      }),
      (error) => error instanceof CheckoutError && error.code === "IDEMPOTENCY_KEY_REUSED"
    );
    assert.equal(stripe.intents.size, 1);
  } finally {
    await cleanup(prisma, marker, fixture.userIds);
    await prisma.$disconnect();
  }
});

databaseTest(
  "checkout reconciles a succeeded intent without exposing its client secret",
  async () => {
    const prisma = require("../../src/lib/prisma");
    const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
    const { initializeCheckout } = require("../../src/services/checkout.service");
    const {
      processStripePaymentEvent
    } = require("../../src/services/payment-finalization.service");
    const marker = randomUUID();
    const fixture = await createFixture(prisma, marker, 5100);
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
        billingDetails,
        clientIdempotencyKey: randomUUID(),
        stripeClient: stripe.client
      };
      const initialized = await initializeCheckout(input);
      const intent = [...stripe.intents.values()][0];
      const storedOrder = await prisma.order.findUnique({
        where: { publicId: initialized.orderId },
        include: { payments: true }
      });

      await prisma.payment.update({
        where: { id: storedOrder.payments[0].id },
        data: { status: "FAILED", providerStatus: "requires_payment_method" }
      });
      await prisma.order.update({
        where: { id: storedOrder.id },
        data: { status: "PAYMENT_FAILED" }
      });
      Object.assign(intent, {
        status: "succeeded",
        amount_received: intent.amount,
        latest_charge: `ch_test_${marker.replaceAll("-", "")}`,
        payment_method: "pm_testsaved",
        setup_future_usage: "on_session"
      });

      const reconciled = await initializeCheckout(input);

      assert.equal(reconciled.orderStatus, "PAID");
      assert.equal(reconciled.paymentStatus, "succeeded");
      assert.equal(reconciled.requiresConfirmation, false);
      assert.equal(reconciled.clientSecret, null);
      assert.equal(
        await prisma.cartItem.count({ where: { cart: { userId: fixture.buyer.id } } }),
        0
      );
      assert.equal(await prisma.fulfillmentTask.count({ where: { orderId: storedOrder.id } }), 5);
      assert.equal(
        await prisma.savedPaymentMethodConsent.count({
          where: {
            userId: fixture.buyer.id,
            providerPaymentMethodId: "pm_testsaved",
            revokedAt: null
          }
        }),
        1
      );

      await processStripePaymentEvent({
        prismaClient: prisma,
        event: {
          id: `evt_late_${marker}`,
          type: "payment_intent.succeeded",
          data: { object: intent }
        }
      });

      const artwork = await prisma.artwork.findUnique({ where: { id: fixture.artwork.id } });
      assert.equal(artwork.stockQuantity, 0);
      assert.equal(artwork.reservedQuantity, 0);
      assert.equal(artwork.saleStatus, "SOLD_OUT");
      assert.equal(artwork.isSold, true);
      assert.equal(await prisma.fulfillmentTask.count({ where: { orderId: storedOrder.id } }), 5);
    } finally {
      await cleanup(prisma, marker, fixture.userIds);
      await prisma.$disconnect();
    }
  }
);

databaseTest("checkout does not expose a processing intent to Stripe Elements", async () => {
  const prisma = require("../../src/lib/prisma");
  const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
  const { initializeCheckout } = require("../../src/services/checkout.service");
  const marker = randomUUID();
  const fixture = await createFixture(prisma, marker, 2900);
  const stripe = createFakeStripe();

  try {
    await setCartItem(fixture.buyer.id, { artworkId: fixture.artwork.id, quantity: 1 });
    const cart = await getCartSummary(fixture.buyer.id);
    const input = {
      userId: fixture.buyer.id,
      cartVersion: cart.version,
      pricingFingerprint: cart.pricingFingerprint,
      billingDetails,
      clientIdempotencyKey: randomUUID(),
      stripeClient: stripe.client
    };
    await initializeCheckout(input);
    const intent = [...stripe.intents.values()][0];
    intent.status = "processing";

    const processing = await initializeCheckout(input);
    const reservedArtwork = await prisma.artwork.findUnique({
      where: { id: fixture.artwork.id }
    });
    const reservation = await prisma.inventoryReservation.findFirst({
      where: { order: { publicId: processing.orderId } }
    });

    assert.equal(processing.orderStatus, "PAYMENT_PROCESSING");
    assert.equal(processing.requiresConfirmation, false);
    assert.equal(processing.clientSecret, null);
    assert.equal(reservedArtwork.reservedQuantity, 1);
    assert.equal(reservation.status, "ACTIVE");
  } finally {
    await cleanup(prisma, marker, fixture.userIds);
    await prisma.$disconnect();
  }
});

databaseTest("a provider-canceled intent cannot be resumed", async () => {
  const prisma = require("../../src/lib/prisma");
  const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
  const { initializeCheckout } = require("../../src/services/checkout.service");
  const {
    CheckoutRecoveryError,
    resumeCheckout
  } = require("../../src/services/checkout-recovery.service");
  const marker = randomUUID();
  const fixture = await createFixture(prisma, marker, 3600);
  const stripe = createFakeStripe();

  try {
    await setCartItem(fixture.buyer.id, { artworkId: fixture.artwork.id, quantity: 1 });
    const cart = await getCartSummary(fixture.buyer.id);
    const initialized = await initializeCheckout({
      userId: fixture.buyer.id,
      cartVersion: cart.version,
      pricingFingerprint: cart.pricingFingerprint,
      billingDetails,
      clientIdempotencyKey: randomUUID(),
      stripeClient: stripe.client
    });
    const intent = [...stripe.intents.values()][0];
    intent.status = "canceled";

    await assert.rejects(
      resumeCheckout({
        userId: fixture.buyer.id,
        publicId: initialized.orderId,
        stripeClient: stripe.client,
        prismaClient: prisma
      }),
      (error) => error instanceof CheckoutRecoveryError && error.code === "CHECKOUT_NOT_RESUMABLE"
    );

    const order = await prisma.order.findUnique({
      where: { publicId: initialized.orderId },
      include: { reservations: true }
    });
    const artwork = await prisma.artwork.findUnique({ where: { id: fixture.artwork.id } });
    assert.equal(order.status, "CANCELED");
    assert.equal(order.reservations[0].status, "RELEASED");
    assert.equal(artwork.stockQuantity, 1);
    assert.equal(artwork.reservedQuantity, 0);
    assert.equal(artwork.saleStatus, "AVAILABLE");
    assert.equal(artwork.isSold, false);
  } finally {
    await cleanup(prisma, marker, fixture.userIds);
    await prisma.$disconnect();
  }
});

databaseTest("a previously canceled checkout snapshot is renewed automatically", async () => {
  const prisma = require("../../src/lib/prisma");
  const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
  const { initializeCheckout } = require("../../src/services/checkout.service");
  const marker = randomUUID();
  const fixture = await createFixture(prisma, marker, 3700);
  const stripe = createFakeStripe();

  try {
    await setCartItem(fixture.buyer.id, { artworkId: fixture.artwork.id, quantity: 1 });
    const cart = await getCartSummary(fixture.buyer.id);
    const input = {
      userId: fixture.buyer.id,
      cartVersion: cart.version,
      pricingFingerprint: cart.pricingFingerprint,
      billingDetails,
      clientIdempotencyKey: randomUUID(),
      stripeClient: stripe.client
    };
    const first = await initializeCheckout(input);
    const firstOrder = await prisma.order.findUnique({
      where: { publicId: first.orderId },
      include: { payments: true, reservations: true }
    });
    const firstIntent = [...stripe.intents.values()][0];
    firstIntent.status = "canceled";

    await prisma.$transaction([
      prisma.artwork.update({
        where: { id: fixture.artwork.id },
        data: { reservedQuantity: { decrement: 1 } }
      }),
      prisma.inventoryReservation.update({
        where: { id: firstOrder.reservations[0].id },
        data: { status: "RELEASED" }
      }),
      prisma.payment.update({
        where: { id: firstOrder.payments[0].id },
        data: { status: "CANCELED", providerStatus: "canceled" }
      }),
      prisma.order.update({
        where: { id: firstOrder.id },
        data: { status: "CANCELED", canceledAt: new Date() }
      })
    ]);

    const retried = await initializeCheckout(input);
    const renewedCart = await getCartSummary(fixture.buyer.id);

    assert.equal(retried.created, true);
    assert.notEqual(retried.orderId, first.orderId);
    assert.equal(retried.requiresConfirmation, true);
    assert.match(retried.clientSecret, /_secret_/);
    assert.equal(renewedCart.version, cart.version + 1);
    assert.equal(renewedCart.items.length, 1);
    assert.equal(stripe.intents.size, 2);
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
        billingDetails,
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

databaseTest("a changed cart cancels the old intent before creating a new checkout", async () => {
  const prisma = require("../../src/lib/prisma");
  const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
  const { initializeCheckout } = require("../../src/services/checkout.service");
  const marker = randomUUID();
  const fixture = await createFixture(prisma, marker, 2100);
  const stripe = createFakeStripe();

  try {
    await setCartItem(fixture.buyer.id, { artworkId: fixture.artwork.id, quantity: 1 });
    const firstCart = await getCartSummary(fixture.buyer.id);
    const first = await initializeCheckout({
      userId: fixture.buyer.id,
      cartVersion: firstCart.version,
      pricingFingerprint: firstCart.pricingFingerprint,
      billingDetails,
      clientIdempotencyKey: randomUUID(),
      stripeClient: stripe.client
    });

    const secondArtwork = await prisma.artwork.create({
      data: {
        artistId: fixture.artist.id,
        title: `Checkout second artwork ${marker}`,
        priceAmount: 900,
        currency: "EUR",
        licenseType: "EXCLUSIVE",
        saleStatus: "AVAILABLE",
        stockQuantity: 1
      }
    });
    await setCartItem(fixture.buyer.id, { artworkId: secondArtwork.id, quantity: 1 });
    const changedCart = await getCartSummary(fixture.buyer.id);
    const second = await initializeCheckout({
      userId: fixture.buyer.id,
      cartVersion: changedCart.version,
      pricingFingerprint: changedCart.pricingFingerprint,
      billingDetails,
      clientIdempotencyKey: randomUUID(),
      stripeClient: stripe.client
    });

    const firstOrder = await prisma.order.findUnique({ where: { publicId: first.orderId } });
    assert.equal(firstOrder.status, "CANCELED");
    assert.notEqual(second.orderId, first.orderId);
    assert.equal(stripe.intents.size, 2);
    assert.equal(stripe.cancellations, 1);
  } finally {
    await cleanup(prisma, marker, fixture.userIds);
    await prisma.$disconnect();
  }
});

databaseTest("a succeeded superseded checkout is reconciled instead of canceled", async () => {
  const prisma = require("../../src/lib/prisma");
  const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
  const { initializeCheckout } = require("../../src/services/checkout.service");
  const { CheckoutRecoveryError } = require("../../src/services/checkout-recovery.service");
  const marker = randomUUID();
  const fixture = await createFixture(prisma, marker, 4300);
  const stripe = createFakeStripe();

  try {
    await setCartItem(fixture.buyer.id, { artworkId: fixture.artwork.id, quantity: 1 });
    const firstCart = await getCartSummary(fixture.buyer.id);
    const first = await initializeCheckout({
      userId: fixture.buyer.id,
      cartVersion: firstCart.version,
      pricingFingerprint: firstCart.pricingFingerprint,
      billingDetails,
      clientIdempotencyKey: randomUUID(),
      stripeClient: stripe.client
    });
    const secondArtwork = await prisma.artwork.create({
      data: {
        artistId: fixture.artist.id,
        title: `Checkout preserved artwork ${marker}`,
        priceAmount: 1700,
        currency: "EUR",
        licenseType: "EXCLUSIVE",
        saleStatus: "AVAILABLE",
        stockQuantity: 1
      }
    });
    await setCartItem(fixture.buyer.id, { artworkId: secondArtwork.id, quantity: 1 });
    const changedCart = await getCartSummary(fixture.buyer.id);
    const intent = [...stripe.intents.values()][0];
    Object.assign(intent, {
      status: "succeeded",
      amount_received: intent.amount,
      latest_charge: `ch_test_${marker.replaceAll("-", "")}`
    });

    await assert.rejects(
      initializeCheckout({
        userId: fixture.buyer.id,
        cartVersion: changedCart.version,
        pricingFingerprint: changedCart.pricingFingerprint,
        billingDetails,
        clientIdempotencyKey: randomUUID(),
        stripeClient: stripe.client
      }),
      (error) =>
        error instanceof CheckoutRecoveryError &&
        error.code === "PREVIOUS_PAYMENT_REQUIRES_RECONCILIATION"
    );

    const paidOrder = await prisma.order.findUnique({ where: { publicId: first.orderId } });
    const remainingCart = await getCartSummary(fixture.buyer.id);
    const purchasedArtwork = await prisma.artwork.findUnique({
      where: { id: fixture.artwork.id }
    });
    assert.equal(paidOrder.status, "PAID");
    assert.deepEqual(
      remainingCart.items.map((item) => item.artworkId),
      [secondArtwork.id]
    );
    assert.equal(purchasedArtwork.stockQuantity, 0);
    assert.equal(stripe.cancellations, 0);
  } finally {
    await cleanup(prisma, marker, fixture.userIds);
    await prisma.$disconnect();
  }
});

databaseTest("expired checkout cancellation releases inventory and is idempotent", async () => {
  const prisma = require("../../src/lib/prisma");
  const { getCartSummary, setCartItem } = require("../../src/services/cart.service");
  const { initializeCheckout } = require("../../src/services/checkout.service");
  const { expireStaleCheckouts } = require("../../src/services/checkout-recovery.service");
  const marker = randomUUID();
  const fixture = await createFixture(prisma, marker, 1800);
  const stripe = createFakeStripe();

  try {
    await setCartItem(fixture.buyer.id, { artworkId: fixture.artwork.id, quantity: 1 });
    const cart = await getCartSummary(fixture.buyer.id);
    const checkout = await initializeCheckout({
      userId: fixture.buyer.id,
      cartVersion: cart.version,
      pricingFingerprint: cart.pricingFingerprint,
      billingDetails,
      clientIdempotencyKey: randomUUID(),
      stripeClient: stripe.client
    });
    const future = new Date(Date.now() + 30 * 60 * 1000);
    const firstSweep = await expireStaleCheckouts({
      stripeClient: stripe.client,
      prismaClient: prisma,
      now: future
    });
    const secondSweep = await expireStaleCheckouts({
      stripeClient: stripe.client,
      prismaClient: prisma,
      now: future
    });

    const order = await prisma.order.findUnique({ where: { publicId: checkout.orderId } });
    const artwork = await prisma.artwork.findUnique({ where: { id: fixture.artwork.id } });
    const reservation = await prisma.inventoryReservation.findFirst({
      where: { orderId: order.id }
    });
    const retryCart = await getCartSummary(fixture.buyer.id);
    assert.equal(firstSweep.canceled, 1);
    assert.equal(secondSweep.canceled, 0);
    assert.equal(order.status, "CANCELED");
    assert.equal(artwork.stockQuantity, 1);
    assert.equal(artwork.reservedQuantity, 0);
    assert.equal(artwork.saleStatus, "AVAILABLE");
    assert.equal(artwork.isSold, false);
    assert.equal(reservation.status, "EXPIRED");
    assert.equal(stripe.cancellations, 1);
    assert.equal(retryCart.version, cart.version + 1);
    assert.equal(retryCart.items.length, 1);
    assert.equal(retryCart.payable, true);

    const retriedCheckout = await initializeCheckout({
      userId: fixture.buyer.id,
      cartVersion: retryCart.version,
      pricingFingerprint: retryCart.pricingFingerprint,
      billingDetails,
      clientIdempotencyKey: randomUUID(),
      stripeClient: stripe.client
    });
    const reservedAgain = await prisma.artwork.findUnique({
      where: { id: fixture.artwork.id }
    });
    assert.notEqual(retriedCheckout.orderId, checkout.orderId);
    assert.equal(retriedCheckout.requiresConfirmation, true);
    assert.match(retriedCheckout.clientSecret, /_secret_/);
    assert.equal(reservedAgain.reservedQuantity, 1);
    assert.equal(stripe.intents.size, 2);
  } finally {
    await cleanup(prisma, marker, fixture.userIds);
    await prisma.$disconnect();
  }
});

function createFakeStripe({ amountOffset = 0 } = {}) {
  const intents = new Map();
  const byId = new Map();
  const customers = new Map();
  let customerSessionCount = 0;

  return {
    intents,
    get cancellations() {
      return [...byId.values()].filter((intent) => intent.cancellation_reason).length;
    },
    client: {
      customers: {
        async create(parameters) {
          const id = `cus_test${customers.size + 1}`;
          const customer = { id, ...parameters, deleted: false };
          customers.set(id, customer);
          return customer;
        },
        async retrieve(id) {
          return customers.get(id);
        }
      },
      customerSessions: {
        async create() {
          customerSessionCount += 1;
          return {
            id: `cuss_test${customerSessionCount}`,
            client_secret: `cuss_test${customerSessionCount}_secret_test`
          };
        }
      },
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
            receipt_email: parameters.receipt_email,
            customer: parameters.customer,
            payment_method_configuration: parameters.payment_method_configuration,
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
        },
        async cancel(id, parameters) {
          const intent = byId.get(id);
          intent.status = "canceled";
          intent.cancellation_reason = parameters.cancellation_reason;
          return intent;
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
      licenseType: "EXCLUSIVE",
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
  await prisma.paymentOperatorAlert.deleteMany({
    where: { order: { userId: { in: userIds } } }
  });
  await prisma.financialTransition.deleteMany({
    where: { order: { userId: { in: userIds } } }
  });
  await prisma.fulfillmentTask.deleteMany({
    where: { order: { userId: { in: userIds } } }
  });
  await prisma.stripeWebhookEvent.deleteMany({
    where: {
      OR: [{ eventId: { contains: marker } }, { payment: { order: { userId: { in: userIds } } } }]
    }
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
