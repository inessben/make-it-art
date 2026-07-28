#!/usr/bin/env node
/**
 * Bake anti-AI watermarks into public artwork previews.
 *
 * Usage:
 *   node src/scripts/backfill-artwork-watermarks.js
 *   node src/scripts/backfill-artwork-watermarks.js --force
 *   node src/scripts/backfill-artwork-watermarks.js --limit=50
 */

const { backfillArtworkWatermarks } = require("../services/artwork-watermark.service");

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 200;

  const report = await backfillArtworkWatermarks({ force, limit });
  console.log(JSON.stringify(report, null, 2));

  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
