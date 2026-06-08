<template>
  <main class="verify-page">
    <section class="verify-panel">
      <h1>Email verification</h1>

      <p>{{ message }}</p>

      <NuxtLink v-if="verified" to="/login"> Go to login </NuxtLink>
    </section>
  </main>
</template>

<script setup>
const route = useRoute();
const message = ref("Verifying your email...");
const verified = ref(false);

onMounted(async () => {
  try {
    await $fetch(`/api/auth/verify-email?token=${route.query.token}`);

    message.value = "Your email has been verified. You can now log in.";
    verified.value = true;
  } catch (error) {
    message.value = error?.data?.message || "This verification link is invalid or expired.";
  }
});
</script>

<style scoped>
.verify-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(50, 115, 220, 0.12), transparent 34%),
    linear-gradient(135deg, #f7f8fb 0%, #eef2f7 100%);
  color: #172033;
}

.verify-panel {
  width: 100%;
  max-width: 420px;
  display: grid;
  gap: 14px;
  padding: 28px;
  border: 1px solid #dfe5ef;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 45px rgba(23, 32, 51, 0.12);
}

h1 {
  margin: 0;
  font-size: 1.8rem;
}

p {
  margin: 0;
  color: #5b6578;
}

a {
  color: #3273dc;
  font-weight: 700;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
