<template>
  <AccountSectionShell
    eyebrow="Notifications"
    title="Notification center"
    description="Track marketplace alerts, artist sales activity and operational updates from one workspace."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20 disabled:opacity-60"
        :disabled="loading || unreadCount === 0"
        @click="markAllRead"
      >
        Mark all as read
      </button>
    </template>

    <div class="flex flex-wrap items-center gap-3">
      <span class="rounded-full bg-[#4A6CF7]/10 px-4 py-2 text-sm font-semibold text-[#9DB2FF]">
        {{ unreadCount }} unread
      </span>
      <label class="rounded-2xl border border-[#1A1F2A] bg-[#090017] px-4 py-3">
        <span class="sr-only">Filter notifications</span>
        <select v-model="typeFilter" class="bg-transparent text-sm text-[#E6EDF7] outline-none">
          <option value="all">All</option>
          <option value="follower">Followers</option>
          <option value="sale">Sales</option>
          <option value="withdrawal">Withdrawals</option>
          <option value="system">System</option>
        </select>
      </label>
    </div>

    <div
      v-if="errorMessage"
      class="rounded-2xl border border-[#7f1d1d] bg-[#2b1014] px-5 py-4 text-sm text-[#FECACA]"
    >
      {{ errorMessage }}
    </div>

    <div
      v-else-if="loading"
      class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8 text-[#A0ADB4]"
    >
      Loading notifications...
    </div>

    <div
      v-else-if="filteredNotifications.length === 0"
      class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8 text-[#A0ADB4]"
    >
      No notifications yet.
    </div>

    <div v-else class="grid gap-4">
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
                New
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
              v-if="notificationRoute(notification)"
              :to="notificationRoute(notification)"
              class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-4 py-2 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
            >
              {{ notificationActionLabel(notification.type) }}
            </NuxtLink>
            <button
              v-if="!notification.read"
              type="button"
              class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-4 py-2 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20"
              @click="markRead(notification.id)"
            >
              Mark as read
            </button>
          </div>
        </div>
      </article>
    </div>
  </AccountSectionShell>
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
  if (type === "follower") {
    return "Follower";
  }

  if (type === "sale") {
    return "Sale";
  }

  if (type === "withdrawal") {
    return "Withdrawal";
  }

  return "System";
}

function typeClass(type) {
  if (type === "follower") {
    return "bg-[#1E2540] text-[#9DB2FF]";
  }

  if (type === "sale") {
    return "bg-[#12301F] text-[#86EFAC]";
  }

  if (type === "withdrawal") {
    return "bg-[#2A2410] text-[#FDE68A]";
  }

  return "bg-[#1E2540] text-[#9DB2FF]";
}

function notificationRoute(notification) {
  if (notification?.type === "follower" && auth.isVerifiedArtist) {
    return notification?.payload?.profileUrl || "/follows?tab=followers";
  }

  if (notification?.type === "sale" && auth.isVerifiedArtist) {
    return "/artist/sales";
  }

  if (notification?.type === "withdrawal" && auth.isVerifiedArtist) {
    return "/artist/withdrawals";
  }

  return "";
}

function notificationActionLabel(type) {
  if (type === "follower") {
    return "View profile";
  }

  if (type === "sale") {
    return "View sale";
  }

  if (type === "withdrawal") {
    return "View withdrawal";
  }

  return "Open";
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
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

    errorMessage.value = error?.data?.message || "Unable to load your notifications.";
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
    errorMessage.value = error?.data?.message || "Unable to update this notification.";
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
    errorMessage.value = error?.data?.message || "Unable to mark your notifications as read.";
  }
}
</script>
