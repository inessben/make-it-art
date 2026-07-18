const test = require("node:test");
const assert = require("node:assert/strict");

const {
  startCheckoutExpirationScheduler
} = require("../../src/jobs/checkout-expiration.scheduler");

test("the expiration scheduler never overlaps two Stripe cancellation sweeps", async () => {
  let concurrent = 0;
  let maximumConcurrent = 0;
  let calls = 0;
  let resolveSecondCall;
  const secondCall = new Promise((resolve) => {
    resolveSecondCall = resolve;
  });
  const stop = startCheckoutExpirationScheduler({
    intervalMs: 5,
    sweep: async () => {
      calls += 1;
      if (calls === 2) resolveSecondCall();
      concurrent += 1;
      maximumConcurrent = Math.max(maximumConcurrent, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 20));
      concurrent -= 1;
      return { canceled: 0, protected: 0, failed: 0 };
    }
  });

  let timeout;
  await Promise.race([
    secondCall,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error("second sweep did not start")), 500);
    })
  ]);
  clearTimeout(timeout);
  stop();
  assert.ok(calls >= 2);
  assert.equal(maximumConcurrent, 1);
});
