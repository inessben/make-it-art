const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const app = require("./app");
const env = require("./config/env");
const { connectRedis } = require("./lib/redis");
const { ensureDefaultAdminAccount } = require("./services/default-admin.service");
const { ensurePredefinedCategories } = require("./repositories/category.repository");
const { startCheckoutExpirationScheduler } = require("./jobs/checkout-expiration.scheduler");

async function startServer() {
  await connectRedis();
  await ensureDefaultAdminAccount();
  await ensurePredefinedCategories();

  if (env.stripe.secretKey) {
    startCheckoutExpirationScheduler();
  }

  app.listen(env.port, () => {
    console.log(`Backend listening on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
