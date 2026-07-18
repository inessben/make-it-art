const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const app = require("./app");
const env = require("./config/env");
const { connectRedis } = require("./lib/redis");
const { ensureDefaultAdminAccount } = require("./services/default-admin.service");
const { ensurePredefinedCategories } = require("./repositories/category.repository");
const { startCheckoutExpirationScheduler } = require("./jobs/checkout-expiration.scheduler");
const { startPaymentReconciliationScheduler } = require("./jobs/payment-reconciliation.scheduler");
const { validateProductionConfig } = require("./config/validate-production");

async function startServer() {
  validateProductionConfig(env);
  await connectRedis();
  await ensureDefaultAdminAccount();
  await ensurePredefinedCategories();

  if (env.stripe.secretKey) {
    startCheckoutExpirationScheduler();
    startPaymentReconciliationScheduler();
  }

  app.listen(env.port, () => {
    console.log(`Backend listening on port ${env.port}`);
  });
}

startServer().catch((error) => {
  const safeName = String(error?.name || "Error")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 80);
  const safeCode = String(error?.code || "STARTUP_FAILED")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 80);

  console.error("Failed to start server", {
    name: safeName || "Error",
    code: safeCode || "STARTUP_FAILED",
  });
  process.exit(1);
});
