const test = require("node:test");
const assert = require("node:assert/strict");

const {
  startCheckoutExpirationScheduler
} = require("../../src/jobs/checkout-expiration.scheduler");

test("the expiration scheduler never overlaps two Stripe cancellation sweeps", async () => {
  let concurrent = 0;
  let maximumConcurrent = 0;
  let calls = 0;
  const stop = startCheckoutExpirationScheduler({
    intervalMs: 5,
    sweep: async () => {
      calls += 1;
      concurrent += 1;
      maximumConcurrent = Math.max(maximumConcurrent, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 20));
      concurrent -= 1;
      return { canceled: 0, protected: 0, failed: 0 };
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 55));
  stop();
  assert.ok(calls >= 2);
  assert.equal(maximumConcurrent, 1);
});
