const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { deriveIdempotencyKey } = require("../../src/services/checkout.service");

test("checkout idempotency keys are deterministic and scoped to the user", () => {
  const clientKey = randomUUID();
  const first = deriveIdempotencyKey(10, clientKey);
  const repeated = deriveIdempotencyKey(10, clientKey);
  const otherUser = deriveIdempotencyKey(11, clientKey);

  assert.equal(first, repeated);
  assert.notEqual(first, otherUser);
  assert.match(first, /^checkout_[a-f0-9]{64}$/);
  assert.equal(first.includes(clientKey), false);
});
