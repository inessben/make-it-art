const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { franceB2COrderFields, franceB2COrderItemFields } = require("../helpers/commerce-fixture");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

function stripeClientStub(calls) {
  return {
    refunds: {
      async create(data, options) {
        calls.push({ data, options });
        return {
          id: `re_${randomUUID()}`,
          status: "pending",
          amount: data.amount,
          currency: "eur",
          payment_intent: data.payment_intent,
          metadata: data.metadata
        };
      }
    }
  };
}

function refundEvent(fixture, refund, type, status, overrides = {}) {
  return {
    id: `evt_refund_${randomUUID()}`,
    type,
    data: {
      object: {
        id: refund.providerRefundId,
        status,
        amount: refund.amount,
        currency: "eur",
        payment_intent: fixture.payment.providerPaymentId,
        metadata: {
          local_refund_id: refund.publicId,
          order_id: fixture.order.publicId
        },
        ...overrides
      }
    }
  };
}

databaseTest(
  "refund requests use the persisted PaymentIntent and are idempotent under concurrency",
  async () => {
    const prisma = require("../../src/lib/prisma");
    const { RefundError, requestRefund } = require("../../src/services/refund.service");
    const fixture = await createFixture(prisma);
    const calls = [];
    const stripeClient = stripeClientStub(calls);

    try {
      const idempotencyKey = randomUUID();
      const first = await requestRefund({
        orderPublicId: fixture.order.publicId,
        requestedByUserId: fixture.adminUser.id,
        idempotencyKey,
        amount: 200,
        reasonCode: "CUSTOMER_REQUEST",
        ipAddress: "127.0.0.1",
        prismaClient: prisma,
        stripeClient
      });
      const replay = await requestRefund({
        orderPublicId: fixture.order.publicId,
        requestedByUserId: fixture.adminUser.id,
        idempotencyKey,
        amount: 200,
        reasonCode: "CUSTOMER_REQUEST",
        ipAddress: "127.0.0.1",
        prismaClient: prisma,
        stripeClient
      });

      assert.equal(first.refund.status, "PENDING");
      assert.equal(replay.refund.id, first.refund.id);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].data.payment_intent, fixture.payment.providerPaymentId);
      assert.equal(calls[0].data.amount, 200);
      assert.match(calls[0].options.idempotencyKey, /^refund:/);

      const outcomes = await Promise.allSettled([
        requestRefund({
          orderPublicId: fixture.order.publicId,
          requestedByUserId: fixture.adminUser.id,
          idempotencyKey: randomUUID(),
          amount: 500,
          reasonCode: "CUSTOMER_REQUEST",
          ipAddress: "127.0.0.1",
          prismaClient: prisma,
          stripeClient
        }),
        requestRefund({
          orderPublicId: fixture.order.publicId,
          requestedByUserId: fixture.adminUser.id,
          idempotencyKey: randomUUID(),
          amount: 500,
          reasonCode: "CUSTOMER_REQUEST",
          ipAddress: "127.0.0.1",
          prismaClient: prisma,
          stripeClient
        })
      ]);
      assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
      const rejected = outcomes.find((outcome) => outcome.status === "rejected");
      assert.ok(rejected.reason instanceof RefundError);
      assert.equal(rejected.reason.code, "REFUND_AMOUNT_EXCEEDS_BALANCE");
      assert.equal(await prisma.refund.count({ where: { orderId: fixture.order.id } }), 2);
    } finally {
      await cleanup(prisma, fixture);
      await prisma.$disconnect();
    }
  }
);

databaseTest(
  "signed refund events apply partial then total refund exactly once and revoke rights",
  async () => {
    const prisma = require("../../src/lib/prisma");
    const { requestRefund } = require("../../src/services/refund.service");
    const { processStripeRefundEvent } = require("../../src/services/refund-finalization.service");
    const { revokeDownloadRights } = require("../../src/services/digital-delivery.service");
    const fixture = await createFixture(prisma);
    const stripeClient = stripeClientStub([]);

    try {
      const partialRequest = await requestRefund({
        orderPublicId: fixture.order.publicId,
        requestedByUserId: fixture.adminUser.id,
        idempotencyKey: randomUUID(),
        amount: 400,
        reasonCode: "CUSTOMER_REQUEST",
        ipAddress: "127.0.0.1",
        prismaClient: prisma,
        stripeClient
      });
      const partial = await prisma.refund.findUnique({
        where: { publicId: partialRequest.refund.id }
      });
      const partialEvent = refundEvent(fixture, partial, "refund.updated", "succeeded", {
        destination_details: { card: { reference: "safe-bank-reference" } }
      });
      const applied = await processStripeRefundEvent({ event: partialEvent, prismaClient: prisma });
      const replay = await processStripeRefundEvent({ event: partialEvent, prismaClient: prisma });
      assert.equal(applied.outcome, "applied");
      assert.equal(replay.duplicate, true);

      let payment = await prisma.payment.findUnique({ where: { id: fixture.payment.id } });
      let order = await prisma.order.findUnique({ where: { id: fixture.order.id } });
      let artwork = await prisma.artwork.findUnique({ where: { id: fixture.artwork.id } });
      let entitlement = await prisma.digitalEntitlement.findUnique({
        where: { orderItemId: fixture.order.items[0].id }
      });
      assert.equal(payment.status, "PARTIALLY_REFUNDED");
      assert.equal(payment.refundedAmount, 400);
      assert.equal(order.status, "PARTIALLY_REFUNDED");
      assert.equal(entitlement.status, "ACTIVE");
      assert.equal(artwork.licenseType, "EXCLUSIVE");
      assert.equal(artwork.saleStatus, "SOLD_OUT");
      assert.equal(artwork.isSold, true);
      assert.equal(artwork.stockQuantity, 0);

      const totalRequest = await requestRefund({
        orderPublicId: fixture.order.publicId,
        requestedByUserId: fixture.adminUser.id,
        idempotencyKey: randomUUID(),
        amount: 600,
        reasonCode: "CUSTOMER_REQUEST",
        ipAddress: "127.0.0.1",
        prismaClient: prisma,
        stripeClient
      });
      const total = await prisma.refund.findUnique({ where: { publicId: totalRequest.refund.id } });
      await processStripeRefundEvent({
        event: refundEvent(fixture, total, "refund.updated", "succeeded"),
        prismaClient: prisma
      });

      payment = await prisma.payment.findUnique({ where: { id: fixture.payment.id } });
      order = await prisma.order.findUnique({ where: { id: fixture.order.id } });
      const grantTask = await prisma.fulfillmentTask.findUnique({
        where: { taskKey: fixture.grantTask.taskKey }
      });
      const revokeTask = await prisma.fulfillmentTask.findUnique({
        where: { taskKey: `order:${fixture.order.publicId}:REVOKE_DOWNLOAD_RIGHTS` }
      });
      assert.equal(payment.status, "REFUNDED");
      assert.equal(payment.refundedAmount, 1000);
      assert.equal(order.status, "REFUNDED");
      assert.equal(grantTask.status, "CANCELED");
      assert.equal(revokeTask.status, "PENDING");

      await revokeDownloadRights({ task: revokeTask, prismaClient: prisma });
      entitlement = await prisma.digitalEntitlement.findUnique({
        where: { orderItemId: fixture.order.items[0].id }
      });
      artwork = await prisma.artwork.findUnique({ where: { id: fixture.artwork.id } });
      assert.equal(entitlement.status, "REVOKED");
      assert.equal(artwork.licenseType, "EXCLUSIVE");
      assert.equal(artwork.saleStatus, "SOLD_OUT");
      assert.equal(artwork.isSold, true);
      assert.equal(artwork.stockQuantity, 0);
      assert.equal(artwork.reservedQuantity, 0);

      await processStripeRefundEvent({
        event: refundEvent(fixture, total, "refund.created", "pending"),
        prismaClient: prisma
      });
      const afterOutOfOrderEvent = await prisma.refund.findUnique({ where: { id: total.id } });
      assert.equal(afterOutOfOrderEvent.status, "SUCCEEDED");
      assert.equal(afterOutOfOrderEvent.providerStatus, "succeeded");
    } finally {
      await cleanup(prisma, fixture);
      await prisma.$disconnect();
    }
  }
);

databaseTest("a failed refund keeps the paid order and informs the customer safely", async () => {
  const prisma = require("../../src/lib/prisma");
  const { requestRefund } = require("../../src/services/refund.service");
  const { processStripeRefundEvent } = require("../../src/services/refund-finalization.service");
  const fixture = await createFixture(prisma);

  try {
    const requested = await requestRefund({
      orderPublicId: fixture.order.publicId,
      requestedByUserId: fixture.adminUser.id,
      idempotencyKey: randomUUID(),
      amount: 300,
      reasonCode: "CUSTOMER_REQUEST",
      ipAddress: "127.0.0.1",
      prismaClient: prisma,
      stripeClient: stripeClientStub([])
    });
    const refund = await prisma.refund.findUnique({ where: { publicId: requested.refund.id } });
    await processStripeRefundEvent({
      event: refundEvent(fixture, refund, "refund.failed", "failed", {
        failure_reason: "lost_or_stolen_card"
      }),
      prismaClient: prisma
    });

    const failed = await prisma.refund.findUnique({ where: { id: refund.id } });
    const order = await prisma.order.findUnique({ where: { id: fixture.order.id } });
    const payment = await prisma.payment.findUnique({ where: { id: fixture.payment.id } });
    const notification = await prisma.fulfillmentTask.findUnique({
      where: { taskKey: `refund:${refund.publicId}:SEND_REFUND_STATUS:FAILED` }
    });
    assert.equal(failed.status, "FAILED");
    assert.equal(order.status, "PAID");
    assert.equal(payment.status, "SUCCEEDED");
    assert.equal(payment.refundedAmount, 0);
    assert.equal(notification.status, "PENDING");
  } finally {
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

databaseTest("a forged refund amount is quarantined without changing the order", async () => {
  const prisma = require("../../src/lib/prisma");
  const { requestRefund } = require("../../src/services/refund.service");
  const { processStripeRefundEvent } = require("../../src/services/refund-finalization.service");
  const fixture = await createFixture(prisma);

  try {
    const requested = await requestRefund({
      orderPublicId: fixture.order.publicId,
      requestedByUserId: fixture.adminUser.id,
      idempotencyKey: randomUUID(),
      amount: 300,
      reasonCode: "CUSTOMER_REQUEST",
      ipAddress: "127.0.0.1",
      prismaClient: prisma,
      stripeClient: stripeClientStub([])
    });
    const refund = await prisma.refund.findUnique({ where: { publicId: requested.refund.id } });
    const result = await processStripeRefundEvent({
      event: refundEvent(fixture, refund, "refund.updated", "succeeded", { amount: 301 }),
      prismaClient: prisma
    });

    const alert = await prisma.paymentOperatorAlert.findFirst({
      where: { orderId: fixture.order.id }
    });
    assert.equal(result.outcome, "review");
    assert.match(alert.code, /REFUND_AMOUNT_MISMATCH/);
    assert.equal((await prisma.refund.findUnique({ where: { id: refund.id } })).status, "PENDING");
    assert.equal(
      (await prisma.order.findUnique({ where: { id: fixture.order.id } })).status,
      "PAID"
    );
  } finally {
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

databaseTest("refund administration requires an admin, recent auth and CSRF", async () => {
  const jwt = require("jsonwebtoken");
  const app = require("../../src/app");
  const env = require("../../src/config/env");
  const prisma = require("../../src/lib/prisma");
  const fixture = await createFixture(prisma);
  let server;

  try {
    server = await startServer(app);
    const url = `http://127.0.0.1:${server.address().port}/api/v1/admin/orders/${fixture.order.publicId}/refunds`;
    const request = (cookie) =>
      fetch(url, {
        method: "POST",
        headers: { cookie, "content-type": "application/json", "idempotency-key": randomUUID() },
        body: JSON.stringify({ amount: 100, reason: "CUSTOMER_REQUEST" })
      });

    const buyerResponse = await request(sessionCookie(jwt, env, fixture.buyer));
    assert.equal(buyerResponse.status, 403);
    assert.equal((await buyerResponse.json()).code, "REFUND_FORBIDDEN");

    const now = Math.floor(Date.now() / 1000);
    const staleToken = jwt.sign(
      {
        sub: String(fixture.adminUser.id),
        email: fixture.adminUser.email,
        auth_time: now - 11 * 60,
        exp: now + 5 * 60
      },
      env.jwtSecret
    );
    const staleResponse = await request(`${env.sessionCookieName}=${staleToken}`);
    assert.equal(staleResponse.status, 403);
    assert.equal((await staleResponse.json()).code, "RECENT_AUTHENTICATION_REQUIRED");

    const noCsrfResponse = await request(sessionCookie(jwt, env, fixture.adminUser));
    assert.equal(noCsrfResponse.status, 403);
    assert.equal((await noCsrfResponse.json()).code, "CSRF_VALIDATION_FAILED");
    assert.equal(noCsrfResponse.headers.get("cache-control"), "private, no-store");
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

function sessionCookie(jwt, env, user) {
  const token = jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      auth_time: Math.floor(Date.now() / 1000)
    },
    env.jwtSecret,
    { expiresIn: "5m" }
  );
  return `${env.sessionCookieName}=${token}`;
}

function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

async function createFixture(prisma) {
  const marker = randomUUID();
  const [artistUser, buyer, adminUser] = await Promise.all([
    prisma.user.create({
      data: { email: `refund-artist-${marker}@test.local`, verified: true, isActive: true }
    }),
    prisma.user.create({
      data: { email: `refund-buyer-${marker}@test.local`, verified: true, isActive: true }
    }),
    prisma.user.create({
      data: {
        email: `refund-admin-${marker}@test.local`,
        verified: true,
        isActive: true,
        role: "ADMIN"
      }
    })
  ]);
  await prisma.admin.create({ data: { userId: adminUser.id } });
  const artist = await prisma.artist.create({
    data: { userId: artistUser.id, displayName: "Refund Artist" }
  });
  const artwork = await prisma.artwork.create({
    data: {
      artistId: artist.id,
      title: `Refund artwork ${marker}`,
      priceAmount: 1000,
      licenseType: "EXCLUSIVE",
      saleStatus: "SOLD_OUT",
      stockQuantity: 0,
      reservedQuantity: 0,
      isSold: true
    }
  });
  const cart = await prisma.cart.create({ data: { userId: buyer.id } });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      cartId: cart.id,
      cartVersion: 1,
      pricingFingerprint: "f".repeat(64),
      status: "PAID",
      subtotalAmount: 1000,
      totalAmount: 1000,
      ...franceB2COrderFields({ buyer, grossAmount: 1000 }),
      paidAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      items: {
        create: {
          artworkId: artwork.id,
          artworkTitle: artwork.title,
          artistName: artist.displayName,
          licenseType: "EXCLUSIVE",
          unitAmount: 1000,
          subtotalAmount: 1000,
          ...franceB2COrderItemFields({ grossAmount: 1000 })
        }
      }
    },
    include: { items: true }
  });
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      providerPaymentId: `pi_refund_${marker}`,
      providerStatus: "succeeded",
      amount: 1000,
      status: "SUCCEEDED",
      succeededAt: new Date()
    }
  });
  const grantTask = await prisma.fulfillmentTask.create({
    data: {
      orderId: order.id,
      taskType: "GRANT_DOWNLOAD_RIGHTS",
      taskKey: `order:${order.publicId}:GRANT_DOWNLOAD_RIGHTS`
    }
  });
  const entitlement = await prisma.digitalEntitlement.create({
    data: {
      orderId: order.id,
      orderItemId: order.items[0].id,
      userId: buyer.id,
      artworkId: artwork.id,
      sourceTaskKey: grantTask.taskKey
    }
  });
  return {
    marker,
    userIds: [artistUser.id, buyer.id, adminUser.id],
    artist,
    artwork,
    cart,
    order,
    payment,
    grantTask,
    entitlement,
    adminUser,
    buyer
  };
}

async function cleanup(prisma, fixture) {
  await prisma.stripeWebhookEvent.deleteMany({
    where: { paymentId: fixture.payment.id }
  });
  await prisma.financialTransition.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.paymentOperatorAlert.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.fulfillmentTask.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.digitalEntitlement.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.auditLog.deleteMany({ where: { userId: fixture.adminUser.id } });
  await prisma.refund.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.payment.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.order.delete({ where: { id: fixture.order.id } });
  await prisma.cart.delete({ where: { id: fixture.cart.id } });
  await prisma.artwork.delete({ where: { id: fixture.artwork.id } });
  await prisma.artist.delete({ where: { id: fixture.artist.id } });
  await prisma.admin.deleteMany({ where: { userId: fixture.adminUser.id } });
  await prisma.user.deleteMany({ where: { id: { in: fixture.userIds } } });
}
