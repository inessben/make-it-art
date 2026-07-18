const fs = require("node:fs");
const path = require("node:path");

if (/^(sk|rk|pk)_live_/.test(process.env.STRIPE_SECRET_KEY || "")) {
  throw new Error("Live Stripe keys are forbidden in development and CI");
}
if (/^pk_live_/.test(process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")) {
  throw new Error("Live Stripe publishable keys are forbidden in development and CI");
}

const backendRoot = path.resolve(__dirname, "../..");
const workspaceRoot = path.dirname(backendRoot);
const root = fs.existsSync(path.join(workspaceRoot, ".git")) ? workspaceRoot : backendRoot;
const ignored = new Set([".git", "node_modules", ".nuxt", ".output"]);
const secretPattern = /\b(?:sk|rk)_live_[A-Za-z0-9]{24,}\b|\bwhsec_[A-Za-z0-9_]{32,}\b/g;
const findings = [];

function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(location);
    else if (entry.isFile() && fs.statSync(location).size < 1024 * 1024) {
      const content = fs.readFileSync(location, "utf8");
      if (secretPattern.test(content)) findings.push(path.relative(root, location));
      secretPattern.lastIndex = 0;
    }
  }
}

scan(root);
if (findings.length > 0) {
  throw new Error(`Potential live Stripe secret committed in: ${findings.join(", ")}`);
}
console.log("Stripe sandbox and repository secret checks passed");
