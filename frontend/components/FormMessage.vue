<template>
  <p v-if="message">{{ message }}</p>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: ""
  }
});
</script>

<style scoped>
p {
  margin: 2px 0 0;
  color: #5b6578;
}
</style>
