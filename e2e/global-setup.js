const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, "infrastructure", ".env");
const fixtureDirectory = path.join(repoRoot, "tmp");
const fixturePath = path.join(fixtureDirectory, "e2e-fixture.json");
const composeCommand =
  "docker compose --env-file infrastructure/.env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml";

module.exports = async function globalSetup() {
  assertLocalEnvFile();

  const stackReady = await areCoreServicesReady();

  if (!stackReady) {
    runCommand(`${composeCommand} up -d --build`, {
      description: "start the local Docker stack"
    });
  }

  await waitForUrl("http://localhost:4000/health", {
    description: "backend health endpoint"
  });
  await waitForUrl("http://localhost:3000", {
    description: "frontend application"
  });
  await waitForUrl("http://localhost", {
    description: "reverse proxy"
  });
  await waitForUrl("http://localhost:8025/api/v1/messages", {
    description: "Mailpit API"
  });

  const seedResult = runCommand(`${composeCommand} exec -T backend npm run payments:seed-test`, {
    description: "seed the E2E payment fixture"
  });
  const fixture = extractJsonObject(seedResult.stdout);

  fs.mkdirSync(fixtureDirectory, { recursive: true });
  fs.writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
};

function assertLocalEnvFile() {
  if (fs.existsSync(envPath)) {
    return;
  }

  throw new Error(
    "Missing infrastructure/.env. Copy infrastructure/.env.example to infrastructure/.env before running the E2E suite."
  );
}

async function areCoreServicesReady() {
  const checks = await Promise.all([
    isUrlReady("http://localhost:4000/health"),
    isUrlReady("http://localhost:3000"),
    isUrlReady("http://localhost"),
    isUrlReady("http://localhost:8025/api/v1/messages")
  ]);

  return checks.every(Boolean);
}

async function isUrlReady(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForUrl(url, { description, timeoutMs = 240_000, intervalMs = 2_000 } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isUrlReady(url)) {
      return;
    }

    await delay(intervalMs);
  }

  throw new Error(`Timed out while waiting for ${description || url} (${url})`);
}

function runCommand(command, { description } = {}) {
  const result = spawnSync(command, {
    cwd: repoRoot,
    shell: true,
    encoding: "utf8",
    stdio: "pipe"
  });

  if (result.status === 0) {
    return result;
  }

  const errorLines = [
    description ? `Unable to ${description}.` : "Command execution failed.",
    `Command: ${command}`
  ];

  if (result.stdout?.trim()) {
    errorLines.push("", "STDOUT:", result.stdout.trim());
  }

  if (result.stderr?.trim()) {
    errorLines.push("", "STDERR:", result.stderr.trim());
  }

  throw new Error(errorLines.join("\n"));
}

function extractJsonObject(output) {
  const startIndex = output.indexOf("{");
  const endIndex = output.lastIndexOf("}");

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error(`Unable to parse E2E fixture JSON from output:\n${output}`);
  }

  return JSON.parse(output.slice(startIndex, endIndex + 1));
}

function delay(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
