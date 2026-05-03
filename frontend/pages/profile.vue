<template>
  <main class="profile-page">
    <section class="profile-panel">
      <h1>Profile</h1>

      <p v-if="loading">Loading...</p>

      <template v-else-if="user">
        <p>{{ user.username }}</p>
        <p>{{ user.email }}</p>

        <button type="button" @click="handleLogout">Logout</button>
      </template>

      <p v-else>{{ message }}</p>
    </section>
  </main>
</template>

<script setup>
const user = ref(null);
const loading = ref(true);
const message = ref("");

onMounted(async () => {
  try {
    const response = await $fetch("/api/auth/me");
    user.value = response.user;
  } catch (error) {
    message.value = error?.data?.message || "Not authenticated";
    await navigateTo("/login");
  } finally {
    loading.value = false;
  }
});

async function handleLogout() {
  await $fetch("/api/auth/logout", {
    method: "POST"
  });

  await navigateTo("/login");
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(50, 115, 220, 0.12), transparent 34%),
    linear-gradient(135deg, #f7f8fb 0%, #eef2f7 100%);
  color: #172033;
}

.profile-panel {
  width: 100%;
  max-width: 420px;
  display: grid;
  gap: 12px;
  padding: 28px;
  border: 1px solid #dfe5ef;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 45px rgba(23, 32, 51, 0.12);
}

h1,
p {
  margin: 0;
}

button {
  min-height: 44px;
  border: 0;
  border-radius: 6px;
  background: #172033;
  color: #ffffff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
</style>
