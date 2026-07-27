<template>
  <main class="artist-directory">
    <div class="artist-directory__shell">
      <section class="artist-directory__hero">
        <div class="artist-directory__intro">
          <p class="artist-directory__eyebrow">Global network</p>
          <h1 class="artist-directory__title">All Artists</h1>
        </div>

        <p class="artist-directory__copy">
          Curated selection of digital creators pushing the boundaries of the obsidian aesthetic.
        </p>
      </section>

      <section class="artist-directory__controls">
        <label class="artist-directory__search" aria-label="Search artists">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="artist-directory__search-icon">
            <path
              d="M10.5 4a6.5 6.5 0 1 0 4.18 11.48l4.91 4.91 1.41-1.41-4.91-4.91A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
              fill="currentColor"
            />
          </svg>
          <input
            v-model.trim="searchTerm"
            type="search"
            class="artist-directory__search-input"
            placeholder="Filter by name or style..."
          />
        </label>

        <div class="artist-directory__toolbar">
          <div class="artist-directory__chips" aria-label="Artist filters">
            <button
              v-for="filter in quickFilters"
              :key="filter.value"
              type="button"
              class="artist-directory__chip"
              :class="{ 'artist-directory__chip--active': selectedFilter === filter.value }"
              @click="selectedFilter = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>

          <button
            type="button"
            class="artist-directory__sort-button"
            :title="`Sort: ${activeSortLabel}`"
            :aria-label="`Cycle sort mode. Current sort: ${activeSortLabel}`"
            @click="cycleSort"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 7h10v2H4V7Zm0 8h16v2H4v-2Zm0-4h6v2H4v-2Zm12-5h4v6h-2V9.41l-2.29 2.3-1.42-1.42L16 8.59V6Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </section>

      <div v-if="pending" class="artist-directory__grid" aria-label="Artist placeholders">
        <article
          v-for="placeholder in pageSize"
          :key="placeholder"
          class="artist-tile artist-tile--placeholder"
        >
          <div class="artist-tile__banner" />
          <div class="artist-tile__body">
            <div class="artist-tile__placeholder-line artist-tile__placeholder-line--lg" />
            <div class="artist-tile__placeholder-line artist-tile__placeholder-line--sm" />
            <div class="artist-tile__placeholder-stats">
              <span />
              <span />
            </div>
            <div class="artist-tile__placeholder-button" />
          </div>
        </article>
      </div>

      <section v-else-if="errorMessage" class="artist-directory__state">
        <p class="artist-directory__state-title">Unable to load artists</p>
        <p class="artist-directory__state-copy">{{ errorMessage }}</p>
        <button type="button" class="artist-directory__state-action" @click="refresh">
          Try again
        </button>
      </section>

      <section v-else-if="filteredArtists.length === 0" class="artist-directory__state">
        <p class="artist-directory__state-title">No artists found</p>
        <p class="artist-directory__state-copy">
          No verified artist matches the current search or filter selection.
        </p>
        <button
          v-if="hasActiveFilters"
          type="button"
          class="artist-directory__state-action"
          @click="resetFilters"
        >
          Reset filters
        </button>
      </section>

      <template v-else>
        <section class="artist-directory__grid" aria-label="Artist directory">
          <article v-for="artist in paginatedArtists" :key="artist.id" class="artist-tile">
            <div class="artist-tile__banner" :style="artistBannerStyle(artist)">
              <div class="artist-tile__avatar">
                <img
                  v-if="artist.avatarUrl"
                  :src="artist.avatarUrl"
                  :alt="artist.displayName"
                  class="artist-tile__avatar-image"
                />
                <span v-else>{{ artistInitials(artist) }}</span>
              </div>
            </div>

            <div class="artist-tile__body">
              <div class="artist-tile__head">
                <div class="artist-tile__identity">
                  <div class="artist-tile__name-row">
                    <p class="artist-tile__name">{{ artist.displayName }}</p>
                    <span
                      v-if="artist.verified"
                      class="artist-tile__verified"
                      aria-label="Verified artist"
                    >
                      <svg viewBox="0 0 20 20" aria-hidden="true">
                        <path
                          d="M10 1.75 12.3 3.2l2.7-.09.8 2.57 2.2 1.56-.92 2.53.92 2.53-2.2 1.56-.8 2.57-2.7-.09L10 18.25l-2.3-1.45-2.7.09-.8-2.57-2.2-1.56.92-2.53-.92-2.53 2.2-1.56.8-2.57 2.7.09L10 1.75Z"
                          fill="currentColor"
                        />
                        <path
                          d="m7.9 10.35 1.42 1.42 3.18-3.18"
                          fill="none"
                          stroke="#06070B"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.6"
                        />
                      </svg>
                    </span>
                  </div>
                  <p class="artist-tile__role">{{ artistRole(artist) }}</p>
                </div>
              </div>

              <div class="artist-tile__divider" />

              <div class="artist-tile__stats">
                <div class="artist-tile__stat">
                  <span class="artist-tile__stat-label">Followers</span>
                  <span class="artist-tile__stat-value">
                    {{ formatCompactNumber(artist.stats?.followers) }}
                  </span>
                </div>
                <div class="artist-tile__stat">
                  <span class="artist-tile__stat-label">Artworks</span>
                  <span class="artist-tile__stat-value">
                    {{ formatCompactNumber(artist.stats?.artworks) }}
                  </span>
                </div>
              </div>

              <NuxtLink :to="`/artists/${artist.id}`" class="artist-tile__action">
                View profile
              </NuxtLink>
            </div>
          </article>
        </section>

        <AppPagination :total-pages="totalPages" />
      </template>
    </div>
  </main>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRequestHeaders, useRoute, useRouter } from "#app";
import { getArtistInitials } from "~/utils/marketplace";

const route = useRoute();
const router = useRouter();
const pageSize = 12;
const quickFilters = [
  { label: "All Artists", value: "all" },
  { label: "3D Art", value: "3d-art" },
  { label: "Generative", value: "generative" },
  { label: "Fine Art", value: "fine-art" },
  { label: "Illustration", value: "illustration" }
];
const sortModes = [
  { value: "followers", label: "Most followed" },
  { value: "latest", label: "Recently added" },
  { value: "artworks", label: "Most artworks" }
];
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const searchTerm = ref(typeof route.query.search === "string" ? route.query.search : "");
const selectedFilter = ref(resolveFilterKey(route.query.filter || route.query.artType));
const sortBy = ref(resolveSortValue(route.query.sort));

const { data, pending, error, refresh } = await useFetch("/api/artists", {
  headers: requestHeaders,
  credentials: "include",
  query: { limit: 96 },
  default: () => ({ artists: [] })
});

const artists = computed(() => data.value?.artists || []);
const errorMessage = computed(() =>
  error.value
    ? error.value?.data?.message || "The artist directory is temporarily unavailable."
    : ""
);
const activeSortLabel = computed(
  () => sortModes.find((mode) => mode.value === sortBy.value)?.label || "Most followed"
);
const hasActiveFilters = computed(
  () =>
    Boolean(searchTerm.value) ||
    selectedFilter.value !== "all" ||
    sortBy.value !== sortModes[0].value
);

const filteredArtists = computed(() => {
  const normalizedSearch = normalizeText(searchTerm.value);
  const result = artists.value.filter((artist) => {
    const keywords = buildArtistKeywords(artist);
    const matchesSearch = !normalizedSearch || keywords.includes(normalizedSearch);
    return matchesSearch && matchesQuickFilter(artist, selectedFilter.value);
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

const totalPages = computed(() => Math.max(1, Math.ceil(filteredArtists.value.length / pageSize)));
const currentPage = computed(() => {
  const parsed = Number.parseInt(String(route.query.page || "1"), 10);
  return Math.min(Math.max(Number.isInteger(parsed) ? parsed : 1, 1), totalPages.value);
});
const paginatedArtists = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredArtists.value.slice(start, start + pageSize);
});

watch(
  [searchTerm, selectedFilter, sortBy],
  async () => {
    const nextQuery = { ...route.query };

    if (searchTerm.value) nextQuery.search = searchTerm.value;
    else delete nextQuery.search;

    if (selectedFilter.value !== "all") nextQuery.filter = selectedFilter.value;
    else delete nextQuery.filter;

    delete nextQuery.artType;

    if (sortBy.value !== sortModes[0].value) nextQuery.sort = sortBy.value;
    else delete nextQuery.sort;

    delete nextQuery.page;

    if (sameQuery(route.query, nextQuery)) {
      return;
    }

    await router.replace({ path: route.path, query: nextQuery });
  },
  { deep: true }
);

watch(
  () => route.query,
  (query) => {
    const nextSearch = typeof query.search === "string" ? query.search : "";
    const nextFilter = resolveFilterKey(query.filter || query.artType);
    const nextSort = resolveSortValue(query.sort);

    if (searchTerm.value !== nextSearch) {
      searchTerm.value = nextSearch;
    }

    if (selectedFilter.value !== nextFilter) {
      selectedFilter.value = nextFilter;
    }

    if (sortBy.value !== nextSort) {
      sortBy.value = nextSort;
    }
  },
  { deep: true }
);

function resetFilters() {
  searchTerm.value = "";
  selectedFilter.value = "all";
  sortBy.value = sortModes[0].value;
}

function cycleSort() {
  const currentIndex = sortModes.findIndex((mode) => mode.value === sortBy.value);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % sortModes.length : 0;
  sortBy.value = sortModes[nextIndex].value;
}

function resolveSortValue(value) {
  const normalized = normalizeText(value);
  return sortModes.some((mode) => mode.value === normalized) ? normalized : sortModes[0].value;
}

function resolveFilterKey(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "all";
  }

  if (quickFilters.some((filter) => filter.value === normalized)) {
    return normalized;
  }

  if (normalized.includes("3d")) {
    return "3d-art";
  }

  if (normalized.includes("illustration") || normalized.includes("graphic")) {
    return "illustration";
  }

  if (normalized.includes("generative")) {
    return "generative";
  }

  return "fine-art";
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buildArtistKeywords(artist) {
  return [
    artist.displayName,
    artist.bio,
    artist.artType,
    ...(Array.isArray(artist.styles) ? artist.styles : [])
  ]
    .join(" ")
    .toLowerCase();
}

function matchesQuickFilter(artist, filter) {
  if (filter === "all") {
    return true;
  }

  const haystack = buildArtistKeywords(artist);

  if (filter === "3d-art") {
    return haystack.includes("3d") || haystack.includes("3-d") || haystack.includes("motion");
  }

  if (filter === "generative") {
    return haystack.includes("generative") || haystack.includes("algorithmic");
  }

  if (filter === "illustration") {
    return (
      haystack.includes("illustration") ||
      haystack.includes("graphic") ||
      haystack.includes("vector")
    );
  }

  return (
    haystack.includes("digital art") ||
    haystack.includes("fine art") ||
    haystack.includes("painting") ||
    haystack.includes("mixed media") ||
    haystack.includes("photography")
  );
}

function sameQuery(left, right) {
  const normalizeQueryObject = (query) =>
    JSON.stringify(
      Object.keys(query)
        .sort()
        .reduce((accumulator, key) => {
          accumulator[key] = String(query[key]);
          return accumulator;
        }, {})
    );

  return normalizeQueryObject(left) === normalizeQueryObject(right);
}

function artistInitials(artist) {
  return getArtistInitials(artist.displayName);
}

function artistRole(artist) {
  return artist.artType || "Digital Artist";
}

function formatCompactNumber(value) {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: numericValue >= 100000 ? 0 : 1
  }).format(numericValue);
}

function artistBannerStyle(artist) {
  if (!artist?.coverUrl) {
    return {};
  }

  return {
    backgroundImage: `linear-gradient(180deg, rgba(4, 7, 13, 0.08) 0%, rgba(4, 7, 13, 0.74) 100%), url("${artist.coverUrl}")`
  };
}
</script>

<style scoped>
.artist-directory {
  min-height: 100vh;
  background:
    radial-gradient(circle at top center, rgba(126, 34, 206, 0.14), transparent 28%),
    linear-gradient(180deg, #000000 0%, #03050b 100%);
  color: #e6edf7;
}

.artist-directory__shell {
  margin: 0 auto;
  width: 100%;
  max-width: 1440px;
  padding: 112px 72px 130px;
}

.artist-directory__hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 48px;
}

.artist-directory__intro {
  display: grid;
  gap: 14px;
}

.artist-directory__eyebrow {
  position: relative;
  padding-left: 20px;
  font-family: Geist, sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #b49cff;
}

.artist-directory__eyebrow::before {
  content: "";
  position: absolute;
  left: 0;
  top: -10px;
  height: 60px;
  width: 2px;
  background: linear-gradient(180deg, #7c3aed 0%, rgba(124, 58, 237, 0) 100%);
}

.artist-directory__title {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: clamp(2.7rem, 4vw, 4.2rem);
  font-weight: 700;
  line-height: 0.98;
  color: #ffffff;
}

.artist-directory__copy {
  margin: 0;
  max-width: 350px;
  font-family: Geist, sans-serif;
  font-size: 18px;
  line-height: 1.7;
  text-align: right;
  color: #a4abb8;
}

.artist-directory__controls {
  margin-top: 46px;
  display: grid;
  gap: 24px;
}

.artist-directory__search {
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(100%, 420px);
  min-height: 60px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(17, 18, 21, 0.92);
  padding: 0 20px;
}

.artist-directory__search-icon {
  height: 22px;
  width: 22px;
  color: #a4abb8;
}

.artist-directory__search-input {
  width: 100%;
  border: 0;
  background: transparent;
  color: #e6edf7;
  font-family: Geist, sans-serif;
  font-size: 16px;
  outline: none;
}

.artist-directory__search-input::placeholder {
  color: #7f8794;
}

.artist-directory__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.artist-directory__chips {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.artist-directory__chip,
.artist-directory__sort-button,
.artist-directory__state-action,
.artist-tile__action {
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.artist-directory__chip {
  min-height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(15, 16, 21, 0.9);
  padding: 0 18px;
  font-family: Geist, sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #d5d8df;
}

.artist-directory__chip:hover,
.artist-directory__sort-button:hover,
.artist-directory__state-action:hover,
.artist-tile__action:hover {
  border-color: rgba(139, 92, 246, 0.8);
}

.artist-directory__chip--active {
  border-color: rgba(139, 92, 246, 0.9);
  box-shadow: inset 0 0 0 1px rgba(139, 92, 246, 0.25);
  color: #f4efff;
}

.artist-directory__sort-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: rgba(15, 16, 21, 0.95);
  color: #d5d8df;
}

.artist-directory__sort-button svg {
  width: 21px;
  height: 21px;
}

.artist-directory__grid {
  margin-top: 36px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 48px 18px;
}

.artist-tile {
  min-width: 0;
  border: 1px solid rgba(110, 80, 187, 0.45);
  background: linear-gradient(180deg, rgba(8, 9, 14, 0.98), rgba(10, 13, 22, 0.98));
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.2);
}

.artist-tile__banner {
  position: relative;
  min-height: 164px;
  background:
    radial-gradient(circle at top left, rgba(123, 56, 255, 0.18), transparent 42%),
    linear-gradient(180deg, rgba(17, 20, 31, 0.92) 0%, rgba(17, 20, 31, 0.88) 100%);
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.artist-tile__avatar {
  position: absolute;
  left: 22px;
  top: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  border: 2px solid rgba(123, 56, 255, 0.35);
  border-radius: 999px;
  overflow: hidden;
  background: #1a1530;
  font-family: Geist, sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #f6f1ff;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.24);
}

.artist-tile__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.artist-tile__body {
  display: grid;
  gap: 22px;
  padding: 22px 22px 18px;
}

.artist-tile__head {
  min-height: 58px;
}

.artist-tile__identity {
  min-width: 0;
}

.artist-tile__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.artist-tile__name {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: Geist, sans-serif;
  font-size: 21px;
  font-weight: 600;
  color: #ffffff;
}

.artist-tile__verified {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  color: #f4f0ff;
}

.artist-tile__verified svg {
  width: 100%;
  height: 100%;
}

.artist-tile__role {
  margin: 8px 0 0;
  font-family: Geist, sans-serif;
  font-size: 16px;
  line-height: 1.35;
  color: #a3a9b6;
}

.artist-tile__divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
}

.artist-tile__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.artist-tile__stat {
  display: grid;
  gap: 8px;
  text-align: center;
}

.artist-tile__stat + .artist-tile__stat {
  border-left: 1px solid rgba(255, 255, 255, 0.06);
}

.artist-tile__stat-label {
  font-family: Geist, sans-serif;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7e8694;
}

.artist-tile__stat-value {
  font-family: Geist, sans-serif;
  font-size: 28px;
  font-weight: 600;
  line-height: 1;
  color: #ffffff;
}

.artist-tile__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(27, 29, 38, 0.95);
  font-family: Geist, sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #dce0e8;
  text-decoration: none;
}

.artist-directory__state {
  margin-top: 36px;
  display: grid;
  justify-items: start;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(13, 14, 18, 0.9);
  padding: 32px;
}

.artist-directory__state-title {
  margin: 0;
  font-family: Geist, sans-serif;
  font-size: 28px;
  font-weight: 600;
  color: #ffffff;
}

.artist-directory__state-copy {
  margin: 0;
  max-width: 640px;
  font-family: Geist, sans-serif;
  font-size: 16px;
  line-height: 1.7;
  color: #a4abb8;
}

.artist-directory__state-action {
  min-height: 46px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(17, 18, 21, 0.95);
  padding: 0 18px;
  font-family: Geist, sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #f4efff;
}

.artist-tile--placeholder {
  overflow: hidden;
}

.artist-tile--placeholder .artist-tile__banner,
.artist-tile__placeholder-line,
.artist-tile__placeholder-stats span,
.artist-tile__placeholder-button {
  background: linear-gradient(
    90deg,
    rgba(30, 34, 45, 0.92),
    rgba(49, 55, 70, 0.92),
    rgba(30, 34, 45, 0.92)
  );
  background-size: 200% 100%;
  animation: artist-directory-pulse 1.4s ease infinite;
}

.artist-tile__placeholder-line {
  height: 16px;
  border-radius: 999px;
}

.artist-tile__placeholder-line--lg {
  width: 72%;
}

.artist-tile__placeholder-line--sm {
  width: 42%;
}

.artist-tile__placeholder-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.artist-tile__placeholder-stats span {
  display: block;
  height: 52px;
}

.artist-tile__placeholder-button {
  height: 48px;
}

@keyframes artist-directory-pulse {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 1279px) {
  .artist-directory__shell {
    padding-inline: 40px;
  }

  .artist-directory__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1023px) {
  .artist-directory__hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .artist-directory__copy {
    max-width: 600px;
    text-align: left;
  }

  .artist-directory__toolbar {
    align-items: flex-start;
  }

  .artist-directory__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .artist-directory__shell {
    padding: 64px 20px 88px;
  }

  .artist-directory__controls {
    margin-top: 32px;
  }

  .artist-directory__search {
    width: 100%;
  }

  .artist-directory__toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .artist-directory__chips {
    width: 100%;
  }

  .artist-directory__sort-button {
    align-self: flex-end;
  }

  .artist-directory__grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }

  .artist-tile__stats {
    gap: 10px;
  }

  .artist-tile__stat-value {
    font-size: 24px;
  }
}
</style>
