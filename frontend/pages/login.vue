<template>
  <AuthPanel title="Welcome back" max-width="440px" @submit="handleSubmit">
    <template v-if="requiresGooglePasswordLink">
      <p class="oauth-message">
        Enter your password to link Google sign-in for
        <strong>{{ email }}</strong>
      </p>

      <PasswordField
        id="google-link-password"
        v-model="password"
        label="Password"
        autocomplete="current-password"
      />

      <SubmitButton label="Link Google account" loading-label="Linking..." :loading="loading" />

      <FormMessage :message="message" />

      <button type="button" class="text-button" @click="resetGoogleLinkStep">Back to login</button>
    </template>

    <template v-else-if="!requiresCode">
      <button type="button" class="google-button" @click="startGoogleLogin">
        <img class="google-icon" src="/google.svg" alt="" aria-hidden="true" />
        <span>{{ GOOGLE_LOGIN_LABEL }}</span>
      </button>

      <div class="auth-divider"><span>or</span></div>

      <TextField id="email" v-model="email" label="Email" type="email" autocomplete="email" />

      <PasswordField
        id="password"
        v-model="password"
        label="Password"
        autocomplete="current-password"
      />

      <SubmitButton label="Sign in" loading-label="Signing in..." :loading="loading" />

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
import { navigateTo } from "#app";
import { onMounted, ref } from "vue";
import { useAuthStore } from "~/stores/auth";
import {
  getGoogleLoginMessage,
  getGoogleLoginUrl,
  GOOGLE_LOGIN_LABEL,
  isGoogleLinkRequired
} from "~/utils/google-auth";

definePageMeta({
  middleware: "guest"
});

const auth = useAuthStore();
const email = ref("");
const password = ref("");
const code = ref("");
const rememberDevice = ref(false);
const message = ref("");
const loading = ref(false);
const resending = ref(false);
const canResendVerification = ref(false);
const requiresCode = ref(false);
const requiresGooglePasswordLink = ref(false);
const route = useRoute();

onMounted(() => {
  const googleMessage = getGoogleLoginMessage(route.query.google);

  if (googleMessage) {
    message.value = googleMessage;
  }

  if (isGoogleLinkRequired(route.query.googleLink)) {
    requiresGooglePasswordLink.value = true;
    email.value = typeof route.query.email === "string" ? route.query.email : "";
    message.value = "A password is required to link this Google account.";
  }
});

async function handleSubmit() {
  if (requiresGooglePasswordLink.value) {
    await handleGoogleLink();
    return;
  }

  if (requiresCode.value) {
    await handleVerifyCode();
    return;
  }

  await handleLogin();
}

function startGoogleLogin() {
  window.location.assign(getGoogleLoginUrl(window.location.origin));
}

async function handleGoogleLink() {
  if (loading.value) {
    return;
  }

  loading.value = true;
  message.value = "";
  let linkedUser = null;
  let redirectTo = "";

  try {
    const response = await $fetch("/api/auth/google/link", {
      method: "POST",
      credentials: "include",
      body: {
        password: password.value
      }
    });

    linkedUser = response.user;
    redirectTo = response.redirectTo || "";
  } catch (error) {
    message.value = error?.data?.message || "Unable to complete Google sign-in.";
  } finally {
    loading.value = false;
  }

  if (linkedUser) {
    auth.user = linkedUser;
    await navigateTo(redirectTo || auth.defaultAuthenticatedRoute, {
      replace: true
    });
  }
}

async function handleLogin() {
  if (loading.value) {
    return;
  }

  loading.value = true;
  message.value = "";
  canResendVerification.value = false;
  let redirectTo = "";

  try {
    const response = await $fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
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

    auth.user = response.user;
    redirectTo = response.redirectTo || auth.defaultAuthenticatedRoute;
  } catch (error) {
    message.value = error?.data?.message || "Login failed";
    canResendVerification.value = error?.statusCode === 403;
  } finally {
    loading.value = false;
  }

  if (redirectTo) {
    await navigateTo(redirectTo, { replace: true });
  }
}

async function handleVerifyCode() {
  if (loading.value) {
    return;
  }

  loading.value = true;
  message.value = "";
  let verifiedUser = null;
  let redirectTo = "";

  try {
    const response = await $fetch("/api/auth/verify-login-code", {
      method: "POST",
      credentials: "include",
      body: {
        code: code.value,
        rememberDevice: rememberDevice.value
      }
    });

    verifiedUser = response.user;
    redirectTo = response.redirectTo || "";
  } catch (error) {
    message.value =
      error?.statusCode === 400
        ? "Login session expired. Please request a new code."
        : error?.data?.message || "Invalid or expired login code.";
  } finally {
    loading.value = false;
  }

  if (verifiedUser) {
    auth.user = verifiedUser;
    await navigateTo(redirectTo || auth.defaultAuthenticatedRoute, {
      replace: true
    });
  }
}

async function handleResendVerification() {
  resending.value = true;
  message.value = "";

  try {
    const response = await $fetch("/api/auth/resend-verification-email", {
      method: "POST",
      credentials: "include",
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

function resetGoogleLinkStep() {
  requiresGooglePasswordLink.value = false;
  password.value = "";
  message.value = "";
}
</script>

<style scoped>
.google-button {
  @apply inline-flex min-h-12 items-center justify-center gap-3 border border-slate-750 bg-slate-900 text-slate-100;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.google-button:hover,
.google-button:focus-visible {
  @apply border-violet-600 bg-slate-850;
}

.google-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, theme("colors.violet.700") 16%, transparent);
}

.google-icon {
  @apply h-[22px] w-[22px] shrink-0 object-contain;
}

.auth-divider {
  @apply flex items-center gap-3 text-subtitle-2 font-bold text-slate-500;
  font-weight: 700;
}

.auth-divider::before,
.auth-divider::after {
  height: 1px;
  flex: 1;
  @apply bg-slate-800;
  content: "";
}

.oauth-message {
  margin: 0;
  @apply text-body-1 leading-normal text-slate-400;
}

.text-button {
  margin: 0;
  border: 0;
  background: transparent;
  @apply text-violet-400;
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
  @apply flex items-center gap-2.5 text-body-1 text-slate-400;
  font-weight: 600;
}

.remember-device input {
  width: 16px;
  height: 16px;
}

.auth-link {
  @apply mt-2 text-center text-body-1;
}

.auth-link a {
  @apply text-violet-400;
  font-weight: 700;
  text-decoration: none;
}

.auth-link a:hover {
  text-decoration: underline;
}
</style>
