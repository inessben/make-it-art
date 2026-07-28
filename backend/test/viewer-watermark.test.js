const assert = require("node:assert/strict");
const { test } = require("node:test");
const { buildViewerWatermarkId, parseViewerWatermarkId } = require("../src/utils/viewer-watermark");

test("viewer watermark encodes and decodes authenticated user + artwork", () => {
  const watermark = buildViewerWatermarkId({ userId: 42, artworkId: 7 });
  assert.match(watermark, /^MIA-U/);

  const parsed = parseViewerWatermarkId(watermark);
  assert.equal(parsed.kind, "user");
  assert.equal(parsed.userId, 42);
  assert.equal(parsed.artworkId, 7);
  assert.equal(parsed.checksumValid, true);
});

test("viewer watermark encodes guest token", () => {
  const watermark = buildViewerWatermarkId({ guestToken: "ABC123XYZ", artworkId: 3 });
  const parsed = parseViewerWatermarkId(watermark);
  assert.equal(parsed.kind, "guest");
  assert.equal(parsed.guestToken, "ABC123XYZ");
  assert.equal(parsed.artworkId, 3);
  assert.equal(parsed.checksumValid, true);
});
