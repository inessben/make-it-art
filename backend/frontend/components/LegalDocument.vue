<template>
  <main class="bg-black px-4 py-10 text-slate-100 sm:px-6 sm:py-16 lg:py-20">
    <article class="ui-card mx-auto max-w-5xl overflow-hidden">
      <header
        class="border-b border-slate-800 bg-gradient-to-br from-violet-950/70 to-slate-950 px-6 py-10 sm:px-10 sm:py-14"
      >
        <p class="text-subtitle-2 font-semibold uppercase tracking-[0.22em] text-violet-400">
          {{ label }}
        </p>
        <h1 class="mt-4 text-title-2 sm:text-title-1">{{ title }}</h1>
        <div
          class="mt-6 flex flex-col gap-2 text-body-1 text-slate-400 sm:flex-row sm:flex-wrap sm:gap-x-8"
        >
          <p>Make it Art</p>
          <p>Last updated: {{ lastUpdated }}</p>
          <p>{{ compliance }}</p>
        </div>
      </header>
      <div class="legal-content px-6 py-10 sm:px-10 sm:py-14">
        <slot />
      </div>
    </article>
  </main>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  title: { type: String, required: true },
  lastUpdated: { type: String, default: "July 2026" },
  compliance: { type: String, required: true }
});
</script>

<style scoped>
.legal-content :deep(section + section) {
  @apply mt-12 border-t border-slate-800 pt-10;
}

.legal-content :deep(h2) {
  @apply text-title-3 text-slate-100;
}

.legal-content :deep(h3) {
  @apply mt-7 text-body-2 text-violet-200;
}

.legal-content :deep(p) {
  @apply mt-4 text-body-1 leading-7 text-slate-300;
}

.legal-content :deep(ul) {
  @apply mt-4 grid list-disc gap-2 pl-6 text-body-1 leading-7 text-slate-300;
}

.legal-content :deep(a) {
  @apply font-semibold text-violet-400 underline underline-offset-4 hover:text-violet-200;
}

.legal-content :deep(.legal-note) {
  @apply mt-6 border-l-4 border-violet-600 bg-violet-950/40 px-5 py-4 text-slate-100;
}

.legal-content :deep(table) {
  @apply mt-4 w-full border-collapse overflow-hidden text-left text-body-1;
}

.legal-content :deep(th) {
  @apply border-b border-slate-700 bg-slate-900 px-4 py-3 text-subtitle-2 uppercase tracking-[0.08em] text-violet-300;
}

.legal-content :deep(td) {
  @apply border-b border-slate-800 px-4 py-3 align-top text-slate-300;
}

.legal-content :deep(tr:last-child td) {
  @apply border-b-0;
}
</style>
