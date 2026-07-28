<template>
  <div
    v-if="ready && !hasChosen"
    class="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 px-4 py-5 backdrop-blur sm:px-6"
    role="dialog"
    aria-modal="false"
    aria-live="polite"
    aria-label="Cookie consent"
  >
    <div
      class="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-body-1 leading-6 text-slate-300">
        We use strictly necessary cookies to run the Platform, and, only with your consent,
        privacy-friendly analytics cookies (Umami) to understand how the site is used. See our
        <NuxtLink to="/cookies" class="font-semibold text-violet-400 underline underline-offset-4"
          >Cookie Policy</NuxtLink
        >
        for details.
      </p>
      <div class="flex shrink-0 gap-3">
        <button type="button" class="ui-button-secondary" @click="reject">
          Reject non-essential
        </button>
        <button type="button" class="ui-button-primary" @click="accept">Accept all</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useCookieConsent } from "~/composables/useCookieConsent";

const { hasChosen, accept, reject } = useCookieConsent();
const ready = ref(false);

onMounted(() => {
  ready.value = true;
});
</script>
