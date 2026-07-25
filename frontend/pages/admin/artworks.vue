<template>
  <AdminShell
    title="Artworks"
    description="Moderate artworks with live backend statuses, admin notes and visibility actions."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300 disabled:opacity-50"
        :disabled="loading"
        @click="loadArtworks(true)"
      >
        {{ loading ? "Refreshing..." : "Refresh artworks" }}
      </button>
    </template>

    <section class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">
      <article
        v-for="summaryCard in summaries"
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

    <AppStatePanel
      v-if="successMessage"
      class="mt-4"
      compact
      type="success"
      :message="successMessage"
    />

    <section class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">
              Moderation queue
            </p>
            <h2 class="mt-3 text-xl font-semibold text-slate-100">Artwork moderation</h2>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="border border-slate-800 bg-black px-4 py-3">
              <span class="sr-only">Search artworks</span>
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Search by title, artist or category"
                class="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </label>
            <label class="border border-slate-800 bg-black px-4 py-3">
              <span class="sr-only">Filter artworks</span>
              <select
                v-model="statusFilter"
                class="w-full bg-transparent text-sm text-slate-100 outline-none"
              >
                <option value="all">All statuses</option>
                <option value="approved">Published</option>
                <option value="pending">Pending review</option>
                <option value="hidden">Hidden</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>
        </div>

        <div
          v-if="errorMessage"
          class="mt-6 border border-red-900 bg-red-950 px-5 py-4 text-sm text-red-200"
        >
          {{ errorMessage }}
        </div>

        <div
          v-else-if="loading"
          class="mt-6 border border-slate-800 bg-black px-5 py-4 text-sm text-slate-400"
        >
          Loading artworks...
        </div>

        <div
          v-else-if="filteredArtworks.length === 0"
          class="mt-6 border border-slate-800 bg-black px-5 py-4 text-sm text-slate-400"
        >
          No artworks match the current filters.
        </div>

        <div v-else class="mt-6 grid gap-4">
          <div
            v-for="artwork in filteredArtworks"
            :key="artwork.id"
            class="border border-slate-800 bg-black/30 p-5"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p class="font-semibold text-slate-100">{{ artwork.title }}</p>
                <p class="mt-1 text-sm text-slate-400">
                  By {{ artwork.artistName }} - {{ artwork.category }}
                </p>
                <div class="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
                  <span>{{ artwork.price }}</span>
                  <span>{{ artwork.favoriteCount }} favorites</span>
                  <span>{{ artwork.ordersCount }} orders</span>
                  <span>Created {{ formatDate(artwork.createdAt) }}</span>
                </div>
              </div>

              <span
                class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                :class="statusClass(artwork.status)"
              >
                {{ artwork.statusLabel }}
              </span>
            </div>

            <div class="mt-5 grid gap-3 border border-slate-800 bg-black p-4 text-sm">
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span class="text-slate-400">Public visibility</span>
                <span class="font-medium text-slate-100">
                  {{
                    artwork.isPubliclyVisible ? "Visible on marketplace" : "Hidden from marketplace"
                  }}
                </span>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span class="text-slate-400">Protected file</span>
                <span class="font-medium text-slate-100">
                  {{ artwork.protection ? "Enabled" : "Disabled" }}
                </span>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span class="text-slate-400">Last review</span>
                <span class="font-medium text-slate-100">
                  {{
                    artwork.moderatedAt ? formatDateTime(artwork.moderatedAt) : "Not reviewed yet"
                  }}
                </span>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span class="text-slate-400">Reviewed by</span>
                <span class="font-medium text-slate-100">
                  {{ artwork.reviewerName || "No reviewer yet" }}
                </span>
              </div>
              <div v-if="artwork.moderationNote" class="grid gap-1">
                <span class="text-slate-400">Current admin note</span>
                <span class="leading-6 text-slate-100">{{ artwork.moderationNote }}</span>
              </div>
            </div>

            <label class="mt-5 grid gap-2 text-sm text-slate-400">
              <span class="font-medium text-slate-100">Admin note (optional)</span>
              <textarea
                v-model="moderationNotes[artwork.id]"
                rows="3"
                class="field-control min-h-[96px] resize-y"
                placeholder="Explain why this artwork was hidden, rejected or restored."
              />
            </label>

            <div class="mt-5 flex flex-wrap gap-3">
              <NuxtLink
                :to="`/admin/audit-log?entityType=ARTWORK&entityId=${artwork.id}`"
                class="inline-flex min-h-11 items-center justify-center border border-slate-700 bg-black px-5 text-sm font-semibold text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
              >
                Open audit log
              </NuxtLink>
              <button
                v-if="artwork.status !== 'approved'"
                type="button"
                class="inline-flex min-h-11 items-center justify-center bg-violet-700 px-5 text-sm font-semibold text-black transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="reviewLoadingId === artwork.id"
                @click="moderateArtwork(artwork, 'approved')"
              >
                {{ reviewLoadingId === artwork.id ? "Updating..." : "Publish" }}
              </button>
              <button
                v-if="artwork.status !== 'hidden'"
                type="button"
                class="inline-flex min-h-11 items-center justify-center border border-slate-700 bg-slate-950 px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="reviewLoadingId === artwork.id"
                @click="moderateArtwork(artwork, 'hidden')"
              >
                {{ reviewLoadingId === artwork.id ? "Updating..." : "Hide" }}
              </button>
              <button
                v-if="artwork.status !== 'rejected'"
                type="button"
                class="inline-flex min-h-11 items-center justify-center border border-red-900 bg-red-950 px-5 text-sm font-semibold text-red-200 transition hover:border-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="reviewLoadingId === artwork.id"
                @click="moderateArtwork(artwork, 'rejected')"
              >
                {{ reviewLoadingId === artwork.id ? "Updating..." : "Reject" }}
              </button>
              <button
                v-if="artwork.status !== 'pending'"
                type="button"
                class="inline-flex min-h-11 items-center justify-center border border-amber-900 bg-amber-950 px-5 text-sm font-semibold text-amber-200 transition hover:border-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="reviewLoadingId === artwork.id"
                @click="moderateArtwork(artwork, 'pending')"
              >
                {{ reviewLoadingId === artwork.id ? "Updating..." : "Mark pending" }}
              </button>
            </div>
          </div>
        </div>
      </article>

      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6">
        <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Moderation guide</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-100">Status behavior</h2>

        <div class="mt-6 grid gap-4">
          <div
            v-for="action in actions"
            :key="action.title"
            class="border border-slate-800 bg-black/30 p-5"
          >
            <p class="font-semibold text-slate-100">{{ action.title }}</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">
              {{ action.description }}
            </p>
          </div>
        </div>
      </article>
    </section>
  </AdminShell>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo } from "#app";

definePageMeta({
  middleware: "admin"
});

const loading = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const searchTerm = ref("");
const statusFilter = ref("all");
const artworks = ref([]);
const reviewLoadingId = ref(null);
const moderationNotes = ref({});
const summary = ref(buildSummary([]));

const actions = [
  {
    title: "Published",
    description: "The artwork remains visible on the marketplace and accessible to collectors."
  },
  {
    title: "Hidden",
    description: "The artwork is removed from the public marketplace without deleting its record."
  },
  {
    title: "Rejected",
    description: "The artwork is blocked and the admin note explains what must be corrected."
  },
  {
    title: "Pending review",
    description: "Use this status to send the artwork back into the moderation queue."
  }
];

const summaries = computed(() => [
  {
    label: "Total artworks",
    value: summary.value.totalArtworks,
    description: "All artworks currently stored in the platform catalog."
  },
  {
    label: "Published",
    value: summary.value.approvedArtworks,
    description: "Artworks currently visible on the marketplace."
  },
  {
    label: "Pending review",
    value: summary.value.pendingArtworks,
    description: "Artworks waiting for an admin moderation decision."
  },
  {
    label: "Hidden",
    value: summary.value.hiddenArtworks,
    description: "Artworks hidden from public discovery."
  },
  {
    label: "Rejected",
    value: summary.value.rejectedArtworks,
    description: "Artworks explicitly rejected by the administration."
  }
]);

const filteredArtworks = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return artworks.value.filter((artwork) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      artwork.title.toLowerCase().includes(normalizedSearch) ||
      artwork.artistName.toLowerCase().includes(normalizedSearch) ||
      artwork.category.toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter.value === "all" || artwork.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});

onMounted(async () => {
  await loadArtworks();
});

function buildSummary(items) {
  return {
    totalArtworks: items.length,
    pendingArtworks: items.filter((artwork) => artwork.status === "pending").length,
    approvedArtworks: items.filter((artwork) => artwork.status === "approved").length,
    rejectedArtworks: items.filter((artwork) => artwork.status === "rejected").length,
    hiddenArtworks: items.filter((artwork) => artwork.status === "hidden").length,
    totalFavorites: items.reduce((sum, artwork) => sum + (artwork.favoriteCount || 0), 0)
  };
}

function primeModerationNotes(items) {
  moderationNotes.value = Object.fromEntries(
    items.map((artwork) => [artwork.id, artwork.moderationNote || ""])
  );
}

function replaceArtwork(updatedArtwork) {
  artworks.value = artworks.value.map((artwork) =>
    artwork.id === updatedArtwork.id ? updatedArtwork : artwork
  );
  moderationNotes.value = {
    ...moderationNotes.value,
    [updatedArtwork.id]: updatedArtwork.moderationNote || ""
  };
  summary.value = buildSummary(artworks.value);
}

async function loadArtworks(showSuccess = false) {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await $fetch("/api/admin/artworks", {
      credentials: "include"
    });

    artworks.value = response.artworks || [];
    primeModerationNotes(artworks.value);
    summary.value = response.summary || buildSummary(artworks.value);
    if (showSuccess) {
      successMessage.value = "Artwork data refreshed successfully.";
    }
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to load admin artworks.";
  } finally {
    loading.value = false;
  }
}

async function moderateArtwork(artwork, status) {
  errorMessage.value = "";
  successMessage.value = "";
  reviewLoadingId.value = artwork.id;

  try {
    const response = await $fetch(`/api/admin/artworks/${artwork.id}/moderation`, {
      method: "PATCH",
      credentials: "include",
      body: {
        status,
        moderationNote: moderationNotes.value[artwork.id] || ""
      }
    });

    replaceArtwork(response.artwork);
    successMessage.value = `${response.artwork.title} is now ${response.artwork.statusLabel.toLowerCase()}.`;
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to update artwork moderation.";
  } finally {
    reviewLoadingId.value = null;
  }
}

function statusClass(status) {
  if (status === "approved") {
    return "bg-violet-700/10 text-violet-700";
  }

  if (status === "hidden") {
    return "bg-slate-800 text-slate-100";
  }

  if (status === "rejected") {
    return "bg-red-950 text-red-300";
  }

  return "bg-amber-950 text-amber-300";
}

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
</script>

<style scoped>
.field-control {
  @apply w-full border border-slate-800 bg-black px-3.5 py-3 text-slate-100 outline-none;
}

.field-control:focus {
  @apply border-violet-700;
  box-shadow: 0 0 0 3px color-mix(in srgb, theme("colors.violet.700") 18%, transparent);
}
</style>
