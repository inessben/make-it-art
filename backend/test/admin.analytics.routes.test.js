const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/admin-analytics.routes");
const authRequiredPath = require.resolve("../src/middlewares/auth-required.middleware");
const adminRequiredPath = require.resolve("../src/middlewares/admin-required.middleware");
const umamiServicePath = require.resolve("../src/services/umami.service");
const funnelServicePath = require.resolve("../src/services/analytics-funnel.service");

async function startAnalyticsApp(t, { isAdmin = true } = {}) {
  class UmamiError extends Error {
    constructor(message, status = 502) {
      super(message);
      this.status = status;
    }
  }

  class FunnelNotFoundError extends Error {
    constructor(key) {
      super(`Unknown analytics funnel "${key}".`);
      this.name = "FunnelNotFoundError";
    }
  }

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authRequiredPath]: {
      authRequired(req, _res, next) {
        req.user = { id: 1, email: "admin@example.com", role: isAdmin ? "admin" : "user" };
        next();
      }
    },
    [adminRequiredPath]: {
      adminRequired(req, res, next) {
        if (!isAdmin) {
          return res.status(403).json({ message: "Admin access required", code: "FORBIDDEN" });
        }
        return next();
      }
    },
    [umamiServicePath]: {
      UmamiError,
      async getStats() {
        return {
          visitors: 40,
          pageviews: 120,
          visits: 50,
          bounces: 10,
          totaltime: 2500
        };
      },
      async getActive() {
        return { visitors: 3 };
      },
      async getPageviews() {
        return { pageviews: [], sessions: [] };
      },
      async getMetrics() {
        return [];
      }
    },
    [funnelServicePath]: {
      FunnelNotFoundError,
      listFunnels() {
        return [
          {
            key: "artwork-purchase",
            label: "Artwork discovery to purchase",
            steps: [{ event: "view_artwork", label: "View artwork" }]
          }
        ];
      },
      async computeFunnel(key) {
        if (key !== "artwork-purchase") {
          throw new FunnelNotFoundError(key);
        }
        return {
          key,
          label: "Artwork discovery to purchase",
          conversionRate: 25,
          steps: []
        };
      }
    }
  });

  const app = express();
  app.use(router);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    restore();
    server.close();
  });

  return { baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test("GET /admin/analytics/overview returns derived bounce and session metrics", async (t) => {
  const { baseUrl } = await startAnalyticsApp(t);
  const response = await fetch(`${baseUrl}/admin/analytics/overview`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.uniqueVisitors, 40);
  assert.equal(body.pageviews, 120);
  assert.equal(body.sessions, 50);
  assert.equal(body.bounceRate, 20);
  assert.equal(body.avgSessionDurationSeconds, 50);
});

test("GET /admin/analytics/overview rejects non-admin callers", async (t) => {
  const { baseUrl } = await startAnalyticsApp(t, { isAdmin: false });
  const response = await fetch(`${baseUrl}/admin/analytics/overview`);
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.code, "FORBIDDEN");
});

test("GET /admin/analytics/funnels/:key returns 404 for an unknown funnel", async (t) => {
  const { baseUrl } = await startAnalyticsApp(t);
  const response = await fetch(`${baseUrl}/admin/analytics/funnels/does-not-exist`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.match(body.message, /Unknown analytics funnel/);
});
