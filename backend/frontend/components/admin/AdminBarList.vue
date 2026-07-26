<template>
  <div class="grid gap-4">
    <div v-for="item in visibleItems" :key="item.label" class="grid gap-2">
      <div class="flex items-center justify-between gap-3 text-footer text-slate-300">
        <span class="truncate">{{ item.label }}</span>
        <span class="shrink-0 text-slate-500">{{ item.value.toLocaleString() }}</span>
      </div>
      <div class="h-2 w-full bg-slate-900">
        <div
          class="h-2 bg-violet-700/70"
          :style="{ width: `${maxValue ? (item.value / maxValue) * 100 : 0}%` }"
        />
      </div>
    </div>
    <p v-if="!visibleItems.length" class="text-footer text-slate-500">No data for this period.</p>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  items: { type: Array, default: () => [] },
  maxItems: { type: Number, default: 8 }
});

const visibleItems = computed(() => props.items.slice(0, props.maxItems));
const maxValue = computed(() => Math.max(...visibleItems.value.map((item) => item.value), 1));
</script>
