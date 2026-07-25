const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const MAX_SCANNED_FILE_BYTES = 1024 * 1024;
const FALLBACK_IGNORED_DIRECTORIES = new Set([
  ".git",
  ".nuxt",
  ".output",
  "coverage",
  "node_modules",
  "tmp"
]);
const FALLBACK_IGNORED_FILES = new Set([".env", ".env.local", ".env.production"]);
const SECRET_RULES = Object.freeze([
  {
    code: "STRIPE_SECRET_KEY",
    pattern: /\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{20,}\b/g
  },
  {
    code: "STRIPE_WEBHOOK_SECRET",
    pattern: /\bwhsec_[A-Za-z0-9_]{24,}\b/g
  },
  {
    code: "STRIPE_CLIENT_SECRET",
    pattern: /\bpi_[A-Za-z0-9_]+_secret_[A-Za-z0-9]{20,}\b/g
  }
]);

function scanPaymentSecrets(content) {
  const findings = [];
  for (const rule of SECRET_RULES) {
    rule.pattern.lastIndex = 0;
    for (const match of content.matchAll(rule.pattern)) {
      findings.push({ code: rule.code, offset: match.index });
    }
  }
  return findings;
}

function listWithGit(root) {
  const result = spawnSync(
    "git",
    [
      "-c",
      `safe.directory=${root.replaceAll("\\", "/")}`,
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z"
    ],
    {
      cwd: root,
      windowsHide: true
    }
  );

  if (result.status !== 0) return null;
  return result.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((file) => path.resolve(root, file));
}

function listWithFilesystem(root) {
  const files = [];

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && FALLBACK_IGNORED_DIRECTORIES.has(entry.name)) continue;
      if (FALLBACK_IGNORED_FILES.has(entry.name) || /^\.env\..+\.local$/.test(entry.name)) continue;

      const location = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(location);
      else if (entry.isFile()) files.push(location);
    }
  }

  visit(root);
  return files;
}

function listRepositoryFiles(root) {
  return listWithGit(root) || listWithFilesystem(root);
}

function scanRepositoryPaymentSecrets(root) {
  const findings = [];

  for (const location of listRepositoryFiles(root)) {
    if (!fs.existsSync(location)) continue;
    const stats = fs.statSync(location);
    if (stats.size > MAX_SCANNED_FILE_BYTES) continue;

    const content = fs.readFileSync(location);
    if (content.includes(0)) continue;

    for (const finding of scanPaymentSecrets(content.toString("utf8"))) {
      findings.push({
        file: path.relative(root, location).replaceAll("\\", "/"),
        code: finding.code
      });
    }
  }

  return findings;
}

module.exports = {
  listRepositoryFiles,
  scanPaymentSecrets,
  scanRepositoryPaymentSecrets
};
