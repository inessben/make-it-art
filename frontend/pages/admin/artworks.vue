<template>
  <AdminShell
    title="Artworks"
    description="Monitor published artworks, hide or reject content when needed, and restore visibility when an artwork can be shown again."
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

    <section class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
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

    <AppStatePanel v-if="successMessage" compact type="success" :message="successMessage" />

    <section class="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">
              Artwork visibility
            </p>
            <h2 class="mt-3 text-xl font-semibold text-slate-100">Published and restricted artworks</h2>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="border border-slate-800 bg-black px-4 py-3">
              <span class="sr-only">Search artworks</span>
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Search by title or artist"
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
                <option value="pending">Pending hold</option>
                <option value="approved">Published</option>
                <option value="rejected">Rejected</option>
                <option value="hidden">Hidden</option>
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
              <div class="max-w-3xl">
                <div class="flex flex-wrap items-center gap-3">
                  <p class="font-semibold text-slate-100">{{ artwork.title }}</p>
                  <span
                    class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                    :class="statusClass(artwork.status)"
                  >
                    {{ artwork.statusLabel }}
                  </span>
                  <span
                    v-if="artwork.isPubliclyVisible"
                    class="inline-flex rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-300"
                  >
                    Visible in catalog
                  </span>
                </div>

                <p class="mt-2 text-sm leading-6 text-slate-400">By {{ artwork.artistName }}</p>

                <div class="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
                  <span>{{ artwork.category }}</span>
                  <span>{{ artwork.price }}</span>
                  <span>{{ artwork.favoriteCount }} favorites</span>
                  <span>{{ artwork.ordersCount }} orders</span>
                  <span>{{ formatDate(artwork.createdAt) }}</span>
                </div>

                <div
                  v-if="artwork.reviewerName || artwork.moderatedAt"
                  class="mt-4 text-sm leading-6 text-slate-400"
                >
                  <span v-if="artwork.reviewerName">Reviewed by {{ artwork.reviewerName }}</span>
                  <span v-if="artwork.reviewerName && artwork.moderatedAt"> on </span>
                  <span v-if="artwork.moderatedAt">{{ formatDateTime(artwork.moderatedAt) }}</span>
                </div>
              </div>

              <div class="w-full max-w-md space-y-3">
                <label class="block">
                  <span class="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-500">
                    Admin note
                  </span>
                  <textarea
                    v-model="moderationNotes[artwork.id]"
                    rows="3"
                    class="w-full border border-slate-800 bg-black px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                    placeholder="Explain the decision for the artist if needed."
                  />
                </label>

                <div v-if="artwork.moderationNote" class="text-sm leading-6 text-slate-400">
                  Current note: {{ artwork.moderationNote }}
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="inline-flex min-h-10 items-center justify-center rounded-full bg-emerald-900 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-800 disabled:opacity-50"
                    :disabled="moderatingArtworkId === artwork.id"
                    @click="updateArtworkStatus(artwork, 'approved')"
                  >
                    {{ moderationButtonLabel(artwork.id, "approved", "Publish") }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex min-h-10 items-center justify-center rounded-full bg-amber-900 px-4 text-sm font-semibold text-amber-100 transition hover:bg-amber-800 disabled:opacity-50"
                    :disabled="moderatingArtworkId === artwork.id"
                    @click="updateArtworkStatus(artwork, 'rejected')"
                  >
                    {{ moderationButtonLabel(artwork.id, "rejected", "Reject") }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-800 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:opacity-50"
                    :disabled="moderatingArtworkId === artwork.id"
                    @click="updateArtworkStatus(artwork, 'hidden')"
                  >
                    {{ moderationButtonLabel(artwork.id, "hidden", "Hide") }}
                  </button>
                  <button
                    v-if="artwork.status !== 'pending'"
                    type="button"
                    class="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
                    :disabled="moderatingArtworkId === artwork.id"
                    @click="updateArtworkStatus(artwork, 'pending')"
                  >
                    {{ moderationButtonLabel(artwork.id, "pending", "Move to pending") }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6">
        <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Moderation rules</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-100">Operational guide</h2>

        <div class="mt-6 grid gap-4">
          <div class="border border-slate-800 bg-black/30 p-5">
            <p class="font-semibold text-slate-100">Published by default</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">
              New and edited artworks from verified artists appear directly in the public catalog.
            </p>
          </div>
          <div class="border border-slate-800 bg-black/30 p-5">
            <p class="font-semibold text-slate-100">Publish or restore</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">
              Use Publish to keep an artwork visible publicly or to restore a hidden or rejected
              artwork.
            </p>
          </div>
          <div class="border border-slate-800 bg-black/30 p-5">
            <p class="font-semibold text-slate-100">Rejected or hidden</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">
              Use a note to explain the decision. Hidden artworks stay in the artist workspace but
              are removed from public browsing.
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
const moderationNotes = ref({});
const moderatingArtworkId = ref(null);
const moderatingStatus = ref("");
const summary = ref(buildSummary([]));

const summaries = computed(() => [
  {
    label: "Total artworks",
    value: summary.value.totalArtworks,
    description: "All artworks currently stored across the public catalog and restricted states."
  },
  {
    label: "Pending hold",
    value: summary.value.pendingArtworks,
    description: "Legacy or manually paused artworks that are not currently public."
  },
  {
    label: "Published",
    value: summary.value.approvedArtworks,
    description: "Visible in the public catalog and on the artist profile."
  },
  {
    label: "Rejected",
    value: summary.value.rejectedArtworks,
    description: "Returned to the artist with a moderation decision."
  },
  {
    label: "Hidden",
    value: summary.value.hiddenArtworks,
    description: "Removed from public browsing while kept in the workspace."
  },
  {
    label: "Total favorites",
    value: summary.value.totalFavorites,
    description: "Useful signal to spot already engaged artworks."
  }
]);

const filteredArtworks = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return artworks.value.filter((artwork) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      artwork.title.toLowerCase().includes(normalizedSearch) ||
      artwork.artistName.toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter.value === "all" || artwork.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});

onMounted(async () => {
  await loadArtworks();
});

async function loadArtworks(showSuccess = false) {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await $fetch("/api/admin/artworks", {
      credentials: "include"
    });

    artworks.value = response.artworks || [];
    summary.value = response.summary || buildSummary(artworks.value);
    moderationNotes.value = buildModerationNotes(artworks.value);

    if (showSuccess) {
      successMessage.value = "Artwork moderation data refreshed successfully.";
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

async function updateArtworkStatus(artwork, status) {
  moderatingArtworkId.value = artwork.id;
  moderatingStatus.value = status;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await $fetch(`/api/admin/artworks/${artwork.id}/moderation`, {
      method: "PATCH",
      credentials: "include",
      body: {
        status,
        moderationNote: moderationNotes.value[artwork.id] || ""
      }
    });

    artworks.value = artworks.value.map((currentArtwork) =>
      currentArtwork.id === artwork.id ? response.artwork : currentArtwork
    );
    summary.value = buildSummary(artworks.value);
    moderationNotes.value[artwork.id] = response.artwork.moderationNote || "";
    successMessage.value = response.message || "Artwork moderation updated.";
  } catch (error) {
    errorMessage.value = error?.data?.message || "Unable to update artwork moderation.";
  } finally {
    moderatingArtworkId.value = null;
    moderatingStatus.value = "";
  }
}

function buildModerationNotes(items) {
  return items.reduce((notes, artwork) => {
    notes[artwork.id] = artwork.moderationNote || "";
    return notes;
  }, {});
}

function buildSummary(items) {
  return {
    totalArtworks: items.length,
    pendingArtworks: items.filter((artwork) => artwork.status === "pending").length,
    approvedArtworks: items.filter((artwork) => artwork.status === "approved").length,
    rejectedArtworks: items.filter((artwork) => artwork.status === "rejected").length,
    hiddenArtworks: items.filter((artwork) => artwork.status === "hidden").length,
    totalFavorites: items.reduce((sum, artwork) => sum + Number(artwork.favoriteCount || 0), 0)
  };
}

function moderationButtonLabel(artworkId, status, label) {
  if (moderatingArtworkId.value === artworkId && moderatingStatus.value === status) {
    return "Saving...";
  }

  return label;
}

function statusClass(status) {
  if (status === "approved") {
    return "bg-emerald-950 text-emerald-300";
  }

  if (status === "rejected") {
    return "bg-amber-950 text-amber-300";
  }

  if (status === "hidden") {
    return "bg-slate-800 text-slate-200";
  }

  return "bg-violet-700/10 text-violet-300";
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
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
</script>
