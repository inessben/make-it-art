<template></template>

<script setup>
import { computed } from "vue";
import { useHead, useRuntimeConfig } from "#app";
import { useCookieConsent } from "~/composables/useCookieConsent";

const config = useRuntimeConfig();
const { hasAcceptedAnalytics } = useCookieConsent();

const isConfigured = Boolean(config.public.umamiSrc && config.public.umamiWebsiteId);

useHead({
  script: computed(() => {
    if (!isConfigured || !hasAcceptedAnalytics.value) return [];
    return [
      {
        src: config.public.umamiSrc,
        defer: true,
        "data-website-id": config.public.umamiWebsiteId
      }
    ];
  })
});
</script>
