const { ANALYTICS_FUNNELS } = require("../config/analytics-funnels");
const umamiService = require("./umami.service");

class FunnelNotFoundError extends Error {
  constructor(key) {
    super(`Unknown analytics funnel "${key}".`);
    this.name = "FunnelNotFoundError";
  }
}

function round(value) {
  return Math.round(value * 10) / 10;
}

async function computeFunnel(key, { startAt, endAt }) {
  const funnel = ANALYTICS_FUNNELS[key];

  if (!funnel) {
    throw new FunnelNotFoundError(key);
  }

  const eventCounts = await umamiService.getMetrics({ type: "event", startAt, endAt, limit: 100 });
  const countByEvent = new Map((eventCounts || []).map((entry) => [entry.x, Number(entry.y) || 0]));

  const steps = funnel.steps.map((step, index) => {
    const count = countByEvent.get(step.event) || 0;
    const previousCount =
      index === 0 ? count : countByEvent.get(funnel.steps[index - 1].event) || 0;
    const dropoffRate =
      index === 0 || previousCount === 0 ? 0 : round(100 - (count / previousCount) * 100);

    return { ...step, count, dropoffRate };
  });

  const firstCount = steps[0]?.count || 0;
  const lastCount = steps[steps.length - 1]?.count || 0;
  const conversionRate = firstCount === 0 ? 0 : round((lastCount / firstCount) * 100);

  return { key, label: funnel.label, steps, conversionRate };
}

function listFunnels() {
  return Object.entries(ANALYTICS_FUNNELS).map(([key, funnel]) => ({
    key,
    label: funnel.label,
    steps: funnel.steps
  }));
}

module.exports = { FunnelNotFoundError, computeFunnel, listFunnels };
