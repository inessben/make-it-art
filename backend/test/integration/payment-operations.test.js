const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { franceB2COrderFields } = require("../helpers/commerce-fixture");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;
const TEST_NOW = new Date(Date.now() + 24 * 60 * 60 * 1000);

databaseTest("payment anomalies are minimal and every recovery action is audited", async () => {
  const prisma = require("../../src/lib/prisma");
  const {
    listPaymentAnomalies,
    reconcileOrderWithStripe,
    replayStripeWebhook,
    requeueFulfillmentTask,
    resolveOperatorAlert
  } = require("../../src/services/payment-operations.service");
  const fixture = await createFixture(prisma);

  try {
    const anomalies = await listPaymentAnomalies({ prismaClient: prisma, now: TEST_NOW });
    const webhook = anomalies.webhooks.find((entry) => entry.id === fixture.webhook.id);
    const task = anomalies.tasks.find((entry) => entry.id === fixture.task.id);
    const order = anomalies.orders.find((entry) => entry.id === fixture.order.publicId);
    const alert = anomalies.alerts.find((entry) => entry.id === fixture.alert.id);

    assert.equal(webhook.replayable, true);
    assert.equal(task.replayable, true);
    assert.equal(order.reconcileable, true);
    assert.equal(alert.status, "OPEN");
    assert.doesNotMatch(
      JSON.stringify({ webhook, task, order, alert }),
      /client_secret|providerPaymentId|email|card|address/i
    );

    const requeued = await requeueFulfillmentTask({
      taskId: fixture.task.id,
      requestedByUserId: fixture.adminUser.id,
      ipAddress: "127.0.0.1",
      prismaClient: prisma,
      now: TEST_NOW
    });
    assert.equal(requeued.queued, true);
    assert.equal(requeued.task.status, "PENDING");

    let retrievedEventId;
    let processedEvent;
    const replayed = await replayStripeWebhook({
      eventId: fixture.webhook.eventId,
      requestedByUserId: fixture.adminUser.id,
      ipAddress: "127.0.0.1",
      prismaClient: prisma,
      stripeClient: {
        events: {
          async retrieve(eventId) {
            retrievedEventId = eventId;
            return {
              id: eventId,
              type: fixture.webhook.eventType,
              livemode: false,
              data: { object: { id: fixture.payment.providerPaymentId } }
            };
          }
        }
      },
      eventProcessor: async ({ event }) => {
        processedEvent = event;
        return { outcome: "applied" };
      },
      expectedLivemode: false
    });
    assert.equal(retrievedEventId, fixture.webhook.eventId);
    assert.equal(processedEvent.data.object.id, fixture.payment.providerPaymentId);
    assert.equal(replayed.replayed, true);

    let retrievedPaymentIntentId;
    let reconciliationInput;
    const reconciled = await reconcileOrderWithStripe({
      orderPublicId: fixture.order.publicId,
      requestedByUserId: fixture.adminUser.id,
      ipAddress: "127.0.0.1",
      prismaClient: prisma,
      stripeClient: {
        paymentIntents: {
          async retrieve(paymentIntentId) {
            retrievedPaymentIntentId = paymentIntentId;
            return { id: paymentIntentId, status: "succeeded", livemode: false };
          }
        }
      },
      reconciler: async (input) => {
        reconciliationInput = input;
        return { reconciled: true, eventType: "payment_intent.succeeded", result: {} };
      },
      expectedLivemode: false
    });
    assert.equal(retrievedPaymentIntentId, fixture.payment.providerPaymentId);
    assert.equal(reconciliationInput.localPaymentStatus, "SUCCEEDED");
    assert.equal(reconciled.reconciled, true);

    await assert.rejects(
      () =>
        reconcileOrderWithStripe({
          orderPublicId: fixture.order.publicId,
          requestedByUserId: fixture.adminUser.id,
          ipAddress: "127.0.0.1",
          prismaClient: prisma,
          stripeClient: {
            paymentIntents: {
              async retrieve(paymentIntentId) {
                return { id: paymentIntentId, status: "succeeded", livemode: false };
              }
            }
          },
          reconciler: async () => {
            throw new Error("must not reconcile a payment from another mode");
          },
          expectedLivemode: true
        }),
      (error) => error.code === "PAYMENT_MODE_MISMATCH"
    );

    await assert.rejects(
      () =>
        resolveOperatorAlert({
          alertId: fixture.alert.id,
          resolutionCode: "RECONCILED",
          requestedByUserId: fixture.adminUser.id,
          ipAddress: "127.0.0.1",
          prismaClient: prisma
        }),
      (error) => error.code === "PAYMENT_STATE_STILL_INCOHERENT"
    );

    await prisma.order.update({ where: { id: fixture.order.id }, data: { status: "PAID" } });
    const resolved = await resolveOperatorAlert({
      alertId: fixture.alert.id,
      resolutionCode: "RECONCILED",
      requestedByUserId: fixture.adminUser.id,
      ipAddress: "127.0.0.1",
      prismaClient: prisma,
      now: TEST_NOW
    });
    assert.equal(resolved.resolved, true);

    const auditActions = (
      await prisma.auditLog.findMany({ where: { userId: fixture.adminUser.id } })
    ).map((entry) => entry.action);
    assert.ok(auditActions.includes("FULFILLMENT_TASK_REPLAY_REQUESTED"));
    assert.ok(auditActions.includes("STRIPE_WEBHOOK_REPLAYED"));
    assert.ok(auditActions.includes("PAYMENT_ORDER_RECONCILIATION_REQUESTED"));
    assert.ok(auditActions.includes("PAYMENT_ALERT_RESOLVED_RECONCILED"));
  } finally {
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

databaseTest("payment recovery routes require admin, recent auth and CSRF", async () => {
  const jwt = require("jsonwebtoken");
  const app = require("../../src/app");
  const env = require("../../src/config/env");
  const prisma = require("../../src/lib/prisma");
  const fixture = await createFixture(prisma);
  let server;

  try {
    server = await startServer(app);
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const anomaliesUrl = `${baseUrl}/api/v1/admin/payments/anomalies`;
    const replayUrl = `${anomaliesUrl}/tasks/${fixture.task.id}/replay`;

    assert.equal((await fetch(anomaliesUrl)).status, 401);
    assert.equal(
      (await fetch(anomaliesUrl, { headers: { cookie: sessionCookie(jwt, env, fixture.buyer) } }))
        .status,
      403
    );
    const adminCookie = sessionCookie(jwt, env, fixture.adminUser);
    const listResponse = await fetch(anomaliesUrl, { headers: { cookie: adminCookie } });
    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.headers.get("cache-control"), "private, no-store");

    const staleCookie = sessionCookie(jwt, env, fixture.adminUser, 11 * 60);
    const staleResponse = await fetch(replayUrl, {
      method: "POST",
      headers: { cookie: staleCookie, "content-type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(staleResponse.status, 403);
    assert.equal((await staleResponse.json()).code, "RECENT_AUTHENTICATION_REQUIRED");

    const noCsrfResponse = await fetch(replayUrl, {
      method: "POST",
      headers: { cookie: adminCookie, "content-type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(noCsrfResponse.status, 403);
    assert.equal((await noCsrfResponse.json()).code, "CSRF_VALIDATION_FAILED");

    const csrfResponse = await fetch(`${baseUrl}/api/v1/security/csrf-token`, {
      headers: { cookie: adminCookie }
    });
    const csrfCookie = csrfResponse.headers.get("set-cookie").split(";")[0];
    const { csrfToken } = await csrfResponse.json();
    const validResponse = await fetch(replayUrl, {
      method: "POST",
      headers: {
        cookie: `${adminCookie}; ${csrfCookie}`,
        "content-type": "application/json",
        "x-csrf-token": csrfToken
      },
      body: JSON.stringify({})
    });
    assert.equal(validResponse.status, 202);
    assert.ok(
      await prisma.auditLog.findFirst({
        where: {
          userId: fixture.adminUser.id,
          action: "FULFILLMENT_TASK_REPLAY_REQUESTED",
          entityId: String(fixture.task.id)
        }
      })
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

function sessionCookie(jwt, env, user, ageSeconds = 0) {
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      auth_time: now - ageSeconds,
      exp: now + 5 * 60
    },
    env.jwtSecret
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
  const [buyer, adminUser] = await Promise.all([
    prisma.user.create({
      data: { email: `operations-buyer-${marker}@test.local`, verified: true, isActive: true }
    }),
    prisma.user.create({
      data: {
        email: `operations-admin-${marker}@test.local`,
        verified: true,
        isActive: true,
        role: "ADMIN"
      }
    })
  ]);
  await prisma.admin.create({ data: { userId: adminUser.id } });
  const cart = await prisma.cart.create({ data: { userId: buyer.id } });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      cartId: cart.id,
      cartVersion: 1,
      pricingFingerprint: "f".repeat(64),
      status: "PAYMENT_REVIEW",
      subtotalAmount: 1000,
      totalAmount: 1000,
      ...franceB2COrderFields({ buyer, grossAmount: 1000 }),
      currency: "EUR",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });
  const providerPaymentId = `pi_operations_${marker.replaceAll("-", "")}`;
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      providerPaymentId,
      providerStatus: "succeeded",
      amount: 1000,
      currency: "EUR",
      status: "SUCCEEDED",
      succeededAt: new Date()
    }
  });
  const task = await prisma.fulfillmentTask.create({
    data: {
      orderId: order.id,
      taskType: "GRANT_DOWNLOAD_RIGHTS",
      taskKey: `order:${order.publicId}:GRANT_DOWNLOAD_RIGHTS`,
      status: "FAILED",
      attemptCount: 5,
      lastErrorCode: "FULFILLMENT_HANDLER_NOT_CONFIGURED",
      processedAt: new Date()
    }
  });
  const webhook = await prisma.stripeWebhookEvent.create({
    data: {
      eventId: `evt_operations_${marker.replaceAll("-", "")}`,
      eventType: "payment_intent.succeeded",
      stripeObjectId: providerPaymentId,
      paymentId: payment.id,
      status: "FAILED",
      attemptCount: 1,
      lastErrorCode: "PAYMENT_EVENT_PROCESSING_FAILED"
    }
  });
  const alert = await prisma.paymentOperatorAlert.create({
    data: {
      orderId: order.id,
      paymentId: payment.id,
      stripeEventId: webhook.eventId,
      stripeObjectId: providerPaymentId,
      code: "PAYMENT_AMOUNT_MISMATCH"
    }
  });
  return { buyer, adminUser, cart, order, payment, task, webhook, alert };
}

async function cleanup(prisma, fixture) {
  await prisma.auditLog.deleteMany({
    where: { userId: { in: [fixture.buyer.id, fixture.adminUser.id] } }
  });
  await prisma.paymentOperatorAlert.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.stripeWebhookEvent.deleteMany({ where: { paymentId: fixture.payment.id } });
  await prisma.fulfillmentTask.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.payment.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.order.delete({ where: { id: fixture.order.id } });
  await prisma.cart.delete({ where: { id: fixture.cart.id } });
  await prisma.admin.deleteMany({ where: { userId: fixture.adminUser.id } });
  await prisma.user.deleteMany({ where: { id: { in: [fixture.buyer.id, fixture.adminUser.id] } } });
}
