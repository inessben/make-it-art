const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const { sendPaymentOperationsAlert } = require("../services/mail.service");

async function main() {
  if (!process.argv.includes("--send")) {
    const error = new Error("Pass --send to deliver the non-sensitive payment alert test");
    error.code = "PAYMENT_ALERT_SEND_CONFIRMATION_REQUIRED";
    throw error;
  }

  const result = await sendPaymentOperationsAlert({
    code: "PAYMENT_ALERT_CHANNEL_TEST",
    count: 1,
    reference: "manual-readiness-check",
    ageSeconds: 0,
    recommendedAction: "Confirm receipt and retain the dated evidence with the release checklist"
  });

  if (!result) {
    const error = new Error("PAYMENT_ALERT_EMAIL is not configured");
    error.code = "PAYMENT_ALERT_CHANNEL_NOT_CONFIGURED";
    throw error;
  }

  process.stdout.write("Payment alert test accepted by the configured mail transport\n");
}

main().catch((error) => {
  const safeCode = String(error.code || "PAYMENT_ALERT_TEST_FAILED")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 100);
  process.stderr.write(`Payment alert test failed: ${safeCode}\n`);
  process.exitCode = 1;
});
