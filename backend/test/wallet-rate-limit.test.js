const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");

process.env.NODE_ENV = "production";
const { walletWriteRateLimit } = require("../src/middlewares/rate-limit.middleware");

test("frequent wallet retries are rate limited", async () => {
  const app = express();
  app.post("/retry", walletWriteRateLimit, (_req, res) => res.status(204).end());
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const { port } = server.address();
    let blocked;
    for (let attempt = 1; attempt <= 101; attempt += 1) {
      const response = await fetch(`http://127.0.0.1:${port}/retry`, { method: "POST" });
      if (response.status === 429) {
        blocked = response;
        break;
      }
      assert.equal(response.status, 204);
    }

    assert.ok(blocked, "wallet limiter must reject repeated operations");
    assert.equal((await blocked.json()).code, "WALLET_RATE_LIMITED");
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
