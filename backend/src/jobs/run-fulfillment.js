const prisma = require("../lib/prisma");
const env = require("../config/env");
const { processFulfillmentBatch } = require("../services/fulfillment-task.service");

async function run() {
  const summary = await processFulfillmentBatch({
    batchSize: env.fulfillment.batchSize,
    leaseMs: env.fulfillment.leaseMs,
    maxAttempts: env.fulfillment.maxAttempts,
    baseDelayMs: env.fulfillment.retryBaseMs
  });
  console.log("Fulfillment batch", summary);
}

run()
  .catch((error) => {
    console.error("Fulfillment batch failed", {
      name: error.name,
      code: error.code || "FULFILLMENT_BATCH_FAILED"
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
