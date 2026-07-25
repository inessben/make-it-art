const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createDefaultHandlers,
  retryDelayMs,
  stableMessageId
} = require("../../src/services/fulfillment-task.service");

function taskFixture(overrides = {}) {
  return {
    id: 12,
    taskType: "SEND_PAYMENT_CONFIRMATION",
    taskKey: "order:75ad34cf-5ee4-4838-b36f-fac65a40f1e9:SEND_PAYMENT_CONFIRMATION",
    order: {
      publicId: "75ad34cf-5ee4-4838-b36f-fac65a40f1e9",
      status: "PAID",
      user: { email: "buyer@example.test", username: "Buyer" },
      refunds: []
    },
    ...overrides
  };
}

test("retry delay uses a bounded exponential backoff", () => {
  assert.equal(retryDelayMs(1, 1000, 10000), 1000);
  assert.equal(retryDelayMs(2, 1000, 10000), 2000);
  assert.equal(retryDelayMs(5, 1000, 10000), 10000);
  assert.equal(retryDelayMs(50, 1000, 10000), 10000);
});

test("the same task key always produces the same opaque Message-ID", () => {
  const taskKey = taskFixture().taskKey;
  const first = stableMessageId(taskKey);
  const second = stableMessageId(taskKey);

  assert.equal(first, second);
  assert.match(first, /^<[a-f0-9]{64}\.fulfillment@make-it-art\.local>$/);
  assert.doesNotMatch(first, /75ad34cf/);
});

test("the payment confirmation handler sends only persisted order data", async () => {
  let input;
  const handlers = createDefaultHandlers({
    paymentConfirmationSender: async (message) => {
      input = message;
      return { messageId: message.messageId };
    }
  });

  const result = await handlers.SEND_PAYMENT_CONFIRMATION({ task: taskFixture() });

  assert.equal(input.to, "buyer@example.test");
  assert.equal(input.username, "Buyer");
  assert.equal(input.orderPublicId, "75ad34cf-5ee4-4838-b36f-fac65a40f1e9");
  assert.equal(result.effectReference, input.messageId);
});

test("a fully refunded order cancels a pending payment confirmation", async () => {
  let sent = false;
  const handlers = createDefaultHandlers({
    paymentConfirmationSender: async () => {
      sent = true;
    }
  });

  await assert.rejects(
    () =>
      handlers.SEND_PAYMENT_CONFIRMATION({
        task: taskFixture({
          order: { ...taskFixture().order, status: "REFUNDED" }
        })
      }),
    (error) => error.code === "PAYMENT_CONFIRMATION_CANCELED" && error.canceled === true
  );
  assert.equal(sent, false);
});

test("the refund handler validates the refund id and terminal status from the task key", async () => {
  const refundPublicId = "2b8b0e03-c3a4-4a0d-aa1b-89ff86922a52";
  let input;
  const handlers = createDefaultHandlers({
    refundStatusSender: async (message) => {
      input = message;
      return { messageId: message.messageId };
    }
  });
  const task = taskFixture({
    taskType: "SEND_REFUND_STATUS",
    taskKey: `refund:${refundPublicId}:SEND_REFUND_STATUS:SUCCEEDED`,
    order: {
      ...taskFixture().order,
      status: "PARTIALLY_REFUNDED",
      refunds: [
        {
          publicId: refundPublicId,
          status: "SUCCEEDED",
          amount: 500,
          currency: "EUR",
          providerReference: "refund-reference"
        }
      ]
    }
  });

  await handlers.SEND_REFUND_STATUS({ task });

  assert.equal(input.refundPublicId, refundPublicId);
  assert.equal(input.amount, 500);
  assert.equal(input.status, "SUCCEEDED");
});
