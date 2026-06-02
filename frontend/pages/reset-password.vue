<template>
  <AuthPanel title="Reset password" max-width="420px" @submit="handleSubmit">
    <PasswordField
      id="password"
      v-model="password"
      label="New password"
      autocomplete="new-password"
    />

    <SubmitButton label="Reset password" loading-label="Resetting..." :loading="loading" />

    <FormMessage :message="message" />

    <p v-if="success" class="auth-link">
      <NuxtLink to="/login">Go to login</NuxtLink>
    </p>
  </AuthPanel>
</template>

<script setup>
const route = useRoute();

const password = ref("");
const message = ref("");
const loading = ref(false);
const success = ref(false);

async function handleSubmit() {
  loading.value = true;
  message.value = "";
  success.value = false;

  try {
    const response = await $fetch("/api/auth/reset-password", {
      method: "POST",
      body: {
        token: route.query.token,
        password: password.value
      }
    });

    message.value = response.message || "Password reset successfully. You can now log in.";
    success.value = true;
    password.value = "";
  } catch (error) {
    message.value = error?.data?.message || "Unable to reset password.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-link {
  margin-top: 8px;
  text-align: center;
  font-size: 0.94rem;
}

.auth-link a {
  color: #3273dc;
  font-weight: 700;
  text-decoration: none;
}

.auth-link a:hover {
  text-decoration: underline;
}
</style>
