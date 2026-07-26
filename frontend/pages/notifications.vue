<template>
  <main class="min-h-screen bg-[#000000] px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto w-full max-w-[1120px] rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Notifications</p>
          <h1 class="mt-4 text-[clamp(2rem,2.5vw,2.8rem)] font-semibold leading-[1.05]">
            Centre de notifications
          </h1>
          <p class="mt-4 max-w-2xl text-[#A0ADB4] leading-7">
            Retrouvez vos alertes de vente et l'historique de votre activite metier.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20 disabled:opacity-60"
            :disabled="loading || unreadCount === 0"
            @click="markAllRead"
          >
            Tout marquer comme lu
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
            @click="navigateBack"
          >
            Retour au profil
          </button>
        </div>
      </div>

      <div class="mt-8 flex flex-wrap items-center gap-3">
        <span class="rounded-full bg-[#4A6CF7]/10 px-4 py-2 text-sm font-semibold text-[#9DB2FF]">
          {{ unreadCount }} non lue(s)
        </span>
        <label class="rounded-2xl border border-[#1A1F2A] bg-[#090017] px-4 py-3">
          <span class="sr-only">Filtrer</span>
          <select v-model="typeFilter" class="bg-transparent text-sm text-[#E6EDF7] outline-none">
            <option value="all">Toutes</option>
            <option value="sale">Ventes</option>
            <option value="system">Systeme</option>
          </select>
        </label>
      </div>

      <div
        v-if="errorMessage"
        class="mt-8 rounded-2xl border border-[#7f1d1d] bg-[#2b1014] px-5 py-4 text-sm text-[#FECACA]"
      >
        {{ errorMessage }}
      </div>

      <div
        v-else-if="loading"
        class="mt-8 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8 text-[#A0ADB4]"
      >
        Chargement des notifications...
      </div>

      <div
        v-else-if="filteredNotifications.length === 0"
        class="mt-8 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8 text-[#A0ADB4]"
      >
        Aucune notification pour le moment.
      </div>

      <div v-else class="mt-8 grid gap-4">
        <article
          v-for="notification in filteredNotifications"
          :key="notification.id"
          class="rounded-[24px] border bg-[#090017] p-6 transition"
          :class="
            notification.read ? 'border-[#1A1F2A] opacity-80' : 'border-[#4A6CF7]/40 bg-[#0A1020]'
          "
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-3">
                <span
                  class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]"
                  :class="typeClass(notification.type)"
                >
                  {{ typeLabel(notification.type) }}
                </span>
                <span v-if="!notification.read" class="text-xs font-semibold text-[#4A6CF7]">
                  Nouveau
                </span>
              </div>
              <h2 class="mt-4 text-lg font-semibold text-white">
                {{ notification.title }}
              </h2>
              <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">
                {{ notification.message }}
              </p>
              <p class="mt-3 text-xs uppercase tracking-[0.16em] text-[#7F8A99]">
                {{ formatDate(notification.createdAt) }}
              </p>
            </div>

            <div class="flex shrink-0 flex-wrap gap-3">
              <NuxtLink
                v-if="notification.type === 'sale' && auth.isVerifiedArtist"
                to="/artist/sales"
                class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-4 py-2 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
              >
                Voir la vente
              </NuxtLink>
              <button
                v-if="!notification.read"
                type="button"
                class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-4 py-2 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20"
                @click="markRead(notification.id)"
              >
                Marquer comme lu
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo } from "#app";
import { useAuthStore } from "~/stores/auth";

definePageMeta({
  middleware: "auth"
});

const auth = useAuthStore();
const loading = ref(true);
const errorMessage = ref("");
const notifications = ref([]);
const unreadCount = ref(0);
const typeFilter = ref("all");

const filteredNotifications = computed(() => {
  if (typeFilter.value === "all") {
    return notifications.value;
  }

  return notifications.value.filter((notification) => notification.type === typeFilter.value);
});

onMounted(async () => {
  await loadNotifications();
});

function typeLabel(type) {
  if (type === "sale") {
    return "Vente";
  }

  return "Systeme";
}

function typeClass(type) {
  if (type === "sale") {
    return "bg-[#12301F] text-[#86EFAC]";
  }

  return "bg-[#1E2540] text-[#9DB2FF]";
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function navigateBack() {
  return navigateTo("/profile");
}

async function loadNotifications() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/notifications/me", {
      credentials: "include"
    });

    notifications.value = response.notifications || [];
    unreadCount.value = response.unreadCount || 0;
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    errorMessage.value = error?.data?.message || "Impossible de charger vos notifications.";
  } finally {
    loading.value = false;
  }
}

async function markRead(notificationId) {
  try {
    await $fetch(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
      credentials: "include"
    });

    await loadNotifications();
  } catch (error) {
    errorMessage.value = error?.data?.message || "Impossible de mettre a jour la notification.";
  }
}

async function markAllRead() {
  try {
    await $fetch("/api/notifications/me/read-all", {
      method: "PATCH",
      credentials: "include"
    });

    await loadNotifications();
  } catch (error) {
    errorMessage.value =
      error?.data?.message || "Impossible de marquer les notifications comme lues.";
  }
}
</script>
