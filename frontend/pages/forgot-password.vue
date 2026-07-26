<template>
  <AuthPanel
    title="Forgot password"
    :description="
      requestSucceeded ? '' : 'Enter your account email and we will send you a secure reset link.'
    "
    max-width="440px"
    @submit="handleSubmit"
  >
    <template v-if="requestSucceeded">
      <FormMessage message="If this email exists, a password reset link has been sent." />
    </template>

    <template v-else>
      <TextField id="email" v-model="email" label="Email" type="email" autocomplete="email" />

      <SubmitButton label="Send reset link" loading-label="Sending..." :loading="loading" />

      <FormMessage :message="message" />

      <p class="auth-link">
        <NuxtLink to="/login">Back to login</NuxtLink>
      </p>
    </template>
  </AuthPanel>
</template>

<script setup>
const email = ref("");
const message = ref("");
const loading = ref(false);
const requestSucceeded = ref(false);

async function handleSubmit() {
  if (loading.value || requestSucceeded.value) {
    return;
  }

  loading.value = true;
  message.value = "";

  try {
    await $fetch("/api/auth/forgot-password", {
      method: "POST",
      body: {
        email: email.value
      }
    });

    email.value = "";
    requestSucceeded.value = true;
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
  @apply mt-2 text-center text-body-1;
}

.auth-link a {
  @apply text-violet-700;
  font-weight: 700;
  text-decoration: none;
}

.auth-link a:hover {
  text-decoration: underline;
}
</style>
