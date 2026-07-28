const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");

const healthRoutes = require("../src/routes/health.routes");

test("GET /health returns a live service payload", async () => {
  const app = express();
  app.use(healthRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "backend");
    assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
