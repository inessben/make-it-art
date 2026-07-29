const path = require("node:path");
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: path.join(__dirname, "e2e", "specs"),
  globalSetup: path.join(__dirname, "e2e", "global-setup.js"),
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: path.join(__dirname, "playwright-report") }]
  ],
  outputDir: path.join(__dirname, "test-results"),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  }
});
