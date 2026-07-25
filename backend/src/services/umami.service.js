const env = require("../config/env");
const { redis } = require("../lib/redis");

const TOKEN_CACHE_KEY = "umami:auth_token";
const TOKEN_CACHE_TTL_SECONDS = 60 * 60; // Umami tokens are long-lived; refetch hourly to stay safe.

class UmamiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "UmamiError";
    this.status = status;
  }
}

function assertConfigured() {
  if (!env.umami.username || !env.umami.password) {
    throw new UmamiError("Umami API credentials are not configured (UMAMI_API_USERNAME/PASSWORD).", 503);
  }

  if (!env.umami.websiteId) {
    throw new UmamiError(
      "UMAMI_WEBSITE_ID is not configured. Create the website in Umami's onboarding once, then copy its id.",
      503
    );
  }
}

async function login() {
  const response = await fetch(`${env.umami.internalUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: env.umami.username, password: env.umami.password })
  });

  if (!response.ok) {
    throw new UmamiError(`Umami login failed (${response.status}).`, 502);
  }

  const data = await response.json();
  return data.token;
}

async function getToken({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = await redis.get(TOKEN_CACHE_KEY);
    if (cached) return cached;
  }

  const token = await login();
  await redis.set(TOKEN_CACHE_KEY, token, { EX: TOKEN_CACHE_TTL_SECONDS });

  return token;
}

async function umamiFetch(path, { query = {}, retrying = false } = {}) {
  assertConfigured();

  const token = await getToken();
  const url = new URL(`${env.umami.internalUrl}${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (response.status === 401 && !retrying) {
    await redis.del(TOKEN_CACHE_KEY);
    return umamiFetch(path, { query, retrying: true });
  }

  if (!response.ok) {
    throw new UmamiError(`Umami API request failed (${response.status}) for ${path}.`, 502);
  }

  return response.json();
}

function websitePath(suffix) {
  return `/api/websites/${env.umami.websiteId}${suffix}`;
}

async function getStats({ startAt, endAt }) {
  return umamiFetch(websitePath("/stats"), { query: { startAt, endAt } });
}

async function getPageviews({ startAt, endAt, unit = "day", timezone = "UTC" }) {
  return umamiFetch(websitePath("/pageviews"), { query: { startAt, endAt, unit, timezone } });
}

async function getActive() {
  return umamiFetch(websitePath("/active"));
}

/**
 * type: path | referrer | browser | os | device | country | event | query |
 * language | screen | city | region | hostname | utmSource | utmMedium |
 * utmCampaign | utmContent | utmTerm (verified against Umami v3's API -
 * these values are NOT the same as Umami v2's docs, e.g. "path" not "url").
 */
async function getMetrics({ type, startAt, endAt, limit = 10 }) {
  return umamiFetch(websitePath("/metrics"), { query: { type, startAt, endAt, limit } });
}

module.exports = {
  UmamiError,
  getToken,
  getStats,
  getPageviews,
  getActive,
  getMetrics
};
