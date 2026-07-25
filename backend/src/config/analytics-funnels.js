/**
 * Conversion funnels are defined here as an ordered list of Umami custom
 * event names. To add a new business funnel: fire the event from the
 * frontend with useAnalyticsEvent().trackEvent("your_event_name", data)
 * (see frontend/composables/useAnalyticsEvent.js), then list it as a step
 * below - no backend code changes needed beyond this file.
 */
const ANALYTICS_FUNNELS = {
  "artwork-purchase": {
    label: "Artwork discovery to purchase",
    steps: [
      { event: "view_artwork", label: "View artwork" },
      { event: "add_to_wishlist", label: "Add to wishlist" },
      { event: "start_checkout", label: "Start checkout" },
      { event: "purchase_complete", label: "Purchase complete" }
    ]
  },
  "artist-follow": {
    label: "Artist discovery to follow",
    steps: [
      { event: "view_artist", label: "View artist profile" },
      { event: "follow_artist", label: "Follow artist" }
    ]
  }
};

module.exports = { ANALYTICS_FUNNELS };
