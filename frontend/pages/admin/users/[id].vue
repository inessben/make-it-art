<template>
  <AdminShell
    :title="user?.username || 'User detail'"
    description="Full account sheet with linked roles, collections, follows, orders and admin history."
  >
    <template #actions>
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          to="/admin/users"
          class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
        >
          Back to users
        </NuxtLink>
        <NuxtLink
          v-if="user?.artistProfile?.id"
          :to="`/admin/artists/${user.artistProfile.id}`"
          class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
        >
          Open artist profile
        </NuxtLink>
      </div>
    </template>

    <div
      v-if="errorMessage"
      class="border border-red-900 bg-red-950 px-5 py-4 text-sm text-red-200"
    >
      {{ errorMessage }}
    </div>

    <div
      v-else-if="loading"
      class="border border-slate-800 bg-black px-5 py-4 text-sm text-slate-400"
    >
      Loading user detail...
    </div>

    <template v-else-if="user">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <article
          v-for="summaryCard in summaryCards"
          :key="summaryCard.label"
          class="min-h-[128px] border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6"
        >
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">
            {{ summaryCard.label }}
          </p>
          <p class="mt-5 text-title-3 text-slate-100">
            {{ summaryCard.value }}
          </p>
          <p class="mt-2 text-subtitle-3 text-slate-500">
            {{ summaryCard.description }}
          </p>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Account</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Identity and access</h2>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Email</p>
              <p class="mt-2 text-sm text-slate-100">{{ user.email }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Phone</p>
              <p class="mt-2 text-sm text-slate-100">{{ user.phone || "Not provided" }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Role</p>
              <p class="mt-2 text-sm text-slate-100">{{ user.role }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Status</p>
              <span
                class="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                :class="statusClass(user.statusCode)"
              >
                {{ user.status }}
              </span>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Joined</p>
              <p class="mt-2 text-sm text-slate-100">{{ formatDate(user.createdAt) }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Blocked at</p>
              <p class="mt-2 text-sm text-slate-100">
                {{ user.blockedAt ? formatDateTime(user.blockedAt) : "Not blocked" }}
              </p>
            </div>
          </div>

          <div class="mt-4 border border-slate-800 bg-black/30 p-4">
            <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Bio</p>
            <p class="mt-2 text-sm leading-6 text-slate-300">
              {{ user.bio || "No biography on file." }}
            </p>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Linked roles</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Admin and artist status</h2>

          <div class="mt-6 grid gap-3">
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Admin access</p>
              <p class="mt-2 text-sm text-slate-100">
                {{ user.isSuperAdmin ? "Super admin" : user.isAdmin ? "Admin" : "No admin access" }}
              </p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Artist profile</p>
              <div v-if="user.artistProfile" class="mt-2 space-y-2 text-sm text-slate-100">
                <p>{{ user.artistProfile.name }}</p>
                <p class="text-slate-400">
                  {{ user.artistProfile.artworksCount }} artworks,
                  {{ user.artistProfile.followersCount }} followers,
                  {{ user.artistProfile.collectionsCount }} collections
                </p>
                <NuxtLink
                  :to="`/admin/artists/${user.artistProfile.id}`"
                  class="inline-flex text-xs font-semibold uppercase tracking-[0.12em] text-violet-300 hover:text-violet-200"
                >
                  Open artist sheet
                </NuxtLink>
              </div>
              <p v-else class="mt-2 text-sm text-slate-400">No artist profile linked yet.</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Artist application</p>
              <div v-if="user.artistApplication" class="mt-2 space-y-2 text-sm text-slate-100">
                <p>
                  {{ user.artistApplication.displayName }} - {{ user.artistApplication.status }}
                </p>
                <p class="text-slate-400">
                  Submitted {{ formatDateTime(user.artistApplication.submittedAt) }}
                </p>
                <p v-if="user.artistApplication.reviewerName" class="text-slate-400">
                  Reviewed by {{ user.artistApplication.reviewerName }}
                </p>
                <a
                  v-if="user.artistApplication.contractPdfUrl"
                  :href="user.artistApplication.contractPdfUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex text-xs font-semibold uppercase tracking-[0.12em] text-violet-300 hover:text-violet-200"
                >
                  Open signed contract
                </a>
              </div>
              <p v-else class="mt-2 text-sm text-slate-400">No artist application on file.</p>
            </div>
          </div>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Orders</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Recent orders</h2>

          <div v-if="recentOrders.length === 0" class="mt-6 text-sm text-slate-400">
            No order linked to this account yet.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <NuxtLink
              v-for="order in recentOrders"
              :key="order.publicId"
              :to="`/admin/orders/${order.publicId}`"
              class="border border-slate-800 bg-black/30 p-4 transition hover:border-violet-600"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="font-semibold text-slate-100">{{ order.reference }}</p>
                  <p class="mt-1 text-sm text-slate-400">
                    {{ order.itemsCount }} items - {{ order.paymentsCount }} payments
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-semibold text-slate-100">
                    {{ formatMoney(order.totalAmount, order.currency) }}
                  </p>
                  <p class="mt-1 text-sm text-slate-400">{{ order.status }}</p>
                </div>
              </div>
              <p class="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">
                {{ formatDateTime(order.createdAt) }}
              </p>
            </NuxtLink>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Collections</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Personal collections</h2>

          <div v-if="collections.length === 0" class="mt-6 text-sm text-slate-400">
            No collection stored for this user.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="collection in collections"
              :key="collection.id"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="font-semibold text-slate-100">{{ collection.title }}</p>
                <span class="text-xs uppercase tracking-[0.12em] text-slate-500">
                  {{ collection.itemsCount }} items
                </span>
              </div>
              <p class="mt-2 text-sm leading-6 text-slate-400">
                {{ collection.description || "No description." }}
              </p>
              <p class="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">
                {{ collection.isPrivate ? "Private" : "Public" }} -
                {{ formatDate(collection.createdAt) }}
              </p>
            </article>
          </div>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Favorites</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Saved artworks</h2>

          <div v-if="favorites.length === 0" class="mt-6 text-sm text-slate-400">
            No favorite artwork recorded.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="favorite in favorites"
              :key="favorite.id"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="font-semibold text-slate-100">
                  {{ favorite.artwork?.title || "Artwork" }}
                </p>
                <span class="text-sm text-slate-400">
                  {{ favorite.artwork?.priceLabel || "Price not set" }}
                </span>
              </div>
              <p class="mt-2 text-sm text-slate-400">
                {{ favorite.artwork?.artistName || "Unknown artist" }} -
                {{ favorite.artwork?.category || "No category" }}
              </p>
              <p class="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">
                Added {{ formatDateTime(favorite.createdAt) }}
              </p>
            </article>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Follows</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Followed artists</h2>

          <div v-if="follows.length === 0" class="mt-6 text-sm text-slate-400">
            This account does not follow any artist yet.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <NuxtLink
              v-for="follow in follows"
              :key="follow.id"
              :to="follow.artist ? `/admin/artists/${follow.artist.id}` : '/admin/artists'"
              class="border border-slate-800 bg-black/30 p-4 transition hover:border-violet-600"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="font-semibold text-slate-100">{{ follow.artist?.name || "Artist" }}</p>
                <span class="text-xs uppercase tracking-[0.12em] text-slate-500">
                  {{ formatDate(follow.createdAt) }}
                </span>
              </div>
              <p class="mt-2 text-sm text-slate-400">
                {{ follow.artist?.artworksCount || 0 }} artworks,
                {{ follow.artist?.followersCount || 0 }} followers
              </p>
            </NuxtLink>
          </div>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Account history</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Targeted admin actions</h2>

          <div v-if="accountHistory.length === 0" class="mt-6 text-sm text-slate-400">
            No targeted admin action recorded for this user.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="entry in accountHistory"
              :key="entry.id"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="font-semibold text-slate-100">{{ entry.action }}</p>
              <p class="mt-2 text-sm text-slate-400">
                {{ entry.actor?.username || "System" }} - {{ formatDateTime(entry.createdAt) }}
              </p>
              <p class="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                {{ entry.entityType }} / {{ entry.entityId }}
              </p>
            </article>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">User activity</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Actions performed by this user</h2>

          <div v-if="activityHistory.length === 0" class="mt-6 text-sm text-slate-400">
            No audit activity recorded from this account.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="entry in activityHistory"
              :key="entry.id"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="font-semibold text-slate-100">{{ entry.action }}</p>
              <p class="mt-2 text-sm text-slate-400">
                {{ formatDateTime(entry.createdAt) }} - {{ entry.entityType }} /
                {{ entry.entityId }}
              </p>
              <p
                v-if="entry.ipAddress"
                class="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500"
              >
                {{ entry.ipAddress }}
              </p>
            </article>
          </div>
        </article>
      </section>
    </template>
  </AdminShell>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo, useRoute } from "#app";
import { formatAdminDate, formatAdminDateTime, formatAdminMoney } from "~/utils/admin-format";

definePageMeta({
  middleware: "admin"
});

const route = useRoute();
const loading = ref(true);
const errorMessage = ref("");
const user = ref(null);
const metrics = ref({
  ordersCount: 0,
  collectionsCount: 0,
  favoritesCount: 0,
  followsCount: 0,
  activityCount: 0,
  refundsRequestedCount: 0
});
const recentOrders = ref([]);
const collections = ref([]);
const favorites = ref([]);
const follows = ref([]);
const accountHistory = ref([]);
const activityHistory = ref([]);

const summaryCards = computed(() => [
  {
    label: "Role",
    value: user.value?.role || "-",
    description: "Current access tier for this account."
  },
  {
    label: "Orders",
    value: metrics.value.ordersCount,
    description: "Orders created by this user."
  },
  {
    label: "Collections",
    value: metrics.value.collectionsCount,
    description: "Saved personal collections."
  },
  {
    label: "Favorites",
    value: metrics.value.favoritesCount,
    description: "Favorite artworks currently stored."
  },
  {
    label: "Follows",
    value: metrics.value.followsCount,
    description: "Artists followed by this user."
  },
  {
    label: "Audit entries",
    value: metrics.value.activityCount,
    description: "Direct audit activity linked to the account."
  }
]);

onMounted(async () => {
  await loadUserDetail();
});

async function loadUserDetail() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch(`/api/admin/users/${route.params.id}`, {
      credentials: "include"
    });

    user.value = response.user;
    metrics.value = response.metrics || metrics.value;
    recentOrders.value = response.recentOrders || [];
    collections.value = response.collections || [];
    favorites.value = response.favorites || [];
    follows.value = response.follows || [];
    accountHistory.value = response.accountHistory || [];
    activityHistory.value = response.activityHistory || [];
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    if (error?.statusCode === 404) {
      errorMessage.value = error?.data?.message || "User not found.";
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to load this user.";
  } finally {
    loading.value = false;
  }
}

function statusClass(statusCode) {
  if (statusCode === "active") {
    return "bg-violet-700/10 text-violet-300";
  }

  if (statusCode === "blocked") {
    return "bg-red-950 text-red-300";
  }

  if (statusCode === "suspended") {
    return "bg-amber-950 text-amber-300";
  }

  return "bg-slate-800 text-slate-100";
}

function formatDate(value) {
  return formatAdminDate(value, "en-US");
}

function formatDateTime(value) {
  return formatAdminDateTime(value, "en-US");
}

function formatMoney(amount, currency) {
  return formatAdminMoney(amount, currency, "fr-FR");
}
</script>
