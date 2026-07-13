<template>
  <header class="border-b border-slate-800 bg-slate-950/60">
    <div
      class="flex min-h-[64px] flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-title-4 uppercase sm:text-title-3">
        Make It Art / <span class="text-violet-600">{{ eyebrow }}</span>
      </p>
      <div v-if="$slots.actions" class="flex flex-wrap gap-3">
        <slot name="actions" />
      </div>
    </div>

    <div class="border-t border-slate-900 px-5 py-7 lg:px-8">
      <h1 class="text-title-2 text-slate-100">{{ title }}</h1>
      <p class="mt-3 max-w-3xl text-body-1 leading-7 text-slate-400">
        {{ description }}
      </p>
    </div>
  </header>
</template>

<script setup>
defineProps({
  eyebrow: { type: String, default: "Admin" },
  title: { type: String, required: true },
  description: { type: String, required: true },
});
</script>
