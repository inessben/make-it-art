<template>
  <div class="grid min-h-screen place-items-center bg-black px-5 py-12 text-slate-100">
    <main class="ui-card w-full max-w-3xl px-6 py-14 text-center sm:px-12 sm:py-20">
      <NuxtLink to="/" class="inline-flex items-center gap-3" aria-label="Make It Art home">
        <img class="h-12 w-10 object-contain" src="/logo.png" alt="" />
        <span class="text-title-4">MAKE IT ART</span>
      </NuxtLink>
      <p class="mt-12 text-subtitle-2 uppercase tracking-[0.24em] text-violet-400">
        Error {{ error?.statusCode || 404 }}
      </p>
      <h1 class="mt-4 text-title-2 sm:text-title-1">Page not found</h1>
      <p class="mx-auto mt-5 max-w-xl text-body-1 leading-7 text-slate-400">
        The page you are looking for does not exist, has moved, or is no longer available.
      </p>
      <button type="button" class="ui-button-primary mt-9" @click="handleError">
        Return to homepage
      </button>
    </main>
  </div>
</template>

<script setup>
import { clearError } from "#app";

defineProps({ error: { type: Object, required: true } });

function handleError() {
  clearError({ redirect: "/" });
}
</script>
