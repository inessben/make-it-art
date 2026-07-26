const express = require("express");
const { buildOpenApiSpec } = require("../docs/openapi");

const router = express.Router();

function renderSwaggerUiPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Make It Art API Docs</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"
    />
    <style>
      body {
        margin: 0;
        background: #020617;
        color: #e2e8f0;
        font-family: Arial, sans-serif;
      }

      .mia-docs-shell {
        border-bottom: 1px solid #1e293b;
        background: linear-gradient(135deg, #020617 0%, #0f172a 100%);
        padding: 24px;
      }

      .mia-docs-shell h1 {
        margin: 0;
        font-size: 28px;
      }

      .mia-docs-shell p {
        margin: 10px 0 0;
        max-width: 920px;
        color: #94a3b8;
        line-height: 1.6;
      }

      .mia-docs-shell a {
        color: #93c5fd;
      }

      #swagger-ui {
        max-width: 1440px;
        margin: 0 auto;
      }

      .swagger-ui .topbar {
        display: none;
      }
    </style>
  </head>
  <body>
    <section class="mia-docs-shell">
      <h1>Make It Art Business API</h1>
      <p>
        Interactive Swagger documentation for the current business API. If the UI cannot load in
        your environment, you can still open the raw
        <a href="/api/docs/openapi.json">OpenAPI JSON document</a>.
      </p>
    </section>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: "/api/docs/openapi.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
          displayRequestDuration: true,
          docExpansion: "list",
          persistAuthorization: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          layout: "BaseLayout",
          tryItOutEnabled: true
        });
      };
    </script>
  </body>
</html>`;
}

router.get("/docs/openapi.json", (_req, res) => {
  res.set("Cache-Control", "no-store");
  return res.status(200).json(buildOpenApiSpec());
});

router.get("/docs", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.type("html");
  return res.status(200).send(renderSwaggerUiPage());
});

module.exports = router;
