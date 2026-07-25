const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const prisma = require("../lib/prisma");
const {
  inspectStalePayments,
  reconcileStalePayments
} = require("../services/payment-monitoring.service");

const apply = process.argv.includes("--apply");
const productionConfirmation = process.argv.includes("--confirm=STRIPE_IS_SOURCE_OF_TRUTH");

async function main() {
  if (apply && process.env.NODE_ENV === "production" && !productionConfirmation) {
    const error = new Error(
      "Production apply requires --confirm=STRIPE_IS_SOURCE_OF_TRUTH after reviewing the dry run"
    );
    error.code = "PAYMENT_RECONCILIATION_CONFIRMATION_REQUIRED";
    throw error;
  }

  const result = apply ? await reconcileStalePayments() : await inspectStalePayments();
  process.stdout.write(
    `${JSON.stringify({ mode: apply ? "apply" : "dry-run", ...result }, null, 2)}\n`
  );
}

main()
  .catch((error) => {
    const safeCode = String(error.code || "PAYMENT_RECONCILIATION_COMMAND_FAILED")
      .replace(/[^A-Za-z0-9_-]/g, "")
      .slice(0, 100);
    process.stderr.write(`Payment reconciliation failed: ${safeCode}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
