require("dotenv").config();

const app = require("./app");
const env = require("./config/env");
const { logInfo, logError } = require("./utils/logger");

app.listen(env.port, "0.0.0.0", () => {
  logInfo(`Backend running on port ${env.port}`);
});

process.on("uncaughtException", (error) => {
  logError("Uncaught exception", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logError("Unhandled rejection", reason);
  process.exit(1);
});

