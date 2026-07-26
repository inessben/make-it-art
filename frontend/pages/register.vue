<template>
  <AuthPanel title="Create your account" max-width="480px" @submit="handleRegister">
    <template v-if="registrationSucceeded">
      <FormMessage message="Account created. Please verify your email before logging in." />
    </template>

    <template v-else>
      <TextField id="username" v-model="form.username" label="Username" autocomplete="username" />

      <TextField id="email" v-model="form.email" label="Email" type="email" autocomplete="email" />

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
        :minlength="MIN_PASSWORD_LENGTH"
      />

      <PasswordStrengthFeedback
        :password="form.password"
        :user-inputs="[form.username, form.email]"
      />

      <PasswordField
        id="confirm-password"
        v-model="form.confirmPassword"
        label="Confirm password"
        autocomplete="new-password"
        :minlength="MIN_PASSWORD_LENGTH"
      />

      <SubmitButton label="Create account" loading-label="Creating account..." :loading="loading" />

      <FormMessage :message="message" />

      <p class="text-center text-body-1 text-slate-400">
        Already have an account?
        <NuxtLink class="font-semibold text-violet-400 hover:underline" to="/login">
          Sign in
        </NuxtLink>
      </p>
    </template>
  </AuthPanel>
</template>

<script setup>
import { reactive, ref } from "vue";
import {
  getPasswordConfirmationError,
  getPasswordValidationError,
  MIN_PASSWORD_LENGTH
} from "~/utils/password-validation";

definePageMeta({
  middleware: "guest"
});

const form = reactive({
  username: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: ""
});

const message = ref("");
const loading = ref(false);
const registrationSucceeded = ref(false);

async function handleRegister() {
  if (loading.value || registrationSucceeded.value) {
    return;
  }

  message.value = "";

  const passwordError =
    getPasswordValidationError(form.password, [form.username, form.email]) ||
    getPasswordConfirmationError(form.password, form.confirmPassword);

  if (passwordError) {
    message.value = passwordError;
    return;
  }

  loading.value = true;

  try {
    await $fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      body: {
        username: form.username,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword
      }
    });

    Object.assign(form, {
      username: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: ""
    });
    registrationSucceeded.value = true;
  } catch (error) {
    message.value = error?.data?.message || "Registration failed";
  } finally {
    loading.value = false;
  }
}
</script>
