const assert = require("node:assert/strict");
const http = require("node:http");
const { Readable } = require("node:stream");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/artwork-media.routes");
const prismaPath = require.resolve("../src/lib/prisma");
const authRequiredPath = require.resolve("../src/middlewares/auth-required.middleware");
const sessionServicePath = require.resolve("../src/services/session.service");
const downloadServicePath = require.resolve("../src/services/artwork-download.service");

class ArtworkMediaAccessError extends Error {}

async function startMediaApp(t, { artwork, user = null, privateAccess = false }) {
  const calls = { opened: 0, accessChecks: 0 };
  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [prismaPath]: {
      artwork: {
        async findUnique() {
          return artwork;
        }
      }
    },
    [authRequiredPath]: {
      authRequired(req, _res, next) {
        req.user = user;
        next();
      }
    },
    [sessionServicePath]: {
      async getUserFromRequest() {
        return user;
      }
    },
    [downloadServicePath]: {
      ArtworkMediaAccessError,
      async assertCanAccessHd() {
        calls.accessChecks += 1;
        if (!privateAccess) throw new ArtworkMediaAccessError("forbidden");
      },
      async openArtworkMediaStream() {
        calls.opened += 1;
        return {
          stream: Readable.from([Buffer.from("preview")]),
          contentType: "image/jpeg"
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

  return { baseUrl: `http://127.0.0.1:${server.address().port}`, calls };
}

function artwork(overrides = {}) {
  return {
    id: 42,
    artistId: 3,
    title: "Private work",
    imagePath: "preview.jpg",
    hdPath: "hd.jpg",
    previewPath: "preview.jpg",
    storageProvider: "local",
    watermarkApplied: true,
    mediaStatus: "ready",
    visibility: "HIDDEN",
    moderationStatus: "approved",
    ...overrides
  };
}

test("withdrawn previews are undiscoverable without a private right", async (t) => {
  const { baseUrl, calls } = await startMediaApp(t, { artwork: artwork() });
  const response = await fetch(`${baseUrl}/artworks/42/media/preview`);

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(calls.opened, 0);
});

test("an owner or active buyer can load a withdrawn preview without public caching", async (t) => {
  const { baseUrl, calls } = await startMediaApp(t, {
    artwork: artwork({ visibility: "ARCHIVED" }),
    user: { id: 7 },
    privateAccess: true
  });
  const response = await fetch(`${baseUrl}/artworks/42/media/preview`);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "preview");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noai, noimageai");
  assert.equal(calls.accessChecks, 1);
  assert.equal(calls.opened, 1);
});

test("an approved published preview keeps its public cache policy", async (t) => {
  const { baseUrl, calls } = await startMediaApp(t, {
    artwork: artwork({ visibility: "PUBLISHED" })
  });
  const response = await fetch(`${baseUrl}/artworks/42/media/preview`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noai, noimageai");
  assert.equal(calls.accessChecks, 0);
  assert.equal(calls.opened, 1);
});
