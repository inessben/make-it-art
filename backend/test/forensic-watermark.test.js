const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");
const {
  buildForensicPayload,
  parseForensicPayload,
  embedForensicWatermarkIntoFile,
  extractForensicWatermarkFromFile
} = require("../src/services/forensic-watermark.service");

test("forensic payload hmac roundtrip", () => {
  const { buffer, visibleId } = buildForensicPayload({ userId: 42, artworkId: 7 });
  const parsed = parseForensicPayload(buffer);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.userId, 42);
  assert.equal(parsed.artworkId, 7);
  assert.equal(parsed.visibleId, visibleId);
});

test("forensic watermark survives embed/extract as PNG", async (t) => {
  const pythonCommands = [
    process.env.PDF_PYTHON_PATH,
    process.env.ARTWORK_PYTHON_PATH,
    ...(process.platform === "win32" ? ["py"] : []),
    "python3"
  ].filter((command, index, values) => command && values.indexOf(command) === index);

  let python;
  for (const command of pythonCommands) {
    const pythonCheck = spawnSync(command, ["-c", "from PIL import Image"], { encoding: "utf8" });
    if (pythonCheck.status === 0) {
      python = command;
      break;
    }
  }
  if (!python) {
    t.skip("Python with Pillow is required for the forensic watermark integration test.");
    return;
  }

  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "mia-forensic-test-"));
  const sourcePath = path.join(tempRoot, "source.jpg");
  const embeddedPath = path.join(tempRoot, "embedded.png");
  const helperPath = path.join(tempRoot, "make_source.py");

  try {
    await fsp.writeFile(
      helperPath,
      [
        "from PIL import Image",
        "import sys",
        "Image.new('RGB', (240, 180), (40, 80, 120)).save(sys.argv[1], quality=95)",
        ""
      ].join("\n"),
      "utf8"
    );

    const makeSource = spawnSync(python, [helperPath, sourcePath], { encoding: "utf8" });
    if (makeSource.status !== 0) {
      assert.fail(makeSource.stderr || "Unable to create test JPEG with Pillow");
    }

    const embedded = await embedForensicWatermarkIntoFile({
      inputPath: sourcePath,
      outputPath: embeddedPath,
      userId: 99,
      artworkId: 3
    });

    assert.match(String(embedded.outputPath), /\.png$/i);

    const decoded = await extractForensicWatermarkFromFile(embedded.outputPath);
    assert.equal(decoded.ok, true);
    assert.equal(decoded.kind, "user");
    assert.equal(decoded.userId, 99);
    assert.equal(decoded.artworkId, 3);
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
});
