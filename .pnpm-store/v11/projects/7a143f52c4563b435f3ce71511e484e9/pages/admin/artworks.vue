<template>
  <AdminShell
    title="Artworks"
    description="Manage artworks using live backend data and statuses derived from currently available fields."
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

    <section class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
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
      compact
      type="success"
      :message="successMessage"
    />
    <section class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <article
        class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6"
      >
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p
              class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500"
            >
              Artwork catalog
            </p>
            <h2 class="mt-3 text-xl font-semibold text-slate-100">
              Artworks in database
            </h2>
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
                <option value="Published">Published</option>
                <option value="Protected">Protected</option>
                <option value="Needs category">Needs category</option>
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
            <div
              class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
            >
              <div>
                <p class="font-semibold text-slate-100">{{ artwork.title }}</p>
                <p class="mt-2 text-sm leading-6 text-slate-400">
                  By {{ artwork.artistName }}
                </p>
                <div class="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
                  <span>{{ artwork.category }}</span>
                  <span>{{ artwork.price }}</span>
                  <span>{{ artwork.favoriteCount }} favorites</span>
                  <span>{{ formatDate(artwork.createdAt) }}</span>
                </div>
              </div>

              <span
                class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                :class="statusClass(artwork.status)"
              >
                {{ artwork.status }}
              </span>
            </div>
          </div>
        </div>
      </article>

      <article
        class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6"
      >
        <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">
          Action blocks
        </p>
        <h2 class="mt-3 text-xl font-semibold text-slate-100">
          Moderation overview
        </h2>

        <div class="mt-6 grid gap-4">
          <div class="border border-slate-800 bg-black/30 p-5">
            <p class="font-semibold text-slate-100">Approve</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">
              Ready for moderation actions when the backend schema supports
              them.
            </p>
          </div>
          <div class="border border-slate-800 bg-black/30 p-5">
            <p class="font-semibold text-slate-100">Reject</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">
              This page currently relies on the fields available in the
              database.
            </p>
          </div>
          <div class="border border-slate-800 bg-black/30 p-5">
            <p class="font-semibold text-slate-100">Delete</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">
              Destructive actions will be connected when the administration
              endpoints are available.
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
  middleware: "admin",
});

const loading = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const searchTerm = ref("");
const statusFilter = ref("all");
const artworks = ref([]);
const summary = ref({
  totalArtworks: 0,
  protectedArtworks: 0,
  needsCategoryArtworks: 0,
  totalFavorites: 0,
});

const summaries = computed(() => [
  {
    label: "Total artworks",
    value: summary.value.totalArtworks,
    description: "Total number of artworks in the database.",
  },
  {
    label: "Protected artworks",
    value: summary.value.protectedArtworks,
    description: "Artworks marked as protected.",
  },
  {
    label: "Needs category",
    value: summary.value.needsCategoryArtworks,
    description: "Artworks without a category.",
  },
  {
    label: "Total favorites",
    value: summary.value.totalFavorites,
    description: "Total favorites across all artworks.",
  },
]);

const filteredArtworks = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return artworks.value.filter((artwork) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      artwork.title.toLowerCase().includes(normalizedSearch) ||
      artwork.artistName.toLowerCase().includes(normalizedSearch);

    const matchesStatus =
      statusFilter.value === "all" || artwork.status === statusFilter.value;

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
      credentials: "include",
    });

    artworks.value = response.artworks || [];
    summary.value = response.summary || summary.value;
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

    errorMessage.value =
      error?.data?.message || "Unable to load admin artworks.";
  } finally {
    loading.value = false;
  }
}

function statusClass(status) {
  if (status === "Published") {
    return "bg-violet-700/10 text-violet-700";
  }

  if (status === "Protected") {
    return "bg-slate-800 text-slate-100";
  }

  return "bg-amber-950 text-amber-300";
}

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}
</script>
