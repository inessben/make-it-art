import { computed } from "vue";
import { defineNuxtPlugin, useHead, useRuntimeConfig } from "#app";
import { useCookieConsent } from "~/composables/useCookieConsent";

// Served first-party through nginx/Caddy's narrow /stats/ proxy (see
// infrastructure/nginx/default.conf and infrastructure/Caddyfile) so the
// tracker isn't blocked by ad-blockers and never exposes Umami's own domain.
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const { hasAcceptedAnalytics } = useCookieConsent();
  const isConfigured = Boolean(config.public.umamiWebsiteId);

  useHead({
    script: computed(() => {
      if (!isConfigured || !hasAcceptedAnalytics.value) return [];
      return [
        {
          // No data-host-url: Umami derives the collect endpoint from the
          // script tag's own path (same directory, api/send instead of
          // script.js), so this must keep living under /stats/.
          src: "/stats/script.js",
          defer: true,
          "data-website-id": config.public.umamiWebsiteId
        }
      ];
    })
  });
});
