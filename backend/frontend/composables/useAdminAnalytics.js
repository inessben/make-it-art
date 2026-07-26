/**
 * Thin wrapper around the backend's /api/admin/analytics/* proxy (which in
 * turn talks to Umami server-to-server - the browser never calls Umami
 * directly). One function per widget, so the admin/analytics.vue page stays
 * a plain composition of calls instead of ad-hoc $fetch scattered around.
 */
export function useAdminAnalytics() {
  function request(path, query = {}) {
    return $fetch(`/api/admin/analytics/${path}`, {
      credentials: "include",
      query
    });
  }

  const getOverview = (range) => request("overview", { range });
  const getActive = () => request("active");
  const getTimeseries = (range, unit) => request("timeseries", { range, unit });
  const getPages = (range) => request("pages", { range });
  const getReferrers = (range) => request("referrers", { range });
  const getBrowsers = (range) => request("browsers", { range });
  const getOs = (range) => request("os", { range });
  const getDevices = (range) => request("devices", { range });
  const getCountries = (range) => request("countries", { range });
  const getEvents = (range) => request("events", { range });
  const getUtmSources = (range) => request("utm-sources", { range });
  const getUtmMediums = (range) => request("utm-mediums", { range });
  const getUtmCampaigns = (range) => request("utm-campaigns", { range });
  const listFunnels = () => request("funnels");
  const getFunnel = (key, range) => request(`funnels/${key}`, { range });

  return {
    getOverview,
    getActive,
    getTimeseries,
    getPages,
    getReferrers,
    getBrowsers,
    getOs,
    getDevices,
    getCountries,
    getEvents,
    getUtmSources,
    getUtmMediums,
    getUtmCampaigns,
    listFunnels,
    getFunnel
  };
}
