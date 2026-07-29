const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");
const healthRoutes = require("../../src/routes/health.routes");

function percentile(sortedValues, ratio) {
  if (sortedValues.length === 0) {
    return 0;
  }
  const index = Math.min(sortedValues.length - 1, Math.ceil(sortedValues.length * ratio) - 1);
  return sortedValues[index];
}

test("GET /health sustains concurrent traffic under a latency budget", async () => {
  const app = express();
  app.use(healthRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/health`;
    const concurrency = 40;
    const rounds = 5;
    const durations = [];

    for (let round = 0; round < rounds; round += 1) {
      const batch = await Promise.all(
        Array.from({ length: concurrency }, async () => {
          const startedAt = performance.now();
          const response = await fetch(url);
          const elapsedMs = performance.now() - startedAt;
          assert.equal(response.status, 200);
          assert.equal((await response.json()).status, "ok");
          return elapsedMs;
        })
      );
      durations.push(...batch);
    }

    durations.sort((left, right) => left - right);
    const p95 = percentile(durations, 0.95);
    const average = durations.reduce((total, value) => total + value, 0) / durations.length;

    assert.ok(
      p95 < 250,
      `expected health p95 < 250ms, got ${p95.toFixed(2)}ms (avg ${average.toFixed(2)}ms)`
    );
    assert.equal(durations.length, concurrency * rounds);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
