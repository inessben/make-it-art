const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { adminRequired } = require("../middlewares/admin-required.middleware");
const umamiService = require("../services/umami.service");
const funnelService = require("../services/analytics-funnel.service");

const router = express.Router();

const RANGE_TO_DAYS = { "24h": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365 };

function resolveRange(req) {
  const explicitStart = Number(req.query.startAt);
  const explicitEnd = Number(req.query.endAt);

  if (Number.isFinite(explicitStart) && Number.isFinite(explicitEnd)) {
    return { startAt: explicitStart, endAt: explicitEnd };
  }

  const days = RANGE_TO_DAYS[req.query.range] || RANGE_TO_DAYS["30d"];
  const endAt = Date.now();
  const startAt = endAt - days * 24 * 60 * 60 * 1000;

  return { startAt, endAt };
}

function resolveUnit(req) {
  return ["hour", "day", "month", "year"].includes(req.query.unit) ? req.query.unit : "day";
}

function handleUmamiError(res, error) {
  if (error instanceof umamiService.UmamiError) {
    return res.status(error.status || 502).json({ message: error.message });
  }

  throw error;
}

router.use("/admin/analytics", authRequired, adminRequired);

// Unique visitors, pageviews, sessions, avg session duration, bounce rate.
router.get("/admin/analytics/overview", async (req, res) => {
  try {
    const { startAt, endAt } = resolveRange(req);
    const stats = await umamiService.getStats({ startAt, endAt });

    const visits = stats.visits || 0;
    const bounces = stats.bounces || 0;
    const totalTime = stats.totaltime || 0;

    return res.status(200).json({
      uniqueVisitors: stats.visitors || 0,
      pageviews: stats.pageviews || 0,
      sessions: visits,
      bounceRate: visits === 0 ? 0 : Math.round((bounces / visits) * 1000) / 10,
      avgSessionDurationSeconds: visits === 0 ? 0 : Math.round(totalTime / visits)
    });
  } catch (error) {
    return handleUmamiError(res, error);
  }
});

router.get("/admin/analytics/active", async (_req, res) => {
  try {
    const active = await umamiService.getActive();
    return res.status(200).json({ activeVisitors: active?.visitors || 0 });
  } catch (error) {
    return handleUmamiError(res, error);
  }
});

// Time series for the requested granularity (day/week/month/year - "week" is
// just "day" data the frontend buckets client-side since Umami has no native
// week unit).
router.get("/admin/analytics/timeseries", async (req, res) => {
  try {
    const { startAt, endAt } = resolveRange(req);
    const unit = resolveUnit(req);
    const data = await umamiService.getPageviews({ startAt, endAt, unit });
    return res.status(200).json(data);
  } catch (error) {
    return handleUmamiError(res, error);
  }
});

function metricRoute(routePath, type) {
  router.get(routePath, async (req, res) => {
    try {
      const { startAt, endAt } = resolveRange(req);
      const limit = Number(req.query.limit) || 10;
      const data = await umamiService.getMetrics({ type, startAt, endAt, limit });
      return res.status(200).json({ type, data });
    } catch (error) {
      return handleUmamiError(res, error);
    }
  });
}

metricRoute("/admin/analytics/pages", "path");
metricRoute("/admin/analytics/referrers", "referrer");
metricRoute("/admin/analytics/browsers", "browser");
metricRoute("/admin/analytics/os", "os");
metricRoute("/admin/analytics/devices", "device");
metricRoute("/admin/analytics/countries", "country");
metricRoute("/admin/analytics/events", "event");
metricRoute("/admin/analytics/utm-sources", "utmSource");
metricRoute("/admin/analytics/utm-mediums", "utmMedium");
metricRoute("/admin/analytics/utm-campaigns", "utmCampaign");

router.get("/admin/analytics/funnels", async (_req, res) => {
  return res.status(200).json({ funnels: funnelService.listFunnels() });
});

router.get("/admin/analytics/funnels/:key", async (req, res) => {
  try {
    const { startAt, endAt } = resolveRange(req);
    const funnel = await funnelService.computeFunnel(req.params.key, { startAt, endAt });
    return res.status(200).json(funnel);
  } catch (error) {
    if (error instanceof funnelService.FunnelNotFoundError) {
      return res.status(404).json({ message: error.message });
    }
    return handleUmamiError(res, error);
  }
});

module.exports = router;
