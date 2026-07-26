const path = require("node:path");
const fs = require("node:fs");
const { scanRepositoryPaymentSecrets } = require("../lib/payment-secret-scanner");

if (/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || "")) {
  throw new Error("Live Stripe keys are forbidden in development and CI");
}
if (/^pk_live_/.test(process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")) {
  throw new Error("Live Stripe publishable keys are forbidden in development and CI");
}

const backendRoot = path.resolve(__dirname, "../..");
const workspaceRoot = path.dirname(backendRoot);
const root = fs.existsSync(path.join(workspaceRoot, ".git")) ? workspaceRoot : backendRoot;
const findings = scanRepositoryPaymentSecrets(root);

if (findings.length > 0) {
  const locations = [...new Set(findings.map((finding) => finding.file))];
  throw new Error(`Potential Stripe secret present in repository files: ${locations.join(", ")}`);
}
console.log("Stripe sandbox and repository secret checks passed");
