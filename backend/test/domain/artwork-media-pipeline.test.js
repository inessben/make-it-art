const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { loadModuleWithMocks } = require("../helpers/mock-require");

test("processArtworkUpload stores HD and watermarked preview via local adapter", async () => {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "mia-media-"));
  const sourcePath = path.join(tempRoot, "source.png");

  // Minimal valid 1x1 PNG
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  await fsp.writeFile(sourcePath, png);

  const pipelinePath = require.resolve("../../src/services/artwork-media-pipeline.service");
  const previewServicePath = require.resolve("../../src/services/artwork-preview.service");
  const storageIndexPath = require.resolve("../../src/services/artwork-storage/index.js");
  const envPath = require.resolve("../../src/config/env");

  const putCalls = [];
  const { moduleExports, restore } = loadModuleWithMocks(pipelinePath, {
    [envPath]: {
      artworkMedia: {
        storageProvider: "local",
        watermarkPublicPreviews: true
      }
    },
    [previewServicePath]: {
      async generateArtworkPreview() {
        const previewPath = path.join(tempRoot, "preview.jpg");
        await fsp.writeFile(previewPath, Buffer.from("preview"));
        return {
          path: previewPath,
          contentType: "image/jpeg",
          watermarkApplied: true
        };
      }
    },
    [storageIndexPath]: {
      getArtworkStorageProvider() {
        return {
          name: "local",
          async putObject(payload) {
            putCalls.push(payload);
            return {
              key: payload.key,
              url: `/api/uploads/${payload.key}`
            };
          },
          async deleteObject() {
            return undefined;
          }
        };
      }
    }
  });

  try {
    const result = await moduleExports.processArtworkUpload({
      uploadedFile: {
        path: sourcePath,
        originalname: "source.png",
        mimetype: "image/png",
        filename: "source.png"
      },
      applyWatermark: true
    });

    assert.equal(result.storageProvider, "local");
    assert.equal(result.watermarkApplied, true);
    assert.match(result.hdPath, /^artworks\/hd\//);
    assert.match(result.previewPath, /^artworks\/preview\//);
    assert.equal(putCalls.length, 2);
  } finally {
    restore();
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
});
