<template>
  <AuthPanel title="Forgot password" max-width="420px" @submit="handleSubmit">
    <TextField id="email" v-model="email" label="Email" type="email" autocomplete="email" />

    <SubmitButton label="Send reset link" loading-label="Sending..." :loading="loading" />

    <FormMessage :message="message" />

    <p class="auth-link">
      <NuxtLink to="/login">Back to login</NuxtLink>
    </p>
  </AuthPanel>
</template>

<script setup>
const email = ref("");
const message = ref("");
const loading = ref(false);

async function handleSubmit() {
  loading.value = true;
  message.value = "";

  try {
    const response = await $fetch("/api/auth/forgot-password", {
      method: "POST",
      body: {
        email: email.value
      }
    });

    message.value =
      response.message || "If this email exists, a password reset link has been sent.";
  } catch (error) {
    message.value =
      error?.data?.message || "If this email exists, a password reset link has been sent.";
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
