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
  min-height: 44px;
  margin-top: 8px;
  border: 0;
  border-radius: 6px;
  background: #172033;
  color: #ffffff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.18s ease,
    transform 0.18s ease;
}

button:hover:not(:disabled) {
  background: #26344f;
  transform: translateY(-1px);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}
</style>
