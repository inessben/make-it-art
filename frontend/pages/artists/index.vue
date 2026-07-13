<template>
  <main class="min-h-screen bg-black text-slate-100">
    <div class="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-5 sm:py-8">
      <header class="flex flex-col gap-5 border-b border-slate-900 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-subtitle-2 uppercase tracking-[0.14em] text-violet-400">Collections</p>
          <h1 class="mt-3 text-title-2 text-slate-100">Artists</h1>
          <p class="mt-2 text-body-1 text-slate-400">
            Discover {{ filteredArtists.length }} curated artist{{ filteredArtists.length === 1 ? "" : "s" }}.
          </p>
        </div>
        <button
          type="button"
          class="flex h-11 items-center justify-center border border-slate-800 bg-slate-950 px-5 text-subtitle-2 uppercase tracking-[0.12em] lg:hidden"
          :aria-expanded="showFilters"
          aria-controls="artist-filters"
          @click="showFilters = !showFilters"
        >
          {{ showFilters ? "Hide filters" : "Show filters" }}
        </button>
      </header>

      <div class="mt-6 grid gap-6 lg:grid-cols-[262px_minmax(0,1fr)]">
        <aside
          id="artist-filters"
          class="border border-slate-800 bg-slate-950/70 px-5 py-6 lg:block lg:self-start"
          :class="showFilters ? 'block' : 'hidden'"
        >
          <h2 class="text-subtitle-2 font-bold uppercase tracking-[0.12em] text-slate-500">Filters</h2>

          <label class="mt-7 grid gap-3 text-body-1 text-slate-300">
            Search
            <input
              v-model.trim="searchTerm"
              type="search"
              placeholder="Name, bio or style"
              class="h-11 min-w-0 border border-slate-800 bg-black px-4 text-footer text-slate-100 outline-none focus:border-violet-600"
            />
          </label>

          <fieldset class="mt-8">
            <legend class="text-body-1 text-slate-300">Art type</legend>
            <div class="mt-3 grid gap-3">
              <label
                v-for="type in artTypes"
                :key="type.value"
                class="flex items-center gap-3 text-footer text-slate-400"
              >
                <input
                  v-model="selectedTypes"
                  type="checkbox"
                  :value="type.value"
                  class="h-4 w-4 appearance-none border border-slate-750 bg-black checked:border-violet-600 checked:bg-violet-600"
                />
                <span>{{ type.label }}</span>
              </label>
            </div>
          </fieldset>

          <label class="mt-8 grid gap-3 text-body-1 text-slate-300">
            Artistic style
            <input
              v-model.trim="style"
              type="search"
              placeholder="Style"
              class="h-11 min-w-0 border border-slate-800 bg-black px-4 text-footer text-slate-100 outline-none focus:border-violet-600"
            />
          </label>

          <label class="mt-8 grid gap-3 text-body-1 text-slate-300">
            Sort by
            <select
              v-model="sortBy"
              class="h-11 border border-slate-800 bg-black px-4 text-footer text-slate-300 outline-none focus:border-violet-600"
            >
              <option value="featured">Featured artists</option>
              <option value="latest">Recently added</option>
              <option value="artworks">Most artworks</option>
              <option value="followers">Most followed</option>
            </select>
          </label>

          <button
            type="button"
            class="mt-8 flex h-12 w-full items-center justify-center bg-violet-600 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!hasActiveFilters"
            @click="resetFilters"
          >
            Reset all filters
          </button>
        </aside>

        <section class="min-w-0">
          <AppStatePanel
            v-if="actionMessage"
            compact
            :type="actionStatus || 'success'"
            :message="actionMessage"
          />
          <AppStatePanel
            v-if="pending"
            class="mt-4"
            type="loading"
            title="Loading artists"
            message="Curated artist profiles are being retrieved."
          />
          <AppStatePanel
            v-else-if="errorMessage"
            class="mt-4"
            type="error"
            title="Unable to load artists"
            :message="errorMessage"
            action-label="Try again"
            :action-disabled="pending"
            @action="refresh"
          />
          <AppStatePanel
            v-else-if="filteredArtists.length === 0"
            class="mt-4"
            type="empty"
            title="No artists found"
            message="No verified artist matches the selected filters."
            :action-label="hasActiveFilters ? 'Reset filters' : ''"
            @action="resetFilters"
          />
          <template v-else>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <ArtistCard
                v-for="artist in paginatedArtists"
                :key="artist.id"
                :artist="artist"
                :follow-loading="Boolean(followLoading[artist.id])"
                :show-follow-action="true"
                @toggle-follow="toggleFollow"
              />
            </div>
            <AppPagination :total-pages="totalPages" />
          </template>
        </section>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRequestHeaders, useRoute, useRouter } from "#app";
import ArtistCard from "~/components/marketplace/ArtistCard.vue";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";
import { useAuthStore } from "~/stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const showFilters = ref(false);
const searchTerm = ref("");
const style = ref("");
const sortBy = ref("featured");
const pageSize = 12;
const artTypes = [
  { label: "Digital illustrations", value: "illustration" },
  { label: "3D motion", value: "3d-motion" },
  { label: "Graphical assets", value: "graphic" },
  { label: "Photography", value: "photography" },
];
const initialType =
  typeof route.query.artType === "string" ? route.query.artType : "";
const selectedTypes = ref(initialType ? [initialType] : []);
const requestHeaders = import.meta.server
  ? useRequestHeaders(["cookie"])
  : undefined;

const { data, pending, error, refresh } = await useFetch("/api/artists", {
  headers: requestHeaders,
  credentials: "include",
  query: { limit: 60 },
  default: () => ({ artists: [] }),
});

const artists = computed(() => data.value?.artists || []);
const errorMessage = computed(
  () => error.value?.data?.message || "The artist directory is temporarily unavailable.",
);
const hasActiveFilters = computed(
  () =>
    Boolean(searchTerm.value) ||
    Boolean(style.value) ||
    selectedTypes.value.length > 0 ||
    sortBy.value !== "featured",
);

const filteredArtists = computed(() => {
  const search = searchTerm.value.toLowerCase();
  const requestedStyle = style.value.toLowerCase();
  const types = selectedTypes.value;
  const result = artists.value.filter((artist) => {
    const styles = Array.isArray(artist.styles) ? artist.styles : [];
    const haystack = [
      artist.displayName,
      artist.bio,
      artist.artType,
      ...styles,
    ].join(" ").toLowerCase();
    const artType = String(artist.artType || "").toLowerCase();
    const matchesType =
      types.length === 0 ||
      types.some((type) => artType.includes(type.replace("-", " ")));
    const matchesStyle =
      !requestedStyle ||
      styles.some((item) => String(item).toLowerCase().includes(requestedStyle));

    return (!search || haystack.includes(search)) && matchesType && matchesStyle;
  });

  return [...result].sort((left, right) => {
    if (sortBy.value === "latest") {
      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    }
    if (sortBy.value === "artworks") {
      return Number(right.stats?.artworks || 0) - Number(left.stats?.artworks || 0);
    }
    return Number(right.stats?.followers || 0) - Number(left.stats?.followers || 0);
  });
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredArtists.value.length / pageSize)),
);
const currentPage = computed(() => {
  const parsed = Number.parseInt(String(route.query.page || "1"), 10);
  return Math.min(Math.max(Number.isInteger(parsed) ? parsed : 1, 1), totalPages.value);
});
const paginatedArtists = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredArtists.value.slice(start, start + pageSize);
});

const {
  actionMessage,
  actionStatus,
  followLoading,
  toggleFollow,
} = useMarketplaceActions(auth);

watch(
  [searchTerm, style, sortBy, selectedTypes],
  async () => {
    if (!route.query.page) return;
    const query = { ...route.query };
    delete query.page;
    await router.replace({ path: route.path, query });
  },
  { deep: true },
);

watch(
  () => route.query.artType,
  (artType) => {
    selectedTypes.value = typeof artType === "string" ? [artType] : [];
  },
);

onMounted(async () => {
  if (auth.user) return;
  try {
    await auth.fetchCurrentUser();
    await refresh();
  } catch {
    // Public directory: anonymous visitors are allowed.
  }
});

function resetFilters() {
  searchTerm.value = "";
  style.value = "";
  selectedTypes.value = [];
  sortBy.value = "featured";
  showFilters.value = false;
}
</script>
