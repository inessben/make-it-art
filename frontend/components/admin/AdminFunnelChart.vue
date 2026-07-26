<template>
  <div class="grid gap-4">
    <div v-for="(step, index) in steps" :key="step.event" class="grid gap-2">
      <div class="flex items-center justify-between text-footer text-slate-300">
        <span>{{ index + 1 }}. {{ step.label }}</span>
        <span class="text-slate-100">{{ step.count.toLocaleString() }}</span>
      </div>
      <div class="h-3 w-full bg-slate-900">
        <div
          class="h-3 bg-violet-700/70 transition-all"
          :style="{ width: `${widthFor(step.count)}%` }"
        />
      </div>
      <p v-if="index > 0" class="text-subtitle-3 text-red-300">
        −{{ step.dropoffRate }}% drop-off from previous step
      </p>
    </div>
    <p v-if="!steps.length" class="text-footer text-slate-500">No data for this period.</p>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  steps: { type: Array, default: () => [] }
});

const maxValue = computed(() => Math.max(...props.steps.map((step) => step.count), 1));

function widthFor(count) {
  return maxValue.value ? Math.max((count / maxValue.value) * 100, count ? 3 : 0) : 0;
}
</script>
