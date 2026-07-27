<template>
  <main class="min-h-screen bg-black px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
    <section
      class="mx-auto w-full max-w-[820px] rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-[0_32px_90px_rgba(0,0,0,0.22)] sm:rounded-[32px] sm:p-8"
    >
      <p class="text-xs uppercase tracking-widest text-violet-700">Access control</p>
      <h1 class="mt-4 text-title-2">Access denied</h1>
      <p class="mt-4 max-w-2xl text-slate-400 leading-7">
        This area is restricted to administrator accounts. To access it, an administrator role must
        be assigned to your account in the database.
      </p>

      <div class="mt-8 grid gap-4 sm:grid-cols-2">
        <NuxtLink
          :to="primaryRoute"
          class="inline-flex items-center justify-center rounded-2xl border border-violet-700 bg-violet-700/10 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-violet-700/20"
        >
          {{ primaryLabel }}
        </NuxtLink>

        <NuxtLink
          to="/"
          class="inline-flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-850 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-750"
        >
          Return home
        </NuxtLink>
      </div>
    </section>
  </main>
</template>

<script setup>
import { navigateTo } from "#app";
import { computed, onMounted } from "vue";
import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();

const primaryRoute = computed(() => {
  if (auth.isAdmin) {
    return "/admin";
  }

  if (auth.isAuthenticated) {
    return "/account-settings";
  }

  return "/login";
});

const primaryLabel = computed(() => {
  if (auth.isAdmin) {
    return "Go to admin dashboard";
  }

  if (auth.isAuthenticated) {
    return "Back to account";
  }

  return "Go to sign in";
});

onMounted(async () => {
  try {
    await auth.fetchCurrentUser();

    if (auth.isAdmin) {
      await navigateTo("/admin", { replace: true });
    }
  } catch {
    auth.user = null;
  }
});
</script>
