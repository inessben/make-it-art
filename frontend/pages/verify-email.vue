<template>
  <AuthPanel
    title="Email verification"
    description="We are securely confirming your email address."
    max-width="440px"
    @submit="goToLogin"
  >
    <div class="grid place-items-center py-3" aria-live="polite" :aria-busy="!complete">
      <span
        v-if="!complete"
        class="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-violet-600"
        aria-hidden="true"
      />
      <span
        v-else
        class="grid h-10 w-10 place-items-center rounded-full border border-violet-600 text-violet-400"
        aria-hidden="true"
        >✓</span
      >
    </div>
    <FormMessage :message="message" />
    <NuxtLink v-if="complete" class="ui-button-primary" to="/login">Go to sign in</NuxtLink>
  </AuthPanel>
</template>

<script setup>
const route = useRoute();
const message = ref("Verifying your email...");
const complete = ref(false);

onMounted(async () => {
  try {
    await $fetch(`/api/auth/verify-email?token=${route.query.token}`);
    message.value = "Your email has been verified. You can now sign in.";
  } catch (error) {
    message.value = error?.data?.message || "This verification link is invalid or expired.";
  } finally {
    complete.value = true;
  }
});

function goToLogin() {
  return navigateTo("/login");
}
</script>
