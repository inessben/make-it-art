<template>
  <div class="grid gap-3">
    <svg
      v-if="points.length"
      viewBox="0 0 600 200"
      preserveAspectRatio="none"
      class="h-48 w-full"
      role="img"
      :aria-label="ariaLabel"
    >
      <polyline :points="areaPoints" fill="rgba(124, 58, 237, 0.18)" stroke="none" />
      <polyline
        :points="linePoints"
        fill="none"
        stroke="rgb(167, 139, 250)"
        stroke-width="2.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </svg>
    <p v-else class="py-10 text-center text-footer text-slate-500">No data for this period.</p>

    <div v-if="points.length" class="flex justify-between text-subtitle-3 text-slate-500">
      <span>{{ points[0]?.label }}</span>
      <span v-if="points.length > 1">{{ points[points.length - 1]?.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  points: { type: Array, default: () => [] },
  ariaLabel: { type: String, default: "Time series chart" }
});

const maxValue = computed(() => Math.max(...props.points.map((point) => point.value), 1));

const linePoints = computed(() => {
  if (!props.points.length) return "";
  const step = props.points.length > 1 ? 600 / (props.points.length - 1) : 0;
  return props.points
    .map((point, index) => {
      const x = props.points.length > 1 ? index * step : 300;
      const y = 190 - (point.value / maxValue.value) * 180;
      return `${x},${y}`;
    })
    .join(" ");
});

const areaPoints = computed(() => {
  if (!props.points.length) return "";
  const step = props.points.length > 1 ? 600 / (props.points.length - 1) : 0;
  const last = props.points.length > 1 ? (props.points.length - 1) * step : 300;
  return `0,200 ${linePoints.value} ${last},200`;
});
</script>
