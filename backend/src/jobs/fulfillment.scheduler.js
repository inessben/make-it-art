const env = require("../config/env");
const { processFulfillmentBatch } = require("../services/fulfillment-task.service");

function startFulfillmentScheduler({
  intervalMs = env.fulfillment.sweepMs,
  runBatch = processFulfillmentBatch,
  batchOptions = {}
} = {}) {
  let running = false;

  const execute = async () => {
    if (running) return;
    running = true;
    try {
      const summary = await runBatch(batchOptions);
      if (summary.completed || summary.retried || summary.canceled || summary.failed) {
        console.log("Fulfillment sweep", summary);
      }
    } catch (error) {
      console.error("Fulfillment sweep failed", {
        name: error.name,
        code: error.code || "FULFILLMENT_SWEEP_FAILED"
      });
    } finally {
      running = false;
    }
  };

  const timer = setInterval(execute, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

module.exports = { startFulfillmentScheduler };
