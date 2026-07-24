<template>
  <AuthPanel
    :title="panelTitle"
    :description="panelDescription"
    max-width="440px"
    @submit="handleSubmit"
  >
    <PasswordField
      id="password"
      v-model="password"
      label="New password"
      autocomplete="new-password"
    />

    <PasswordStrengthFeedback :password="password" />

    <PasswordField
      id="confirm-password"
      v-model="confirmPassword"
      label="Confirm password"
      autocomplete="new-password"
    />

    <SubmitButton :label="submitLabel" :loading-label="submitLoadingLabel" :loading="loading" />

    <FormMessage :message="message" />

    <p v-if="success" class="auth-link">
      <NuxtLink to="/login">Go to login</NuxtLink>
    </p>
  </AuthPanel>
</template>

<script setup>
import {
  getPasswordConfirmationError,
  getPasswordValidationError
} from "~/utils/password-validation";

const route = useRoute();
const isInvitationMode = computed(() => route.query.mode === "invite");

const password = ref("");
const confirmPassword = ref("");
const message = ref("");
const loading = ref(false);
const success = ref(false);

const panelTitle = computed(() => (isInvitationMode.value ? "Activate account" : "Reset password"));
const panelDescription = computed(() =>
  isInvitationMode.value
    ? "Choose your password to activate your account."
    : "Choose a strong new password for your account."
);
const submitLabel = computed(() =>
  isInvitationMode.value ? "Activate account" : "Reset password"
);
const submitLoadingLabel = computed(() =>
  isInvitationMode.value ? "Activating..." : "Resetting..."
);

async function handleSubmit() {
  message.value = "";
  success.value = false;

  const passwordError =
    getPasswordValidationError(password.value) ||
    getPasswordConfirmationError(password.value, confirmPassword.value);

  if (passwordError) {
    message.value = passwordError;
    return;
  }

  loading.value = true;

  try {
    const response = await $fetch("/api/auth/reset-password", {
      method: "POST",
      body: {
        token: route.query.token,
        password: password.value,
        confirmPassword: confirmPassword.value
      }
    });

    message.value = response.message || "Password reset successfully. You can now log in.";
    success.value = true;
    password.value = "";
    confirmPassword.value = "";
  } catch (error) {
    message.value = error?.data?.message || "Unable to reset password.";
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
