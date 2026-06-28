<template>
  <header
    class="rounded-[28px] border border-[#1A1F2A] bg-[#01050E] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.18)]"
  >
    <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">{{ eyebrow }}</p>
        <h1 class="mt-4 text-[clamp(2rem,2.6vw,3rem)] font-semibold leading-[1.05] text-[#E6EDF7]">
          {{ title }}
        </h1>
        <p class="mt-4 max-w-2xl text-sm leading-7 text-[#A0ADB4]">
          {{ description }}
        </p>
      </div>

      <div v-if="$slots.actions" class="flex flex-wrap gap-3">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
  eyebrow: {
    type: String,
    default: "Administration"
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  }
});
</script>
