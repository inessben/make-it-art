<template>
  <section
    class="grid place-items-center border text-center"
    :class="[panelClass, compact ? 'min-h-0 px-4 py-4 sm:px-5' : 'min-h-52 px-5 py-8 sm:px-6 sm:py-10']"
    :aria-live="type === 'loading' ? 'polite' : 'assertive'"
    :aria-busy="type === 'loading'"
    :role="type === 'error' ? 'alert' : 'status'"
  >
    <div class="max-w-xl">
      <span
        v-if="type === 'loading'"
        class="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-slate-700 border-t-violet-600"
        aria-hidden="true"
      />
      <span
        v-else-if="!compact"
        class="mx-auto grid h-10 w-10 place-items-center border text-title-4"
        :class="iconClass"
        aria-hidden="true"
      >
        {{ icon }}
      </span>
      <h2 v-if="title" class="mt-4 text-title-3 text-slate-100">{{ title }}</h2>
      <p class="mt-3 text-body-1 leading-7" :class="messageClass">
        {{ message }}
      </p>
      <button
        v-if="actionLabel"
        type="button"
        class="ui-button-secondary mt-6 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="actionDisabled"
        @click="$emit('action')"
      >
        {{ actionLabel }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  type: { type: String, default: "empty" },
  title: { type: String, default: "" },
  message: { type: String, required: true },
  actionLabel: { type: String, default: "" },
  actionDisabled: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
});

const compact = computed(() => props.compact);

defineEmits(["action"]);

const panelClass = computed(() => ({
  loading: "border-slate-800 bg-slate-950/70",
  empty: "border-slate-800 bg-slate-950/70",
  error: "border-red-900 bg-red-950/70",
  success: "border-green-900 bg-green-950/60",
  disabled: "border-slate-800 bg-black/50 opacity-70",
}[props.type] || "border-slate-800 bg-slate-950/70"));

const iconClass = computed(() => ({
  empty: "border-slate-700 text-slate-400",
  error: "border-red-800 text-red-300",
  success: "border-green-800 text-green-300",
  disabled: "border-slate-800 text-slate-500",
}[props.type] || "border-slate-700 text-slate-400"));

const messageClass = computed(() => ({
  error: "text-red-200",
  success: "text-green-200",
  disabled: "text-slate-500",
}[props.type] || "text-slate-400"));

const icon = computed(() => ({
  empty: "—",
  error: "!",
  success: "✓",
  disabled: "×",
}[props.type] || "•"));
</script>
