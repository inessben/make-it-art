const crypto = require("node:crypto");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const env = require("../config/env");
const {
  buildViewerWatermarkId,
  parseViewerWatermarkId
} = require("../utils/viewer-watermark");

const FORENSIC_COOKIE = "mia_forensic_viewer";
const PAYLOAD_LENGTH = 34;
const MAGIC = Buffer.from("MIAF");

function getForensicSecret() {
  return (
    process.env.ARTWORK_FORENSIC_WATERMARK_SECRET ||
    env.artworkMedia?.forensicWatermarkSecret ||
    env.jwtSecret ||
    "dev_secret_change_me"
  );
}

function createGuestViewerToken() {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

function runPython(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(env.artworkMedia.pythonPath, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(new Error(stderr.trim() || `FORENSIC_WATERMARK_FAILED:${code}`));
    });
  });
}

/**
 * Binary payload layout (34 bytes):
 * MAGIC(4) VERSION(1) kind(1) userId(4) artworkId(4) guest(12) hmac(8)
 */
function buildForensicPayload({ userId = null, artworkId = null, guestToken = null } = {}) {
  const buffer = Buffer.alloc(PAYLOAD_LENGTH);
  MAGIC.copy(buffer, 0);
  buffer.writeUInt8(1, 4);

  const kind = userId != null && Number(userId) > 0 ? 1 : 2;
  buffer.writeUInt8(kind, 5);
  buffer.writeUInt32BE(kind === 1 ? Number(userId) : 0, 6);
  buffer.writeUInt32BE(Number(artworkId) > 0 ? Number(artworkId) : 0, 10);

  const guest = String(guestToken || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12)
    .padEnd(12, "\0");
  buffer.write(guest, 14, 12, "ascii");

  const hmac = crypto
    .createHmac("sha256", getForensicSecret())
    .update(buffer.subarray(0, 26))
    .digest()
    .subarray(0, 8);
  hmac.copy(buffer, 26);

  const visibleId = buildViewerWatermarkId({
    userId: kind === 1 ? userId : null,
    artworkId,
    guestToken: kind === 2 ? guest.replace(/\0/g, "") : null
  });

  return { buffer, visibleId, kind: kind === 1 ? "user" : "guest" };
}

function parseForensicPayload(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < PAYLOAD_LENGTH) {
    return { ok: false, reason: "PAYLOAD_TOO_SHORT" };
  }

  if (!buffer.subarray(0, 4).equals(MAGIC)) {
    return { ok: false, reason: "BAD_MAGIC" };
  }

  const version = buffer.readUInt8(4);
  if (version !== 1) {
    return { ok: false, reason: "BAD_VERSION" };
  }

  const expectedHmac = crypto
    .createHmac("sha256", getForensicSecret())
    .update(buffer.subarray(0, 26))
    .digest()
    .subarray(0, 8);

  if (!crypto.timingSafeEqual(expectedHmac, buffer.subarray(26, 34))) {
    return { ok: false, reason: "BAD_HMAC" };
  }

  const kindFlag = buffer.readUInt8(5);
  const userId = buffer.readUInt32BE(6) || null;
  const artworkId = buffer.readUInt32BE(10) || null;
  const guestToken = buffer
    .subarray(14, 26)
    .toString("ascii")
    .replace(/\0/g, "")
    .trim() || null;

  const visibleId = buildViewerWatermarkId({
    userId: kindFlag === 1 ? userId : null,
    artworkId,
    guestToken: kindFlag === 2 ? guestToken : null
  });

  return {
    ok: true,
    version,
    kind: kindFlag === 1 ? "user" : "guest",
    userId: kindFlag === 1 ? userId : null,
    artworkId,
    guestToken: kindFlag === 2 ? guestToken : null,
    visibleId,
    parsedVisible: parseViewerWatermarkId(visibleId)
  };
}

async function embedForensicWatermarkIntoFile({
  inputPath,
  outputPath,
  userId = null,
  artworkId = null,
  guestToken = null
}) {
  const { buffer, visibleId, kind } = buildForensicPayload({
    userId,
    artworkId,
    guestToken
  });

  const scriptPath = path.resolve(__dirname, "../../scripts/forensic_watermark.py");
  const stdout = await runPython([
    scriptPath,
    "embed",
    "--input",
    inputPath,
    "--output",
    outputPath,
    "--payload-b64",
    buffer.toString("base64")
  ]);

  let meta = {};
  try {
    meta = JSON.parse(stdout);
  } catch {
    meta = { ok: true, output: outputPath };
  }

  return {
    outputPath: meta.output || outputPath,
    visibleId,
    kind,
    payloadLength: PAYLOAD_LENGTH
  };
}

async function extractForensicWatermarkFromFile(inputPath) {
  const scriptPath = path.resolve(__dirname, "../../scripts/forensic_watermark.py");
  const stdout = await runPython([
    scriptPath,
    "extract",
    "--input",
    inputPath,
    "--length",
    String(PAYLOAD_LENGTH)
  ]);

  const parsed = JSON.parse(stdout);
  const payload = Buffer.from(parsed.payloadB64, "base64");
  return parseForensicPayload(payload);
}

async function personalizePreviewBuffer(plaintextBuffer, viewer) {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "mia-forensic-"));
  const inputPath = path.join(tempRoot, "in.bin");
  const outputPath = path.join(tempRoot, "out.png");

  try {
    await fsp.writeFile(inputPath, plaintextBuffer);
    const embedded = await embedForensicWatermarkIntoFile({
      inputPath,
      outputPath,
      userId: viewer.userId,
      artworkId: viewer.artworkId,
      guestToken: viewer.guestToken
    });
    const personalized = await fsp.readFile(embedded.outputPath);
    return {
      buffer: personalized,
      visibleId: embedded.visibleId,
      kind: embedded.kind,
      contentType: "image/png"
    };
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
}

async function readStreamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

module.exports = {
  FORENSIC_COOKIE,
  PAYLOAD_LENGTH,
  createGuestViewerToken,
  buildForensicPayload,
  parseForensicPayload,
  embedForensicWatermarkIntoFile,
  extractForensicWatermarkFromFile,
  personalizePreviewBuffer,
  readStreamToBuffer
};
