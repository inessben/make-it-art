const { spawn } = require("node:child_process");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const env = require("../config/env");

function buildPreviewWatermarkText(artistName, fallbackText = env.artworkMedia.watermarkText) {
  const normalizedArtist = String(artistName || "").trim();

  if (normalizedArtist) {
    return `${normalizedArtist} · Preview · No AI training`;
  }

  return fallbackText || "Make It Art · Preview · No AI training";
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

      reject(new Error(stderr.trim() || `PREVIEW_GENERATION_FAILED:${code}`));
    });
  });
}

async function generateArtworkPreview({
  sourcePath,
  applyWatermark = true,
  watermarkText = env.artworkMedia.watermarkText,
  title = "",
  artist = "",
  copyrightNotice = ""
}) {
  const outputPath = path.join(
    os.tmpdir(),
    `mia-preview-${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`
  );
  const scriptPath = path.resolve(__dirname, "../../scripts/generate_artwork_preview.py");
  const args = [
    scriptPath,
    "--input",
    sourcePath,
    "--output",
    outputPath,
    "--max-width",
    String(env.artworkMedia.previewMaxWidth),
    "--quality",
    String(env.artworkMedia.previewQuality),
    "--watermark",
    watermarkText || "Make It Art · Preview · No AI training",
    "--title",
    title || "",
    "--artist",
    artist || "",
    "--copyright",
    copyrightNotice || ""
  ];

  // Public marketplace previews are always watermarked unless explicitly disabled.
  if (applyWatermark === false) {
    args.push("--no-watermark");
  }

  await runPython(args);

  try {
    await fsp.access(outputPath);
  } catch (_error) {
    throw new Error("PREVIEW_FILE_MISSING");
  }

  return {
    path: outputPath,
    contentType: "image/jpeg",
    watermarkApplied: applyWatermark !== false
  };
}

module.exports = {
  buildPreviewWatermarkText,
  generateArtworkPreview
};
