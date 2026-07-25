<template>
  <button type="submit" :disabled="loading">
    {{ loading ? loadingLabel : label }}
  </button>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    required: true
  },
  loadingLabel: {
    type: String,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
button {
  @apply mt-1 min-h-12 cursor-pointer border border-violet-600 bg-violet-600 px-6 text-body-2 text-white transition;
}

button:hover:not(:disabled) {
  @apply bg-violet-600;
  transform: translateY(-1px);
}

button:disabled {
  @apply cursor-not-allowed opacity-70;
}
</style>
