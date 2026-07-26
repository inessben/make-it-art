const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { franceB2COrderFields } = require("../helpers/commerce-fixture");

const databaseTest = process.env.DATABASE_URL ? test : test.skip;
const TEST_NOW = new Date(Date.now() + 24 * 60 * 60 * 1000);

databaseTest("a fulfillment task is claimed and completed once", async () => {
  const prisma = require("../../src/lib/prisma");
  const { processFulfillmentBatch } = require("../../src/services/fulfillment-task.service");
  const fixture = await createFixture(prisma);
  let calls = 0;

  try {
    const summary = await processFulfillmentBatch({
      prismaClient: prisma,
      handlers: {
        SEND_PAYMENT_CONFIRMATION: async () => {
          calls += 1;
          return { effectReference: "message-provider-reference" };
        }
      },
      alertSender: async () => {},
      logger: () => {},
      batchSize: 1,
      now: TEST_NOW,
      taskId: fixture.task.id
    });
    const task = await prisma.fulfillmentTask.findUnique({ where: { id: fixture.task.id } });

    assert.equal(summary.completed, 1);
    assert.equal(calls, 1);
    assert.equal(task.status, "COMPLETED");
    assert.equal(task.attemptCount, 1);
    assert.equal(task.effectReference, "message-provider-reference");
    assert.equal(task.leaseToken, null);
    assert.ok(task.processedAt);
  } finally {
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

databaseTest("two workers cannot execute the same task concurrently", async () => {
  const prisma = require("../../src/lib/prisma");
  const { processFulfillmentBatch } = require("../../src/services/fulfillment-task.service");
  const fixture = await createFixture(prisma);
  let calls = 0;
  let releaseHandler;
  let notifyStarted;
  const started = new Promise((resolve) => {
    notifyStarted = resolve;
  });
  const blocker = new Promise((resolve) => {
    releaseHandler = resolve;
  });
  const options = {
    prismaClient: prisma,
    handlers: {
      SEND_PAYMENT_CONFIRMATION: async () => {
        calls += 1;
        notifyStarted();
        await blocker;
        return { effectReference: "one-message" };
      }
    },
    alertSender: async () => {},
    logger: () => {},
    batchSize: 1,
    now: TEST_NOW,
    taskId: fixture.task.id
  };

  try {
    const firstWorker = processFulfillmentBatch(options);
    await started;
    const secondWorker = processFulfillmentBatch(options);
    await secondWorker;
    releaseHandler();
    await firstWorker;

    const task = await prisma.fulfillmentTask.findUnique({ where: { id: fixture.task.id } });
    assert.equal(calls, 1);
    assert.equal(task.status, "COMPLETED");
    assert.equal(task.attemptCount, 1);
  } finally {
    releaseHandler();
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

databaseTest("a transient failure is retried with backoff and later completes", async () => {
  const prisma = require("../../src/lib/prisma");
  const { processFulfillmentBatch } = require("../../src/services/fulfillment-task.service");
  const fixture = await createFixture(prisma);
  let shouldFail = true;
  const options = {
    prismaClient: prisma,
    handlers: {
      SEND_PAYMENT_CONFIRMATION: async () => {
        if (shouldFail) {
          const error = new Error("temporary SMTP failure");
          error.code = "SMTP_TEMPORARY_FAILURE";
          throw error;
        }
        return { effectReference: "retried-message" };
      }
    },
    alertSender: async () => {},
    logger: () => {},
    batchSize: 1,
    baseDelayMs: 1000,
    now: TEST_NOW,
    taskId: fixture.task.id
  };

  try {
    const first = await processFulfillmentBatch(options);
    let task = await prisma.fulfillmentTask.findUnique({ where: { id: fixture.task.id } });

    assert.equal(first.retried, 1);
    assert.equal(task.status, "PENDING");
    assert.equal(task.attemptCount, 1);
    assert.equal(task.lastErrorCode, "SMTP_TEMPORARY_FAILURE");
    assert.ok(task.availableAt > new Date());

    shouldFail = false;
    const second = await processFulfillmentBatch({ ...options, now: task.availableAt });
    task = await prisma.fulfillmentTask.findUnique({ where: { id: fixture.task.id } });

    assert.equal(second.completed, 1);
    assert.equal(task.status, "COMPLETED");
    assert.equal(task.attemptCount, 2);
  } finally {
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

databaseTest("an expired lease is reclaimed after a worker crash", async () => {
  const prisma = require("../../src/lib/prisma");
  const { processFulfillmentBatch } = require("../../src/services/fulfillment-task.service");
  const fixture = await createFixture(prisma, {
    status: "PROCESSING",
    attemptCount: 1,
    lockedAt: new Date(TEST_NOW.getTime() - 10 * 60 * 1000),
    leaseToken: "abandoned-worker"
  });

  try {
    const summary = await processFulfillmentBatch({
      prismaClient: prisma,
      handlers: {
        SEND_PAYMENT_CONFIRMATION: async () => ({ effectReference: "recovered-message" })
      },
      alertSender: async () => {},
      logger: () => {},
      batchSize: 1,
      leaseMs: 1000,
      now: TEST_NOW,
      taskId: fixture.task.id
    });
    const task = await prisma.fulfillmentTask.findUnique({ where: { id: fixture.task.id } });

    assert.equal(summary.completed, 1);
    assert.equal(task.status, "COMPLETED");
    assert.equal(task.attemptCount, 2);
    assert.equal(task.effectReference, "recovered-message");
  } finally {
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

databaseTest("an unconfigured known task fails once and raises an aggregate alert", async () => {
  const prisma = require("../../src/lib/prisma");
  const { processFulfillmentBatch } = require("../../src/services/fulfillment-task.service");
  const fixture = await createFixture(prisma, { taskType: "GRANT_DOWNLOAD_RIGHTS" });
  const alerts = [];

  try {
    const summary = await processFulfillmentBatch({
      prismaClient: prisma,
      handlers: {},
      alertSender: async (alert) => alerts.push(alert),
      logger: () => {},
      batchSize: 1,
      now: TEST_NOW,
      taskId: fixture.task.id
    });
    const task = await prisma.fulfillmentTask.findUnique({ where: { id: fixture.task.id } });

    assert.equal(summary.failed, 1);
    assert.equal(task.status, "FAILED");
    assert.equal(task.lastErrorCode, "FULFILLMENT_HANDLER_NOT_CONFIGURED");
    assert.deepEqual(alerts, [{ code: "FULFILLMENT_TASK_FAILED", count: 1 }]);
  } finally {
    await cleanup(prisma, fixture);
    await prisma.$disconnect();
  }
});

async function createFixture(prisma, taskOverrides = {}) {
  const marker = randomUUID();
  const user = await prisma.user.create({
    data: {
      email: `fulfillment-${marker}@test.local`,
      username: "Fulfillment buyer",
      isActive: true,
      verified: true
    }
  });
  const cart = await prisma.cart.create({ data: { userId: user.id } });
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      cartId: cart.id,
      cartVersion: 1,
      pricingFingerprint: "f".repeat(64),
      status: "PAID",
      subtotalAmount: 1000,
      totalAmount: 1000,
      ...franceB2COrderFields({ buyer: user, grossAmount: 1000 }),
      currency: "EUR",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      paidAt: new Date()
    }
  });
  const taskType = taskOverrides.taskType || "SEND_PAYMENT_CONFIRMATION";
  const task = await prisma.fulfillmentTask.create({
    data: {
      orderId: order.id,
      taskType,
      taskKey: `order:${order.publicId}:${taskType}`,
      availableAt: TEST_NOW,
      ...taskOverrides
    }
  });
  return { user, cart, order, task };
}

async function cleanup(prisma, fixture) {
  await prisma.fulfillmentTask.deleteMany({ where: { orderId: fixture.order.id } });
  await prisma.order.delete({ where: { id: fixture.order.id } });
  await prisma.cart.delete({ where: { id: fixture.cart.id } });
  await prisma.user.delete({ where: { id: fixture.user.id } });
}
