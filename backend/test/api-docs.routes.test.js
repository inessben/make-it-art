const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { test } = require("node:test");
const express = require("express");

const { buildOpenApiSpec } = require("../src/docs/openapi");
const docsRouter = require("../src/routes/docs.routes");

const ROUTE_PREFIXES = {
  "admin-analytics.routes.js": "",
  "admin.routes.js": "",
  "artist.routes.js": "",
  "auth.routes.js": "",
  "cart.routes.js": "/v1",
  "docs.routes.js": "",
  "health.routes.js": "",
  "marketplace.routes.js": "",
  "notifications.routes.js": "",
  "order.routes.js": "/v1",
  "orders.routes.js": "",
  "payment-operations.routes.js": "/v1",
  "refund.routes.js": "/v1",
  "security.routes.js": "/v1",
  "stripe-webhook.routes.js": "/v1/webhooks/stripe"
};

function normalizeExpressRoutePath(routePath) {
  const withoutRegex = routePath.replace(/\([^)]*\)/g, "");
  const withOpenApiParams = withoutRegex.replace(/:([A-Za-z0-9_]+)/g, "{$1}");

  if (withOpenApiParams === "/") {
    return "";
  }

  return withOpenApiParams;
}

function collectExpectedDocumentedRoutes() {
  const routesDirectory = path.resolve(__dirname, "../src/routes");
  const expectedRoutes = new Map();

  Object.entries(ROUTE_PREFIXES).forEach(([fileName, prefix]) => {
    const source = fs.readFileSync(path.join(routesDirectory, fileName), "utf8");
    const routeMatches = source.matchAll(
      /router\.(get|post|patch|delete|put)\(\s*[\r\n\s]*["'`]([^"'`]+)["'`]/g
    );

    for (const match of routeMatches) {
      const method = match[1];
      const normalizedPath = normalizeExpressRoutePath(match[2]);
      const fullPath = `${prefix}${normalizedPath}` || "/";

      if (!expectedRoutes.has(fullPath)) {
        expectedRoutes.set(fullPath, new Set());
      }

      expectedRoutes.get(fullPath).add(method);
    }
  });

  return expectedRoutes;
}

function collectDocumentedOperations() {
  const spec = buildOpenApiSpec();
  const documentedRoutes = new Map();

  Object.entries(spec.paths).forEach(([routePath, pathItem]) => {
    const methods = Object.keys(pathItem).filter((key) =>
      ["get", "post", "patch", "delete", "put"].includes(key)
    );

    documentedRoutes.set(routePath, new Set(methods));
  });

  return documentedRoutes;
}

async function startDocsApp(t) {
  const app = express();
  app.use("/api", docsRouter);

  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  t.after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  return `http://127.0.0.1:${server.address().port}`;
}

test("GET /api/docs/openapi.json returns the business OpenAPI document", async (t) => {
  const baseUrl = await startDocsApp(t);
  const response = await fetch(`${baseUrl}/api/docs/openapi.json`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.openapi, "3.1.0");
  assert.equal(body.info.title, "Make It Art Business API");
  assert.ok(body.paths["/v1/orders/checkout"]);
  assert.ok(body.paths["/artists/me/dashboard"]);
  assert.ok(body.paths["/admin/artworks/{id}/moderation"]);
});

test("GET /api/docs serves the Swagger UI shell", async (t) => {
  const baseUrl = await startDocsApp(t);
  const response = await fetch(`${baseUrl}/api/docs`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Make It Art Business API/);
  assert.match(body, /SwaggerUIBundle/);
  assert.match(body, /\/api\/docs\/openapi\.json/);
});

test("OpenAPI documents every mounted API route exposed by the backend", () => {
  const expectedRoutes = collectExpectedDocumentedRoutes();
  const documentedRoutes = collectDocumentedOperations();

  expectedRoutes.forEach((methods, routePath) => {
    assert.ok(documentedRoutes.has(routePath), `Missing documented path: ${routePath}`);

    const documentedMethods = documentedRoutes.get(routePath);

    methods.forEach((method) => {
      assert.ok(
        documentedMethods.has(method),
        `Missing documented operation: ${method.toUpperCase()} ${routePath}`
      );
    });
  });
});
