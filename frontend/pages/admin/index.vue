<template>
  <AdminShell
    title="Dashboard admin"
    description="Vue d'ensemble reelle du backoffice a partir des donnees actuellement presentes en base."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20"
        :disabled="loading"
        @click="loadDashboard"
      >
        {{ loading ? "Refreshing..." : "Refresh dashboard" }}
      </button>
    </template>

    <section class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <article
        v-for="statCard in stats"
        :key="statCard.label"
        class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6"
      >
        <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">{{ statCard.label }}</p>
        <p class="mt-4 text-3xl font-semibold text-white">{{ statCard.value }}</p>
        <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">{{ statCard.description }}</p>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Activite recente</p>
            <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Derniers signaux utiles</h2>
          </div>
          <span class="rounded-full bg-[#4A6CF7]/10 px-4 py-2 text-sm font-semibold text-[#4A6CF7]">
            Live data
          </span>
        </div>

        <div
          v-if="errorMessage"
          class="mt-6 rounded-2xl border border-[#7f1d1d] bg-[#2b1014] px-5 py-4 text-sm text-[#FECACA]"
        >
          {{ errorMessage }}
        </div>

        <div
          v-else-if="loading"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
        >
          Chargement du dashboard...
        </div>

        <div v-else class="mt-6 grid gap-4">
          <div
            v-for="activity in activities"
            :key="activity.title"
            class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-5"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm font-semibold text-[#E6EDF7]">{{ activity.title }}</p>
                <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">{{ activity.description }}</p>
              </div>
              <span class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
                {{ activity.tag }}
              </span>
            </div>
          </div>
        </div>
      </article>

      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Raccourcis</p>
        <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Acces rapides</h2>

        <div class="mt-6 grid gap-4">
          <NuxtLink
            v-for="shortcut in shortcuts"
            :key="shortcut.route"
            :to="shortcut.route"
            class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] px-5 py-4 transition hover:border-[#2A3345] hover:bg-[#111827]"
          >
            <p class="text-sm font-semibold text-[#E6EDF7]">{{ shortcut.label }}</p>
            <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">{{ shortcut.description }}</p>
          </NuxtLink>
        </div>
      </article>
    </section>
  </AdminShell>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { navigateTo } from "#app";

definePageMeta({
  middleware: "admin"
});

const loading = ref(true);
const errorMessage = ref("");
const stats = ref([]);
const activities = ref([]);
const shortcuts = ref([]);

onMounted(async () => {
  await loadDashboard();
});

async function loadDashboard() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/admin/dashboard", {
      credentials: "include"
    });

    stats.value = response.stats || [];
    activities.value = response.activities || [];
    shortcuts.value = response.shortcuts || [];
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to load admin dashboard.";
  } finally {
    loading.value = false;
  }
}
</script>
