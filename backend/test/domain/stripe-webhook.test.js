const test = require("node:test");
const assert = require("node:assert/strict");
const Stripe = require("stripe");

const {
  SUPPORTED_STRIPE_EVENT_TYPES,
  StripeWebhookError,
  receiveStripeWebhook
} = require("../../src/services/stripe-webhook.service");

const webhookSecret = "whsec_test_webhook_secret";
const stripeClient = new Stripe("sk_test_webhook_signature_tests");

function eventPayload(overrides = {}) {
  return JSON.stringify({
    id: "evt_test_signed",
    object: "event",
    type: "payment_intent.processing",
    data: { object: { id: "pi_test_signed" } },
    ...overrides
  });
}

function sign(payload, timestamp) {
  return stripeClient.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
    ...(timestamp ? { timestamp } : {})
  });
}

function createPrismaStub() {
  const rows = new Map();

  return {
    rows,
    stripeWebhookEvent: {
      async create({ data }) {
        if (rows.has(data.eventId)) {
          const error = new Error("Unique constraint failed");
          error.code = "P2002";
          throw error;
        }

        rows.set(data.eventId, { ...data });
        return data;
      }
    }
  };
}

function createProcessorStub() {
  const eventIds = new Set();

  return async ({ event, prismaClient }) => {
    const duplicate = eventIds.has(event.id);
    eventIds.add(event.id);
    if (!duplicate) {
      await prismaClient.stripeWebhookEvent.create({
        data: {
          eventId: event.id,
          eventType: event.type,
          stripeObjectId: event.data.object.id
        }
      });
    }
    return { duplicate, outcome: duplicate ? "already_processed" : "recorded" };
  };
}

test("a signed supported event is durably recorded from its exact raw bytes", async () => {
  const payload = eventPayload();
  const prismaClient = createPrismaStub();
  const processPaymentEvent = createProcessorStub();
  const result = await receiveStripeWebhook({
    rawBody: Buffer.from(payload),
    signature: sign(payload),
    stripeClient,
    webhookSecret,
    prismaClient,
    processPaymentEvent
  });

  assert.equal(result.duplicate, false);
  assert.deepEqual(prismaClient.rows.get("evt_test_signed"), {
    eventId: "evt_test_signed",
    eventType: "payment_intent.processing",
    stripeObjectId: "pi_test_signed"
  });
});

test("missing, invalid, expired, and payload-mismatched signatures mutate nothing", async () => {
  const payload = eventPayload();
  const cases = [
    undefined,
    "t=1,v1=invalid",
    sign(payload, Math.floor(Date.now() / 1000) - 301),
    sign(`${payload} `)
  ];

  for (const signature of cases) {
    const prismaClient = createPrismaStub();
    await assert.rejects(
      receiveStripeWebhook({
        rawBody: Buffer.from(payload),
        signature,
        stripeClient,
        webhookSecret,
        prismaClient
      }),
      (error) => error instanceof StripeWebhookError && error.status === 400
    );
    assert.equal(prismaClient.rows.size, 0);
  }
});

test("the same Stripe event id is acknowledged without a second durable effect", async () => {
  const payload = eventPayload();
  const prismaClient = createPrismaStub();
  const input = {
    rawBody: Buffer.from(payload),
    signature: sign(payload),
    stripeClient,
    webhookSecret,
    prismaClient,
    processPaymentEvent: createProcessorStub()
  };

  const first = await receiveStripeWebhook(input);
  const replay = await receiveStripeWebhook(input);

  assert.equal(first.duplicate, false);
  assert.equal(replay.duplicate, true);
  assert.equal(prismaClient.rows.size, 1);
});

test("signed refund events are dispatched to the refund processor", async () => {
  const payload = eventPayload({
    id: "evt_refund_signed",
    type: "refund.updated",
    data: { object: { id: "re_test_signed", status: "succeeded" } }
  });
  let refundCalls = 0;
  const result = await receiveStripeWebhook({
    rawBody: Buffer.from(payload),
    signature: sign(payload),
    stripeClient,
    webhookSecret,
    prismaClient: createPrismaStub(),
    processPaymentEvent: async () => {
      throw new Error("payment processor must not receive refund events");
    },
    processRefundEvent: async () => {
      refundCalls += 1;
      return { duplicate: false, outcome: "applied" };
    }
  });

  assert.equal(refundCalls, 1);
  assert.equal(result.outcome, "applied");
});

test("only the minimal payment and refund lifecycle event set is persisted", async () => {
  assert.deepEqual([...SUPPORTED_STRIPE_EVENT_TYPES].sort(), [
    "payment_intent.canceled",
    "payment_intent.payment_failed",
    "payment_intent.processing",
    "payment_intent.succeeded",
    "refund.created",
    "refund.failed",
    "refund.updated"
  ]);

  const payload = eventPayload({ id: "evt_ignored", type: "customer.created" });
  const prismaClient = createPrismaStub();
  const result = await receiveStripeWebhook({
    rawBody: Buffer.from(payload),
    signature: sign(payload),
    stripeClient,
    webhookSecret,
    prismaClient
  });

  assert.equal(result.ignored, true);
  assert.equal(prismaClient.rows.size, 0);
});
