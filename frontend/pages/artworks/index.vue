<template>
  <main class="min-h-screen bg-black text-slate-100">
    <div class="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-5 sm:py-8">
      <header
        class="flex flex-col gap-5 border-b border-slate-900 pb-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="text-subtitle-2 uppercase tracking-[0.14em] text-violet-400">Marketplace</p>
          <h1 class="mt-3 text-title-2 text-slate-100">Digital artworks</h1>
          <p class="mt-2 text-body-1 text-slate-400">
            Browse {{ filteredArtworks.length }} curated artwork{{
              filteredArtworks.length === 1 ? "" : "s"
            }}.
          </p>
        </div>
        <button
          type="button"
          class="flex h-11 items-center justify-center border border-slate-800 bg-slate-950 px-5 text-subtitle-2 uppercase tracking-[0.12em] lg:hidden"
          :aria-expanded="showFilters"
          aria-controls="artwork-filters"
          @click="showFilters = !showFilters"
        >
          {{ showFilters ? "Hide filters" : "Show filters" }}
        </button>
      </header>

      <div class="mt-6 grid gap-6 lg:grid-cols-[262px_minmax(0,1fr)]">
        <aside
          id="artwork-filters"
          class="border border-slate-800 bg-slate-950/70 px-5 py-6 lg:block lg:self-start"
          :class="showFilters ? 'block' : 'hidden'"
        >
          <h2 class="text-subtitle-2 font-bold uppercase tracking-[0.12em] text-slate-500">
            Filters
          </h2>

          <label class="mt-7 grid gap-3 text-body-1 text-slate-300">
            Search
            <input
              v-model.trim="searchTerm"
              type="search"
              placeholder="Title, artist or category"
              class="h-11 min-w-0 border border-slate-800 bg-black px-4 text-footer text-slate-100 outline-none focus:border-violet-600"
            />
          </label>

          <fieldset class="mt-8">
            <legend class="text-body-1 text-slate-300">Category</legend>
            <div class="mt-3 grid gap-3">
              <label
                v-for="category in categoryOptions"
                :key="category.value"
                class="flex items-center gap-3 text-footer text-slate-400"
              >
                <input
                  v-model="selectedCategories"
                  type="checkbox"
                  :value="category.value"
                  class="h-4 w-4 appearance-none border border-slate-750 bg-black checked:border-violet-600 checked:bg-violet-600"
                />
                <span>{{ category.label }}</span>
              </label>
            </div>
          </fieldset>

          <fieldset class="mt-8">
            <legend class="text-body-1 text-slate-300">Price range</legend>
            <div class="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <input
                v-model="minimumPrice"
                type="number"
                min="0"
                placeholder="Min"
                class="h-10 min-w-0 border border-slate-800 bg-black px-3 text-footer text-slate-100 outline-none focus:border-violet-600"
              />
              <span class="text-footer text-slate-500">to</span>
              <input
                v-model="maximumPrice"
                type="number"
                min="0"
                placeholder="Max"
                class="h-10 min-w-0 border border-slate-800 bg-black px-3 text-footer text-slate-100 outline-none focus:border-violet-600"
              />
            </div>
          </fieldset>

          <label class="mt-8 grid gap-3 text-body-1 text-slate-300">
            Sort by
            <select
              v-model="sortBy"
              class="h-11 border border-slate-800 bg-black px-4 text-footer text-slate-300 outline-none focus:border-violet-600"
            >
              <option value="latest">Recently added</option>
              <option value="popular">Most popular</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
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

          <div v-if="pending" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ArtworkCardSkeleton v-for="index in pageSize" :key="index" />
          </div>
          <AppStatePanel
            v-else-if="errorMessage"
            class="mt-4"
            type="error"
            title="Unable to load artworks"
            :message="errorMessage"
            action-label="Try again"
            :action-disabled="pending"
            @action="refresh"
          />
          <AppStatePanel
            v-else-if="filteredArtworks.length === 0"
            class="mt-4"
            type="empty"
            title="No artworks found"
            message="No public artwork matches the selected filters."
            :action-label="hasActiveFilters ? 'Reset filters' : ''"
            @action="resetFilters"
          />
          <template v-else>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <ArtworkCard
                v-for="artwork in paginatedArtworks"
                :key="artwork.id"
                :artwork="artwork"
                :favorite-loading="Boolean(favoriteLoading[artwork.id])"
                :show-favorite-action="true"
                @toggle-favorite="toggleFavorite"
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
import ArtworkCard from "~/components/marketplace/ArtworkCard.vue";
import ArtworkCardSkeleton from "~/components/marketplace/ArtworkCardSkeleton.vue";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";
import { useAuthStore } from "~/stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const showFilters = ref(false);
const searchTerm = ref("");
const minimumPrice = ref("");
const maximumPrice = ref("");
const sortBy = ref("latest");
const pageSize = 12;

const categoryOptions = [
  { label: "Digital illustrations", value: "illustration" },
  { label: "3D motion", value: "3d-motion" },
  { label: "Graphical assets", value: "graphic" },
  { label: "Photography", value: "photography" }
];
const initialCategory = typeof route.query.artType === "string" ? route.query.artType : "";
const selectedCategories = ref(initialCategory ? [initialCategory] : []);
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;

const { data, pending, error, refresh } = await useFetch("/api/artworks", {
  headers: requestHeaders,
  credentials: "include",
  query: { limit: 80 },
  default: () => ({ artworks: [] })
});

const artworks = computed(() => data.value?.artworks || []);
const errorMessage = computed(() =>
  error.value
    ? error.value?.data?.message || "The artwork catalogue is temporarily unavailable."
    : ""
);
const hasActiveFilters = computed(
  () =>
    Boolean(searchTerm.value) ||
    selectedCategories.value.length > 0 ||
    minimumPrice.value !== "" ||
    maximumPrice.value !== "" ||
    sortBy.value !== "latest"
);

const filteredArtworks = computed(() => {
  const search = searchTerm.value.toLowerCase();
  const min = Number.parseFloat(minimumPrice.value);
  const max = Number.parseFloat(maximumPrice.value);
  const categories = selectedCategories.value;

  const result = artworks.value.filter((artwork) => {
    const haystack = [
      artwork.title,
      artwork.description,
      artwork.category?.name,
      artwork.artist?.displayName,
      artwork.artist?.artType
    ]
      .join(" ")
      .toLowerCase();
    const categoryText = [artwork.category?.name, artwork.artist?.artType].join(" ").toLowerCase();
    const price = Number(artwork.priceValue);
    const matchesCategory =
      categories.length === 0 ||
      categories.some((category) => categoryText.includes(category.replace("-", " ")));
    const matchesMinimum = !Number.isFinite(min) || (Number.isFinite(price) && price >= min);
    const matchesMaximum = !Number.isFinite(max) || (Number.isFinite(price) && price <= max);

    return (
      (!search || haystack.includes(search)) && matchesCategory && matchesMinimum && matchesMaximum
    );
  });

  return [...result].sort((left, right) => {
    if (sortBy.value === "popular") {
      return Number(right.favoriteCount || 0) - Number(left.favoriteCount || 0);
    }
    if (sortBy.value === "price-asc" || sortBy.value === "price-desc") {
      const leftPrice = Number.isFinite(Number(left.priceValue))
        ? Number(left.priceValue)
        : Infinity;
      const rightPrice = Number.isFinite(Number(right.priceValue))
        ? Number(right.priceValue)
        : Infinity;
      return sortBy.value === "price-asc" ? leftPrice - rightPrice : rightPrice - leftPrice;
    }
    return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredArtworks.value.length / pageSize)));
const currentPage = computed(() => {
  const parsed = Number.parseInt(String(route.query.page || "1"), 10);
  return Math.min(Math.max(Number.isInteger(parsed) ? parsed : 1, 1), totalPages.value);
});
const paginatedArtworks = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredArtworks.value.slice(start, start + pageSize);
});

const { actionMessage, actionStatus, favoriteLoading, toggleFavorite } =
  useMarketplaceActions(auth);

watch(
  [searchTerm, minimumPrice, maximumPrice, sortBy, selectedCategories],
  async () => {
    if (!route.query.page) return;
    const query = { ...route.query };
    delete query.page;
    await router.replace({ path: route.path, query });
  },
  { deep: true }
);

watch(
  () => route.query.artType,
  (artType) => {
    selectedCategories.value = typeof artType === "string" ? [artType] : [];
  }
);

onMounted(async () => {
  if (auth.user) return;
  try {
    await auth.fetchCurrentUser();
    await refresh();
  } catch {
    // Public marketplace: anonymous visitors are allowed.
  }
});

function resetFilters() {
  searchTerm.value = "";
  selectedCategories.value = [];
  minimumPrice.value = "";
  maximumPrice.value = "";
  sortBy.value = "latest";
  showFilters.value = false;
}
</script>
