<template>
  <AuthPanel title="Login" max-width="360px" @submit="handleSubmit">
    <template v-if="!requiresCode">
      <TextField id="email" v-model="email" label="Email" type="email" autocomplete="email" />

      <PasswordField
        id="password"
        v-model="password"
        label="Password"
        autocomplete="current-password"
      />

      <SubmitButton label="Login" loading-label="Loading..." :loading="loading" />

      <FormMessage :message="message" />

      <button
        v-if="canResendVerification"
        type="button"
        class="text-button"
        :disabled="resending"
        @click="handleResendVerification"
      >
        {{ resending ? "Sending..." : "Resend verification email" }}
      </button>

      <p class="auth-link">
        <NuxtLink to="/forgot-password">Forgot password?</NuxtLink>
      </p>

      <p class="auth-link">
        Don't have an account?
        <NuxtLink to="/register">Create one</NuxtLink>
      </p>
    </template>

    <template v-else>
      <TextField
        id="code"
        v-model="code"
        label="Email code"
        type="text"
        autocomplete="one-time-code"
      />

      <label class="remember-device">
        <input v-model="rememberDevice" type="checkbox" />
        <span>Remember this computer for 30 days</span>
      </label>

      <SubmitButton label="Verify code" loading-label="Verifying..." :loading="loading" />

      <FormMessage :message="message" />

      <button type="button" class="text-button" @click="resetLoginStep">Back to login</button>
    </template>
  </AuthPanel>
</template>

<script setup>
const email = ref("");
const password = ref("");
const code = ref("");
const rememberDevice = ref(false);
const message = ref("");
const loading = ref(false);
const resending = ref(false);
const canResendVerification = ref(false);
const requiresCode = ref(false);

async function handleSubmit() {
  if (requiresCode.value) {
    await handleVerifyCode();
    return;
  }

  await handleLogin();
}

async function handleLogin() {
  loading.value = true;
  message.value = "";
  canResendVerification.value = false;

  try {
    const response = await $fetch("/api/auth/login", {
      method: "POST",
      body: {
        email: email.value,
        password: password.value
      }
    });

    if (response.requiresCode) {
      requiresCode.value = true;
      message.value = response.message || "Login code sent. Please check your email.";
      return;
    }

    await navigateTo("/profile");
  } catch (error) {
    message.value = error?.data?.message || "Login failed";
    canResendVerification.value = error?.statusCode === 403;
  } finally {
    loading.value = false;
  }
}

async function handleVerifyCode() {
  loading.value = true;
  message.value = "";

  try {
    await $fetch("/api/auth/verify-login-code", {
      method: "POST",
      body: {
        code: code.value,
        rememberDevice: rememberDevice.value
      }
    });

    await navigateTo("/profile");
  } catch (error) {
    message.value = error?.data?.message || "Invalid or expired login code.";
  } finally {
    loading.value = false;
  }
}

async function handleResendVerification() {
  resending.value = true;
  message.value = "";

  try {
    const response = await $fetch("/api/auth/resend-verification-email", {
      method: "POST",
      body: {
        email: email.value
      }
    });

    message.value = response.message || "Verification email sent.";
  } catch (error) {
    message.value = error?.data?.message || "Unable to resend verification email.";
  } finally {
    resending.value = false;
  }
}

function resetLoginStep() {
  requiresCode.value = false;
  code.value = "";
  rememberDevice.value = false;
  message.value = "";
}
</script>

<style scoped>
.text-button {
  margin: 0;
  border: 0;
  background: transparent;
  color: #3273dc;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.text-button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.text-button:hover:not(:disabled) {
  text-decoration: underline;
}

.remember-device {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #33415c;
  font-size: 0.94rem;
  font-weight: 600;
}

.remember-device input {
  width: 16px;
  height: 16px;
}

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
