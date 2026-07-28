const env = require("../config/env");

const AI_TRAINING_BOT_PATTERN =
  /(gptbot|chatgpt-user|oai-searchbot|claudebot|anthropic-ai|ccbot|bytespider|amazonbot|google-extended|applebot-extended|meta-externalagent|facebookbot|diffbot|petalbot|semrushbot|ahrefsbot|dataforseo|omgili|img2dataset|cohere-ai|perplexitybot|youbot|ai2bot|webzio-extended|timpibot|iaskspider|kangaroo bot|sidetrade|imagesiftbot)/i;

const AUTOMATION_PATTERN =
  /(bot|crawler|spider|scraper|slurp|wget|curl|python-requests|httpclient|libwww|scrapy|headless|phantomjs|selenium|puppeteer|playwright)/i;

function getAllowedMediaOrigins() {
  return [env.appBaseUrl, env.corsOrigin]
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter((value) => value && value !== "*")
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function isAiTrainingBot(userAgent) {
  return typeof userAgent === "string" && AI_TRAINING_BOT_PATTERN.test(userAgent);
}

function isSuspiciousAutomation(userAgent) {
  if (!userAgent || typeof userAgent !== "string" || userAgent.trim().length < 12) {
    return true;
  }

  if (isAiTrainingBot(userAgent)) {
    return true;
  }

  return AUTOMATION_PATTERN.test(userAgent);
}

function isAllowedMediaReferer(req) {
  const allowedOrigins = getAllowedMediaOrigins();
  if (allowedOrigins.length === 0) {
    return true;
  }

  const referer = req.get("referer") || req.get("origin") || "";
  if (!referer) {
    // Direct navigations and some privacy browsers omit Referer; allow with rate limits.
    return true;
  }

  try {
    const origin = new URL(referer).origin;
    return allowedOrigins.includes(origin);
  } catch {
    return false;
  }
}

function blockAiTrainingBots(req, res, next) {
  const userAgent = req.get("user-agent") || "";

  if (isAiTrainingBot(userAgent)) {
    res.set("X-Robots-Tag", "noai, noimageai");
    return res.status(403).json({
      message: "Automated AI training and collection agents are not allowed.",
      code: "AI_BOT_BLOCKED"
    });
  }

  return next();
}

function artworkAntiScrapingGuard(req, res, next) {
  const userAgent = req.get("user-agent") || "";

  if (isSuspiciousAutomation(userAgent)) {
    res.set("X-Robots-Tag", "noai, noimageai");
    return res.status(403).json({
      message: "Automated media collection is not allowed.",
      code: "ARTWORK_SCRAPING_BLOCKED"
    });
  }

  if (!isAllowedMediaReferer(req)) {
    return res.status(403).json({
      message: "Hotlinking artwork media is not allowed.",
      code: "ARTWORK_HOTLINK_BLOCKED"
    });
  }

  return next();
}

module.exports = {
  AI_TRAINING_BOT_PATTERN,
  getAllowedMediaOrigins,
  isAiTrainingBot,
  isSuspiciousAutomation,
  isAllowedMediaReferer,
  blockAiTrainingBots,
  artworkAntiScrapingGuard
};
