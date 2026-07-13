<template>
  <AuthPanel
    title="Create your account"
    max-width="480px"
    @submit="handleRegister"
  >
    <TextField
      id="username"
      v-model="form.username"
      label="Username"
      autocomplete="username"
    />

    <TextField
      id="email"
      v-model="form.email"
      label="Email"
      type="email"
      autocomplete="email"
    />

    <TextField
      id="phone"
      v-model="form.phone"
      label="Phone number"
      type="tel"
      autocomplete="tel"
    />

    <PasswordField
      id="password"
      v-model="form.password"
      label="Password"
      autocomplete="new-password"
    />

    <PasswordStrengthFeedback :password="form.password" />

    <PasswordField
      id="confirm-password"
      v-model="form.confirmPassword"
      label="Confirm password"
      autocomplete="new-password"
    />

    <SubmitButton
      label="Create account"
      loading-label="Creating account..."
      :loading="loading"
    />

    <FormMessage :message="message" />

    <p class="text-center text-body-1 text-slate-400">
      Already have an account?
      <NuxtLink class="font-semibold text-violet-400 hover:underline" to="/login">Sign in</NuxtLink>
    </p>
  </AuthPanel>
</template>

<script setup>
import { reactive, ref } from "vue";
import {
  getPasswordConfirmationError,
  getPasswordValidationError,
} from "~/utils/password-validation";

definePageMeta({
  middleware: "guest",
});

const form = reactive({
  username: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
});

const message = ref("");
const loading = ref(false);

async function handleRegister() {
  message.value = "";

  const passwordError =
    getPasswordValidationError(form.password) ||
    getPasswordConfirmationError(form.password, form.confirmPassword);

  if (passwordError) {
    message.value = passwordError;
    return;
  }

  loading.value = true;

  try {
    const response = await $fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      body: {
        username: form.username,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
      },
    });

    message.value = response.message || "Account created";
  } catch (error) {
    message.value = error?.data?.message || "Registration failed";
  } finally {
    loading.value = false;
  }
}
</script>
