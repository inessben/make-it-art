/**
 * Fires a custom Umami event (window.umami.track), a no-op if the tracker
 * script hasn't loaded (analytics consent not granted, or Umami not
 * configured). Add new business events by calling this from anywhere in the
 * app - no other wiring needed for the event to start showing up in the
 * admin Analytics tab's event breakdown. To make it part of a funnel, also
 * add the event name to a funnel's `steps` in
 * backend/src/config/analytics-funnels.js.
 */
export function useAnalyticsEvent() {
  function trackEvent(name, data) {
    if (import.meta.server) return;
    if (typeof window.umami?.track !== "function") return;
    window.umami.track(name, data);
  }

  return { trackEvent };
}
