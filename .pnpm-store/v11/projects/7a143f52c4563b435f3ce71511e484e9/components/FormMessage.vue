<template>
  <p v-if="message" role="status">{{ message }}</p>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: "",
  },
});
</script>

<style scoped>
p {
  @apply border border-slate-800 bg-slate-900/70 px-4 py-3 text-body-1 leading-6 text-slate-300;
}
</style>
