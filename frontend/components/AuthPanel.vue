<template>
  <main class="auth-page">
    <form class="auth-form" :style="{ maxWidth }" @submit.prevent="$emit('submit')">
      <h1>{{ title }}</h1>
      <slot />
    </form>
  </main>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  maxWidth: {
    type: String,
    default: "420px"
  }
});

defineEmits(["submit"]);
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(50, 115, 220, 0.12), transparent 34%),
    linear-gradient(135deg, #f7f8fb 0%, #eef2f7 100%);
  color: #172033;
}

.auth-form {
  width: 100%;
  display: grid;
  gap: 10px;
  padding: 28px;
  border: 1px solid #dfe5ef;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 45px rgba(23, 32, 51, 0.12);
}

h1 {
  margin: 0 0 8px;
  font-size: 1.8rem;
  font-weight: 700;
}
</style>
