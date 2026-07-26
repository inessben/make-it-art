const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isAiTrainingBot,
  isSuspiciousAutomation,
  isAllowedMediaReferer
} = require("../../src/middlewares/artwork-media-guard.middleware");
const {
  assertSafeRelativeUploadPath,
  assertSafeArtworkFilename,
  buildArtworkPreviewPath,
  buildArtworkPreviewUrl
} = require("../../src/services/artwork-media.service");

test("known generative AI crawlers are blocked", () => {
  assert.equal(isAiTrainingBot("Mozilla/5.0 (compatible; GPTBot/1.0)"), true);
  assert.equal(isAiTrainingBot("ClaudeBot/1.0"), true);
  assert.equal(isAiTrainingBot("CCBot/2.0"), true);
  assert.equal(isAiTrainingBot("Google-Extended"), true);
  assert.equal(isAiTrainingBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"), false);
});

test("empty or scraper user-agents are treated as suspicious automation", () => {
  assert.equal(isSuspiciousAutomation(""), true);
  assert.equal(isSuspiciousAutomation("curl/8.0"), true);
  assert.equal(isSuspiciousAutomation("python-requests/2.31"), true);
  assert.equal(
    isSuspiciousAutomation(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    ),
    false
  );
});

test("hotlink protection accepts same-origin referers", () => {
  const req = {
    get(name) {
      if (name === "referer") {
        return "http://localhost/artworks/1";
      }
      return "";
    }
  };

  assert.equal(isAllowedMediaReferer(req), true);
});

test("artwork media paths reject traversal and build preview urls", () => {
  assert.throws(() => assertSafeRelativeUploadPath("../secret.txt"), /INVALID_UPLOAD_PATH/);
  assert.throws(() => assertSafeArtworkFilename("evil.jpg"), /INVALID_UPLOAD_PATH/);

  const filename = "1710000000000-11111111-1111-4111-8111-111111111111.png";
  assert.equal(assertSafeArtworkFilename(filename), filename);
  assert.equal(
    buildArtworkPreviewPath(filename),
    "artworks/previews/1710000000000-11111111-1111-4111-8111-111111111111.jpg"
  );
  assert.equal(
    buildArtworkPreviewUrl(null, `artworks/${filename}`),
    "/api/uploads/artworks/previews/1710000000000-11111111-1111-4111-8111-111111111111.jpg"
  );
});
