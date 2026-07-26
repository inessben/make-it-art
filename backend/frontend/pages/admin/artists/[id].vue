<template>
  <AdminShell
    :title="artist?.name || 'Artist detail'"
    description="Complete artist sheet with linked user account, catalog, followers, collections and sales history."
  >
    <template #actions>
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          to="/admin/artists"
          class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
        >
          Back to artists
        </NuxtLink>
        <NuxtLink
          v-if="artist?.user?.id"
          :to="`/admin/users/${artist.user.id}`"
          class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
        >
          Open linked user
        </NuxtLink>
        <NuxtLink
          v-if="artist?.id"
          :to="`/admin/audit-log?entityType=ARTIST&entityId=${artist.id}`"
          class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
        >
          Open audit log
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
      Loading artist detail...
    </div>

    <template v-else-if="artist">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

      <section class="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Profile</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Artist identity</h2>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Display name</p>
              <p class="mt-2 text-sm text-slate-100">{{ artist.name }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Verification</p>
              <span
                class="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                :class="
                  artist.verified
                    ? 'bg-violet-700/10 text-violet-300'
                    : 'bg-amber-950 text-amber-300'
                "
              >
                {{ artist.verified ? "Verified" : "Pending" }}
              </span>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Email</p>
              <p class="mt-2 text-sm text-slate-100">{{ artist.email }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Created</p>
              <p class="mt-2 text-sm text-slate-100">{{ formatDate(artist.createdAt) }}</p>
            </div>
          </div>

          <div class="mt-4 border border-slate-800 bg-black/30 p-4">
            <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Biography</p>
            <p class="mt-2 text-sm leading-6 text-slate-300">
              {{ artist.bio || "No biography on file." }}
            </p>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Linked account</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">User and application</h2>

          <div class="mt-6 grid gap-3">
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">User account</p>
              <div class="mt-2 space-y-2 text-sm text-slate-100">
                <p>{{ artist.user?.username || "User" }}</p>
                <p class="text-slate-400">{{ artist.user?.email }}</p>
                <p class="text-slate-400">{{ artist.user?.role }} - {{ artist.user?.status }}</p>
              </div>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Artist application</p>
              <div v-if="artist.application" class="mt-2 space-y-2 text-sm text-slate-100">
                <p>{{ artist.application.displayName }} - {{ artist.application.status }}</p>
                <p class="text-slate-400">
                  Signed {{ formatDateTime(artist.application.contractSignedAt) }}
                </p>
                <p v-if="artist.application.reviewNote" class="text-slate-400">
                  {{ artist.application.reviewNote }}
                </p>
                <a
                  v-if="artist.application.contractPdfUrl"
                  :href="artist.application.contractPdfUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex text-xs font-semibold uppercase tracking-[0.12em] text-violet-300 hover:text-violet-200"
                >
                  Open signed contract
                </a>
              </div>
              <p v-else class="mt-2 text-sm text-slate-400">No application history available.</p>
            </div>
          </div>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Catalog</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Artworks</h2>

          <div v-if="artworks.length === 0" class="mt-6 text-sm text-slate-400">
            No artwork linked to this artist yet.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="artwork in artworks"
              :key="artwork.id"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="font-semibold text-slate-100">{{ artwork.title }}</p>
                <span class="text-sm text-slate-100">{{ artwork.priceLabel }}</span>
              </div>
              <p class="mt-2 text-sm text-slate-400">
                {{ artwork.category }} - {{ artwork.moderationLabel }}
              </p>
              <p class="mt-2 text-sm text-slate-400">
                {{ artwork.favoriteCount }} favorites - {{ artwork.ordersCount }} orders
              </p>
              <p class="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">
                {{ formatDate(artwork.createdAt) }}
              </p>
            </article>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Audience</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Followers</h2>

          <div v-if="followers.length === 0" class="mt-6 text-sm text-slate-400">
            No follower recorded yet.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="follow in followers"
              :key="follow.id"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="font-semibold text-slate-100">{{ follow.user?.username || "User" }}</p>
              <p class="mt-2 text-sm text-slate-400">{{ follow.user?.email }}</p>
              <p class="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">
                Followed on {{ formatDateTime(follow.createdAt) }}
              </p>
            </article>
          </div>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Collections</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Artist collections</h2>

          <div v-if="collections.length === 0" class="mt-6 text-sm text-slate-400">
            No artist collection published yet.
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

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Sales</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Recent order items</h2>

          <div v-if="recentSales.length === 0" class="mt-6 text-sm text-slate-400">
            No sale recorded for this artist yet.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <NuxtLink
              v-for="sale in recentSales"
              :key="sale.id"
              :to="sale.order ? `/admin/orders/${sale.order.publicId}` : '/admin/orders'"
              class="border border-slate-800 bg-black/30 p-4 transition hover:border-violet-600"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="font-semibold text-slate-100">{{ sale.artworkTitle }}</p>
                <span class="text-sm text-slate-100">
                  {{ formatMoney(sale.subtotalAmount, sale.currency) }}
                </span>
              </div>
              <p class="mt-2 text-sm text-slate-400">
                {{ sale.order?.reference }} - {{ sale.order?.customer?.username || "Customer" }}
              </p>
              <p class="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">
                {{ formatDateTime(sale.createdAt) }}
              </p>
            </NuxtLink>
          </div>
        </article>
      </section>

      <section class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
        <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Audit</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-100">Artist audit log</h2>

        <div v-if="auditLog.length === 0" class="mt-6 text-sm text-slate-400">
          No audit entry recorded for this artist scope.
        </div>

        <div v-else class="mt-6 grid gap-3">
          <article
            v-for="entry in auditLog"
            :key="entry.id"
            class="border border-slate-800 bg-black/30 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="font-semibold text-slate-100">{{ entry.action }}</p>
              <span class="text-xs uppercase tracking-[0.12em] text-slate-500">
                {{ formatDateTime(entry.createdAt) }}
              </span>
            </div>
            <p class="mt-2 text-sm text-slate-400">
              {{ entry.actor?.username || "System" }} - {{ entry.entityType }} /
              {{ entry.entityId }}
            </p>
          </article>
        </div>
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
const artist = ref(null);
const metrics = ref({
  artworksCount: 0,
  followersCount: 0,
  collectionsCount: 0,
  soldItemsCount: 0
});
const artworks = ref([]);
const followers = ref([]);
const collections = ref([]);
const recentSales = ref([]);
const auditLog = ref([]);

const summaryCards = computed(() => [
  {
    label: "Verification",
    value: artist.value?.verified ? "Verified" : "Pending",
    description: "Current artist verification state."
  },
  {
    label: "Artworks",
    value: metrics.value.artworksCount,
    description: "Works currently linked to this artist."
  },
  {
    label: "Followers",
    value: metrics.value.followersCount,
    description: "Collectors following this profile."
  },
  {
    label: "Collections",
    value: metrics.value.collectionsCount,
    description: "Artist-side collections connected to the profile."
  },
  {
    label: "Sold items",
    value: metrics.value.soldItemsCount,
    description: "Order items already sold for this artist."
  }
]);

onMounted(async () => {
  await loadArtistDetail();
});

async function loadArtistDetail() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch(`/api/admin/artists/${route.params.id}`, {
      credentials: "include"
    });

    artist.value = response.artist;
    metrics.value = response.metrics || metrics.value;
    artworks.value = response.artworks || [];
    followers.value = response.followers || [];
    collections.value = response.collections || [];
    recentSales.value = response.recentSales || [];
    auditLog.value = response.auditLog || [];
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
      errorMessage.value = error?.data?.message || "Artist not found.";
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to load this artist profile.";
  } finally {
    loading.value = false;
  }
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
