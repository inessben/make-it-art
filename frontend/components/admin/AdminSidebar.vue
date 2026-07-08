<template>
  <aside class="rounded-[28px] border border-[#1A1F2A] bg-[#090017] p-5 xl:p-6">
    <div class="rounded-[24px] border border-[#1A1F2A] bg-[#01050E] p-5">
      <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
        Backoffice
      </p>
      <h2 class="mt-3 text-2xl font-semibold text-[#E6EDF7]">Admin panel</h2>
      <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">
        Interface reservee a l'administration avec un parcours separe de
        l'espace membre.
      </p>
    </div>

    <nav class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
      <NuxtLink
        v-for="item in adminNavigation"
        :key="item.route"
        :to="item.route"
        class="group rounded-[22px] border px-4 py-4 transition duration-200"
        :class="
          isActive(item.route)
            ? 'border-[#4A6CF7] bg-[#4A6CF7]/10'
            : 'border-[#1A1F2A] bg-[#01050E] hover:border-[#2A3345] hover:bg-[#111827]'
        "
      >
        <div class="flex items-start gap-4">
          <span
            class="flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-semibold tracking-[0.12em]"
            :class="
              isActive(item.route)
                ? 'bg-[#4A6CF7] text-[#01050E]'
                : 'bg-[#4A6CF7]/10 text-[#4A6CF7]'
            "
          >
            {{ item.icon }}
          </span>

          <div class="min-w-0">
            <p
              class="text-sm font-semibold transition"
              :class="
                isActive(item.route) ? 'text-[#E6EDF7]' : 'text-[#D8E1F0]'
              "
            >
              {{ item.label }}
            </p>
            <p class="mt-1 text-sm leading-5 text-[#8E9AA7]">
              {{ item.description }}
            </p>
          </div>
        </div>
      </NuxtLink>
    </nav>

    <div class="mt-5 rounded-[24px] border border-[#1A1F2A] bg-[#01050E] p-5">
      <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
        Compte admin
      </p>
      <p class="mt-3 text-sm font-semibold text-[#E6EDF7]">
        {{ user?.username || "Administrateur" }}
      </p>
      <p class="mt-1 break-all text-sm leading-6 text-[#A0ADB4]">
        {{ user?.email || "Compte connecte" }}
      </p>

      <div class="mt-5 grid gap-3">
        <NuxtLink
          to="/admin/settings"
          class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        >
          Parametres admin
        </NuxtLink>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-2xl border border-[#3A1620] bg-[#1B0D13] px-5 py-3 text-sm font-semibold text-[#FFD7DE] transition hover:bg-[#271019]"
          @click="handleLogout"
        >
          Se deconnecter
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { navigateTo, useRoute } from "#app";
import { storeToRefs } from "pinia";
import { adminNavigation } from "~/data/admin-navigation";
import { useAuthStore } from "~/stores/auth";

const route = useRoute();
const auth = useAuthStore();
const { user } = storeToRefs(auth);

function isActive(targetRoute) {
  if (targetRoute === "/admin") {
    return route.path === targetRoute;
  }

  return route.path.startsWith(targetRoute);
}

async function handleLogout() {
  await auth.logout();
  await navigateTo("/login");
}
</script>
