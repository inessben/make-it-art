const env = require("../config/env");
const { expireStaleCheckouts } = require("../services/checkout-recovery.service");

function startCheckoutExpirationScheduler({
  intervalMs = env.stripe.checkoutExpirationSweepMs,
  sweep = expireStaleCheckouts
} = {}) {
  let running = false;

  const execute = async () => {
    if (running) return;
    running = true;
    try {
      const summary = await sweep();
      if (summary.canceled || summary.protected || summary.failed) {
        console.log("Checkout expiration sweep", summary);
      }
    } catch (error) {
      console.error("Checkout expiration sweep failed", { name: error.name, code: error.code });
    } finally {
      running = false;
    }
  };

  const timer = setInterval(execute, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

module.exports = { startCheckoutExpirationScheduler };
