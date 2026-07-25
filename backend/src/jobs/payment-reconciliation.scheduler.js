const env = require("../config/env");
const { reconcileStalePayments } = require("../services/payment-monitoring.service");

function startPaymentReconciliationScheduler({
  intervalMs = env.stripe.reconciliationSweepMs,
  reconcile = reconcileStalePayments
} = {}) {
  let running = false;
  const execute = async () => {
    if (running) return;
    running = true;
    try {
      const summary = await reconcile();
      if (summary.repaired || summary.deferred || summary.failed) {
        console.log("Payment reconciliation sweep", summary);
      }
    } catch (error) {
      console.error("Payment reconciliation sweep failed", { name: error.name, code: error.code });
    } finally {
      running = false;
    }
  };
  const timer = setInterval(execute, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

module.exports = { startPaymentReconciliationScheduler };
