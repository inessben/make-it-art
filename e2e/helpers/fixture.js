const fs = require("node:fs");
const path = require("node:path");

const fixturePath = path.resolve(__dirname, "..", "..", "tmp", "e2e-fixture.json");

function readE2eFixture() {
  if (!fs.existsSync(fixturePath)) {
    throw new Error(
      `Missing E2E fixture at ${fixturePath}. Run the Playwright global setup or launch "npm run e2e" first.`
    );
  }

  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

module.exports = {
  fixturePath,
  readE2eFixture
};
