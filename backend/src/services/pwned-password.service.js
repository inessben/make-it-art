const { createHash } = require("node:crypto");

const PWNED_PASSWORDS_API_URL = "https://api.pwnedpasswords.com/range";
const PWNED_PASSWORDS_TIMEOUT_MS = 3000;
const PWNED_PASSWORDS_USER_AGENT = "Make-It-Art-Password-Security";

function getPasswordHashParts(password) {
  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();

  return {
    prefix: hash.slice(0, 5),
    suffix: hash.slice(5)
  };
}

function findBreachCount(rangeResponse, expectedSuffix) {
  for (const line of rangeResponse.split(/\r?\n/u)) {
    const [suffix, countValue] = line.trim().split(":");

    if (suffix?.toUpperCase() !== expectedSuffix) {
      continue;
    }

    const count = Number.parseInt(countValue, 10);
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  return 0;
}

async function getPwnedPasswordBreachCount(
  password,
  {
    fetchImpl = globalThis.fetch,
    timeoutMs = PWNED_PASSWORDS_TIMEOUT_MS,
    apiUrl = PWNED_PASSWORDS_API_URL
  } = {}
) {
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is unavailable");
  }

  const { prefix, suffix } = getPasswordHashParts(password);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetchImpl(`${apiUrl}/${prefix}`, {
      method: "GET",
      headers: {
        "Add-Padding": "true",
        "User-Agent": PWNED_PASSWORDS_USER_AGENT
      },
      signal: abortController.signal
    });

    if (!response.ok) {
      throw new Error(`Pwned Passwords returned HTTP ${response.status}`);
    }

    return findBreachCount(await response.text(), suffix);
  } finally {
    clearTimeout(timeout);
  }
}

async function checkPwnedPassword(password, options = {}) {
  try {
    const breachCount = await getPwnedPasswordBreachCount(password, options);

    return {
      available: true,
      breachCount
    };
  } catch (_error) {
    return {
      available: false,
      breachCount: 0
    };
  }
}

module.exports = {
  checkPwnedPassword,
  findBreachCount,
  getPasswordHashParts,
  getPwnedPasswordBreachCount,
  PWNED_PASSWORDS_API_URL,
  PWNED_PASSWORDS_TIMEOUT_MS,
  PWNED_PASSWORDS_USER_AGENT
};
