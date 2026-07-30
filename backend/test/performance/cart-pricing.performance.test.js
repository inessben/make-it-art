const assert = require("node:assert/strict");
const { test } = require("node:test");
const { buildCartSummary } = require("../../src/domain/cart-pricing");

function buildLargeCart(itemCount) {
  return {
    version: 12,
    updatedAt: new Date("2026-07-20T10:00:00.000Z"),
    items: Array.from({ length: itemCount }, (_, index) => ({
      artworkId: index + 1,
      quantity: (index % 3) + 1,
      artwork: {
        id: index + 1,
        title: `Perf artwork ${index + 1}`,
        priceAmount: 1000 + index * 10,
        currency: "EUR",
        licenseType: index % 2 === 0 ? "COMMERCIAL" : "PERSONAL",
        visibility: "PUBLISHED",
        saleStatus: "AVAILABLE",
        stockQuantity: 20,
        reservedQuantity: 0,
        storageProvider: "local",
        artist: {
          displayName: `Artist ${index + 1}`,
          userId: 10_000 + index,
          user: { id: 10_000 + index, username: `artist_${index}` }
        }
      }
    }))
  };
}

test("buildCartSummary stays within a latency budget for large carts", () => {
  const cart = buildLargeCart(250);
  const iterations = 40;
  const durations = [];

  // Warm-up to reduce JIT noise.
  buildCartSummary(cart, { buyerUserId: 1 });

  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now();
    const summary = buildCartSummary(cart, { buyerUserId: 1 });
    durations.push(performance.now() - startedAt);
    assert.equal(
      summary.itemCount,
      cart.items.reduce((total, item) => total + item.quantity, 0)
    );
    assert.equal(summary.payable, true);
    assert.match(summary.pricingFingerprint, /^[a-f0-9]{64}$/);
  }

  durations.sort((left, right) => left - right);
  const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
  const average = durations.reduce((total, value) => total + value, 0) / durations.length;

  assert.ok(
    p95 < 80,
    `expected cart-pricing p95 < 80ms for 250 items, got ${p95.toFixed(2)}ms (avg ${average.toFixed(2)}ms)`
  );
});

test("buildCartSummary throughput exceeds a minimum ops/sec floor", () => {
  const cart = buildLargeCart(50);
  const budgetMs = 250;
  let operations = 0;
  const startedAt = performance.now();

  while (performance.now() - startedAt < budgetMs) {
    const summary = buildCartSummary(cart, { buyerUserId: 42 });
    assert.equal(summary.payable, true);
    operations += 1;
  }

  const elapsedMs = performance.now() - startedAt;
  const opsPerSecond = (operations / elapsedMs) * 1000;

  assert.ok(
    opsPerSecond > 80,
    `expected > 80 cart summaries/sec, got ${opsPerSecond.toFixed(1)} ops/sec over ${elapsedMs.toFixed(0)}ms`
  );
});
