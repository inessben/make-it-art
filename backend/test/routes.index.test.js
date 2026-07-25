const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes");
const healthRoutesPath = require.resolve("../src/routes/health.routes");
const authRoutesPath = require.resolve("../src/routes/auth.routes");
const ordersRoutesPath = require.resolve("../src/routes/orders.routes");
const adminRoutesPath = require.resolve("../src/routes/admin.routes");
const artistRoutesPath = require.resolve("../src/routes/artist.routes");
const marketplaceRoutesPath = require.resolve("../src/routes/marketplace.routes");

function buildEmptyRouter() {
  return express.Router();
}

async function startAppWithIndexRouter(t) {
  const artistRouter = express.Router();
  const marketplaceRouter = express.Router();

  artistRouter.get("/artists/me", (_req, res) => {
    return res.status(200).json({
      source: "artist"
    });
  });

  marketplaceRouter.get("/artists/:id", (req, res) => {
    return res.status(200).json({
      source: "marketplace",
      id: req.params.id
    });
  });

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [healthRoutesPath]: buildEmptyRouter(),
    [authRoutesPath]: buildEmptyRouter(),
    [ordersRoutesPath]: buildEmptyRouter(),
    [adminRoutesPath]: buildEmptyRouter(),
    [artistRoutesPath]: artistRouter,
    [marketplaceRoutesPath]: marketplaceRouter
  });

  const app = express();
  app.use(router);

  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  t.after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
    restore();
  });

  return `http://127.0.0.1:${server.address().port}`;
}

async function requestJson(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);

  return {
    status: response.status,
    body: await response.json()
  };
}

test("GET /artists/me resolves to the authenticated artist router before the public marketplace router", async (t) => {
  const baseUrl = await startAppWithIndexRouter(t);
  const response = await requestJson(baseUrl, "/artists/me");

  assert.equal(response.status, 200);
  assert.equal(response.body.source, "artist");
});

test("GET /artists/:id still resolves to the public marketplace router", async (t) => {
  const baseUrl = await startAppWithIndexRouter(t);
  const response = await requestJson(baseUrl, "/artists/42");

  assert.equal(response.status, 200);
  assert.equal(response.body.source, "marketplace");
  assert.equal(response.body.id, "42");
});
