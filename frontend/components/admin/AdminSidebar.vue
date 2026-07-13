<template>
  <aside class="flex flex-col border-b border-slate-800 bg-slate-950/80 lg:min-h-[1160px] lg:border-b-0 lg:border-r">
    <div class="flex min-h-[96px] items-center gap-4 border-b border-slate-800 px-5 lg:min-h-[116px] lg:px-8">
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-750 text-title-4 text-violet-400"
        aria-hidden="true"
      >
        {{ adminInitials }}
      </div>
      <div class="min-w-0">
        <p class="truncate text-body-1 uppercase">{{ user?.username || "Administrator" }}</p>
        <span class="mt-2 inline-flex border border-slate-750 px-2 py-0.5 text-subtitle-3 uppercase text-slate-400">
          Admin
        </span>
      </div>
      <button
        type="button"
        class="ml-auto flex h-11 items-center justify-center border border-slate-800 px-4 text-subtitle-2 uppercase tracking-[0.12em] lg:hidden"
        :aria-expanded="adminMenuOpen"
        aria-controls="admin-navigation"
        @click="adminMenuOpen = !adminMenuOpen"
      >
        {{ adminMenuOpen ? "Close" : "Menu" }}
      </button>
    </div>

    <nav
      id="admin-navigation"
      class="px-4 py-6 lg:block lg:py-8"
      :class="adminMenuOpen ? 'block' : 'hidden'"
      aria-label="Admin navigation"
    >
      <p class="px-4 text-subtitle-3 uppercase tracking-[0.25em] text-slate-500">Main menu</p>
      <div class="mt-5 grid sm:grid-cols-2 lg:grid-cols-1">
        <NuxtLink
          v-for="item in mainNavigation"
          :key="item.route"
          :to="item.route"
          class="flex min-h-12 items-center gap-4 border-l-4 px-4 text-body-1 transition-colors"
          :class="
            isActive(item.route)
              ? 'border-slate-100 bg-slate-850 text-slate-100'
              : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-100'
          "
        >
          <span class="w-7 text-center text-subtitle-2">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>

      <p class="mt-8 px-4 text-subtitle-3 uppercase tracking-[0.25em] text-slate-500">System</p>
      <div class="mt-5 grid sm:grid-cols-2 lg:grid-cols-1">
        <NuxtLink
          v-for="item in systemNavigation"
          :key="item.route"
          :to="item.route"
          class="flex min-h-12 items-center gap-4 border-l-4 px-4 text-body-1 transition-colors"
          :class="
            isActive(item.route)
              ? 'border-slate-100 bg-slate-850 text-slate-100'
              : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-100'
          "
        >
          <span class="w-7 text-center text-subtitle-2">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <div
      class="mt-auto items-center justify-between border-t border-slate-800 px-6 py-6 lg:flex lg:px-8 lg:py-7"
      :class="adminMenuOpen ? 'flex' : 'hidden'"
    >
      <div>
        <p class="text-subtitle-3 uppercase text-slate-500">Admin session</p>
        <p class="mt-1 text-subtitle-2 text-green-400">● Authenticated</p>
      </div>
      <button
        type="button"
        class="text-title-3 text-slate-300 transition-colors hover:text-red-300"
        aria-label="Sign out"
        @click="handleLogout"
      >
        ↪
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { navigateTo, useRoute } from "#app";
import { storeToRefs } from "pinia";
import { adminNavigation } from "~/data/admin-navigation";
import { useAuthStore } from "~/stores/auth";
import { getArtistInitials } from "~/utils/marketplace";

const route = useRoute();
const auth = useAuthStore();
const { user } = storeToRefs(auth);
const adminMenuOpen = ref(false);
const adminInitials = computed(() => getArtistInitials(user.value?.username || "Admin"));
const mainNavigation = adminNavigation.filter((item) => item.route !== "/admin/settings");
const systemNavigation = adminNavigation.filter((item) => item.route === "/admin/settings");

watch(() => route.fullPath, () => {
  adminMenuOpen.value = false;
});

function isActive(targetRoute) {
  return targetRoute === "/admin" ? route.path === targetRoute : route.path.startsWith(targetRoute);
}

async function handleLogout() {
  await auth.logout();
  await navigateTo("/login");
}
</script>
