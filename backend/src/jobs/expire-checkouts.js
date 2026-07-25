const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const { expireStaleCheckouts } = require("../services/checkout-recovery.service");
const prisma = require("../lib/prisma");

async function run() {
  const summary = await expireStaleCheckouts();
  console.log("Expired checkout sweep completed", summary);
}

run()
  .catch((error) => {
    console.error("Expired checkout sweep failed", { name: error.name, code: error.code });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
