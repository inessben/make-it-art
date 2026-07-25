const env = require("../config/env");
const { notifyPaymentAnomalies } = require("../services/payment-operations.service");

function startPaymentAnomalyScheduler({
  intervalMs = env.paymentOperations.sweepMs,
  scan = notifyPaymentAnomalies
} = {}) {
  let running = false;
  const execute = async () => {
    if (running) return;
    running = true;
    try {
      const summary = await scan();
      if (summary.notified) console.log("Payment anomaly sweep", summary);
    } catch (error) {
      console.error("Payment anomaly sweep failed", {
        name: error.name,
        code: error.code || "PAYMENT_ANOMALY_SWEEP_FAILED"
      });
    } finally {
      running = false;
    }
  };
  const timer = setInterval(execute, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

module.exports = { startPaymentAnomalyScheduler };
