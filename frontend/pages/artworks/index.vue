<template>
  <main class="marketplace-page">
    <div class="marketplace-page__shell">
      <div class="marketplace-page__topbar">
        <div class="marketplace-page__eyebrow">
          <span>Marketplace</span>
          <span>{{ formattedResultsCount }} artworks</span>
        </div>

        <button
          type="button"
          class="marketplace-page__filters-toggle"
          :aria-expanded="showFilters"
          aria-controls="marketplace-filters"
          @click="showFilters = !showFilters"
        >
          {{ showFilters ? "Hide filters" : "Show filters" }}
        </button>
      </div>

      <div class="marketplace-layout">
        <aside
          id="marketplace-filters"
          class="marketplace-filters"
          :class="{ 'marketplace-filters--open': showFilters }"
        >
          <div class="marketplace-filters__section">
            <p class="marketplace-filters__section-title">Filters</p>
          </div>

          <div class="marketplace-filters__section">
            <h2 class="marketplace-filters__label">Category</h2>
            <label
              v-for="option in categoryOptions"
              :key="option.value"
              class="marketplace-filters__checkbox"
            >
              <input v-model="selectedCategories" type="checkbox" :value="option.value" />
              <span class="marketplace-filters__checkbox-mark" />
              <span class="marketplace-filters__checkbox-label">{{ option.label }}</span>
            </label>
          </div>

          <div class="marketplace-filters__section">
            <h2 class="marketplace-filters__label">Price Range (EUR)</h2>
            <div class="marketplace-filters__range">
              <input
                v-model="minimumPrice"
                type="number"
                min="0"
                placeholder="Min"
                class="marketplace-filters__input"
              />
              <span>to</span>
              <input
                v-model="maximumPrice"
                type="number"
                min="0"
                placeholder="Max"
                class="marketplace-filters__input"
              />
            </div>
          </div>

          <div class="marketplace-filters__section">
            <h2 class="marketplace-filters__label">File Type</h2>
            <div class="marketplace-filters__pills">
              <button
                v-for="type in fileTypeOptions"
                :key="type.value"
                type="button"
                class="marketplace-filters__pill"
                :class="{
                  'marketplace-filters__pill--active': selectedFileTypes.includes(type.value)
                }"
                @click="toggleFileType(type.value)"
              >
                {{ type.label }}
              </button>
            </div>
          </div>

          <div class="marketplace-filters__section">
            <h2 class="marketplace-filters__label">Artist Status</h2>
            <select v-model="artistStatus" class="marketplace-filters__select">
              <option value="all">All artists</option>
              <option value="verified">Verified Creators Only</option>
            </select>
          </div>

          <button
            type="button"
            class="marketplace-filters__reset"
            :disabled="!hasActiveFilters"
            @click="resetFilters"
          >
            Reset All Filters
          </button>
        </aside>

        <section class="marketplace-content">
          <div
            v-if="actionMessage"
            class="marketplace-feedback"
            :class="{
              'marketplace-feedback--error': actionStatus === 'error',
              'marketplace-feedback--success': actionStatus !== 'error'
            }"
          >
            {{ actionMessage }}
          </div>

          <div v-if="pending" class="marketplace-loading">
            <div class="marketplace-showcase">
              <article
                class="marketplace-card marketplace-card--featured marketplace-card--placeholder"
              />
              <div class="marketplace-spotlight">
                <article
                  v-for="index in 4"
                  :key="`spotlight-placeholder-${index}`"
                  class="marketplace-card marketplace-card--placeholder"
                />
              </div>
            </div>

            <div class="marketplace-gallery">
              <article
                v-for="index in 4"
                :key="`gallery-placeholder-${index}`"
                class="marketplace-card marketplace-card--placeholder"
              />
            </div>
          </div>

          <div v-else-if="errorMessage" class="marketplace-empty-state">
            <p class="marketplace-empty-state__title">Unable to load artworks</p>
            <p class="marketplace-empty-state__copy">{{ errorMessage }}</p>
            <button type="button" class="marketplace-empty-state__action" @click="refresh">
              Try again
            </button>
          </div>

          <div v-else-if="paginatedArtworks.length === 0" class="marketplace-empty-state">
            <p class="marketplace-empty-state__title">No artworks found</p>
            <p class="marketplace-empty-state__copy">
              No public artwork matches the selected filters right now.
            </p>
            <button
              v-if="hasActiveFilters"
              type="button"
              class="marketplace-empty-state__action"
              @click="resetFilters"
            >
              Reset filters
            </button>
          </div>

          <template v-else>
            <div
              class="marketplace-showcase"
              :class="{ 'marketplace-showcase--solo': spotlightArtworks.length === 0 }"
            >
              <article v-if="heroArtwork" class="marketplace-card marketplace-card--featured">
                <NuxtLink
                  :to="`/artworks/${heroArtwork.id}`"
                  class="marketplace-card__featured-image-shell"
                >
                  <img
                    v-if="heroArtwork.imageUrl"
                    :src="heroArtwork.imageUrl"
                    :alt="heroArtwork.title"
                    class="marketplace-card__featured-image"
                  />
                  <div v-else class="marketplace-card__featured-fallback">
                    {{ artworkInitials(heroArtwork) }}
                  </div>
                </NuxtLink>

                <div class="marketplace-card__featured-body">
                  <div class="marketplace-card__featured-heading">
                    <div>
                      <NuxtLink
                        :to="`/artworks/${heroArtwork.id}`"
                        class="marketplace-card__featured-title"
                      >
                        {{ heroArtwork.title }}
                      </NuxtLink>
                      <p class="marketplace-card__featured-artist">
                        Artist: {{ artworkHandle(heroArtwork) }}
                      </p>
                    </div>

                    <p class="marketplace-card__featured-price">
                      {{ artworkPrice(heroArtwork) }}
                    </p>
                  </div>

                  <button
                    type="button"
                    class="marketplace-card__featured-button"
                    :disabled="
                      Boolean(cartLoading[heroArtwork.id]) ||
                      !heroArtwork.isAvailableForPurchase ||
                      isArtworkOwnedByArtist(heroArtwork, auth.user)
                    "
                    @click="addToCart(heroArtwork)"
                  >
                    {{
                      cartLoading[heroArtwork.id]
                        ? "Adding..."
                        : heroArtwork.isAvailableForPurchase
                          ? "Add to cart"
                          : "Unavailable"
                    }}
                  </button>
                </div>
              </article>

              <div v-if="spotlightArtworks.length > 0" class="marketplace-spotlight">
                <article
                  v-for="artwork in spotlightArtworks"
                  :key="`spotlight-${artwork.id}`"
                  class="marketplace-card marketplace-card--compact"
                >
                  <div class="marketplace-card__image-wrap">
                    <NuxtLink :to="`/artworks/${artwork.id}`" class="marketplace-card__image-link">
                      <img
                        v-if="artwork.imageUrl"
                        :src="artwork.imageUrl"
                        :alt="artwork.title"
                        class="marketplace-card__image"
                      />
                      <div v-else class="marketplace-card__image marketplace-card__image--fallback">
                        {{ artworkInitials(artwork) }}
                      </div>
                    </NuxtLink>

                    <button
                      type="button"
                      class="marketplace-card__favorite"
                      :class="{ 'marketplace-card__favorite--active': artwork.isFavorite }"
                      :disabled="Boolean(favoriteLoading[artwork.id])"
                      @click.stop="toggleFavorite(artwork)"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        class="marketplace-card__favorite-icon"
                        aria-hidden="true"
                      >
                        <path
                          v-if="artwork.isFavorite"
                          d="M12 20.4 4.9 13.8C3 12.1 2 10.5 2 8.6 2 5.8 4.2 4 6.8 4c1.5 0 3 .7 4 1.9C11.9 4.7 13.4 4 14.9 4 17.6 4 20 5.8 20 8.6c0 1.9-1 3.5-2.9 5.2L12 20.4Z"
                        />
                        <path
                          v-else
                          d="M12 20.4 4.9 13.8C3 12.1 2 10.5 2 8.6 2 5.8 4.2 4 6.8 4c1.5 0 3 .7 4 1.9C11.9 4.7 13.4 4 14.9 4 17.6 4 20 5.8 20 8.6c0 1.9-1 3.5-2.9 5.2L12 20.4Z"
                          fill="none"
                          stroke="currentColor"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.8"
                        />
                      </svg>
                    </button>
                  </div>

                  <div class="marketplace-card__body">
                    <div>
                      <NuxtLink :to="`/artworks/${artwork.id}`" class="marketplace-card__title">
                        {{ artwork.title }}
                      </NuxtLink>
                      <p class="marketplace-card__price">{{ artworkPrice(artwork) }}</p>
                    </div>

                    <div class="marketplace-card__meta">
                      <span v-if="artworkMetaLabel(artwork)" class="marketplace-card__tag">
                        {{ artworkMetaLabel(artwork) }}
                      </span>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            <div class="marketplace-footerbar">
              <div>
                <h1 class="marketplace-footerbar__title">{{ collectionTitle }}</h1>
                <p class="marketplace-footerbar__copy">
                  Discovering {{ formattedResultsCount }} unique digital
                  {{ filteredArtworks.length === 1 ? "artifact" : "artifacts" }}
                </p>
              </div>

              <div class="marketplace-footerbar__controls">
                <label class="marketplace-footerbar__sort">
                  <span class="marketplace-footerbar__sort-icon" aria-hidden="true">+/-</span>
                  <select v-model="sortBy">
                    <option value="latest">Recently added</option>
                    <option value="popular">Most popular</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                  </select>
                </label>

                <button
                  type="button"
                  class="marketplace-footerbar__view marketplace-footerbar__view--active"
                  aria-label="Grid view"
                >
                  <span />
                  <span />
                  <span />
                  <span />
                </button>
              </div>
            </div>

            <div v-if="galleryArtworks.length > 0" class="marketplace-gallery">
              <article
                v-for="artwork in galleryArtworks"
                :key="`gallery-${artwork.id}`"
                class="marketplace-card marketplace-card--compact"
              >
                <div class="marketplace-card__image-wrap">
                  <NuxtLink :to="`/artworks/${artwork.id}`" class="marketplace-card__image-link">
                    <img
                      v-if="artwork.imageUrl"
                      :src="artwork.imageUrl"
                      :alt="artwork.title"
                      class="marketplace-card__image"
                    />
                    <div v-else class="marketplace-card__image marketplace-card__image--fallback">
                      {{ artworkInitials(artwork) }}
                    </div>
                  </NuxtLink>

                  <button
                    type="button"
                    class="marketplace-card__favorite"
                    :class="{ 'marketplace-card__favorite--active': artwork.isFavorite }"
                    :disabled="Boolean(favoriteLoading[artwork.id])"
                    @click.stop="toggleFavorite(artwork)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      class="marketplace-card__favorite-icon"
                      aria-hidden="true"
                    >
                      <path
                        v-if="artwork.isFavorite"
                        d="M12 20.4 4.9 13.8C3 12.1 2 10.5 2 8.6 2 5.8 4.2 4 6.8 4c1.5 0 3 .7 4 1.9C11.9 4.7 13.4 4 14.9 4 17.6 4 20 5.8 20 8.6c0 1.9-1 3.5-2.9 5.2L12 20.4Z"
                      />
                      <path
                        v-else
                        d="M12 20.4 4.9 13.8C3 12.1 2 10.5 2 8.6 2 5.8 4.2 4 6.8 4c1.5 0 3 .7 4 1.9C11.9 4.7 13.4 4 14.9 4 17.6 4 20 5.8 20 8.6c0 1.9-1 3.5-2.9 5.2L12 20.4Z"
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.8"
                      />
                    </svg>
                  </button>
                </div>

                <div class="marketplace-card__body">
                  <div>
                    <NuxtLink :to="`/artworks/${artwork.id}`" class="marketplace-card__title">
                      {{ artwork.title }}
                    </NuxtLink>
                    <p class="marketplace-card__price">{{ artworkPrice(artwork) }}</p>
                  </div>

                  <div class="marketplace-card__meta">
                    <span v-if="artworkMetaLabel(artwork)" class="marketplace-card__tag">
                      {{ artworkMetaLabel(artwork) }}
                    </span>
                  </div>
                </div>
              </article>
            </div>

            <nav class="marketplace-pagination" aria-label="Marketplace pagination">
              <button
                type="button"
                class="marketplace-pagination__arrow"
                :disabled="currentPage === 1"
                @click="goToPage(currentPage - 1)"
              >
                &lt;
              </button>

              <template v-for="item in displayedPages" :key="item.key">
                <span
                  v-if="item.type === 'ellipsis'"
                  class="marketplace-pagination__ellipsis"
                  aria-hidden="true"
                >
                  ...
                </span>
                <button
                  v-else
                  type="button"
                  class="marketplace-pagination__page"
                  :class="{ 'marketplace-pagination__page--active': item.page === currentPage }"
                  :aria-current="item.page === currentPage ? 'page' : undefined"
                  @click="goToPage(item.page)"
                >
                  {{ item.page }}
                </button>
              </template>

              <button
                type="button"
                class="marketplace-pagination__arrow"
                :disabled="currentPage === totalPages"
                @click="goToPage(currentPage + 1)"
              >
                &gt;
              </button>
            </nav>
          </template>
        </section>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { navigateTo, useRequestHeaders, useRoute, useRouter } from "#app";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";
import { useAuthStore } from "~/stores/auth";
import { useCartStore } from "~/stores/cart";
import {
  formatMarketplacePrice,
  getArtistInitials,
  isArtworkOwnedByArtist
} from "~/utils/marketplace";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();

const showFilters = ref(false);
const minimumPrice = ref("");
const maximumPrice = ref("");
const sortBy = ref("latest");
const artistStatus = ref("all");
const selectedFileTypes = ref([]);
const cartLoading = ref({});
const pageSize = 12;

const categoryGroups = [
  {
    value: "digital-illustrations",
    label: "Digital Illustrations",
    matches: ["illustration", "peinture numerique", "digital art", "digital arts"]
  },
  {
    value: "3d-motion",
    label: "3D Motion",
    matches: ["art 3d", "3d", "animation", "motion"]
  },
  {
    value: "assets",
    label: "Assets",
    matches: ["graphic", "graphics", "art generatif", "collage", "mix media", "asset"]
  },
  {
    value: "photography",
    label: "Photography",
    matches: ["photographie", "photography", "photo"]
  }
];

const fileTypeOptions = [
  { label: "GIF", value: "gif" },
  { label: "SVG", value: "svg" },
  { label: "PNG", value: "png" }
];

const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const initialSearch = typeof route.query.search === "string" ? route.query.search : "";
const initialCategoryQuery =
  typeof route.query.artType === "string"
    ? route.query.artType
    : typeof route.query.category === "string"
      ? route.query.category
      : "";

const searchTerm = ref(initialSearch);
const selectedCategories = ref(buildCategorySelection(initialCategoryQuery));

const { data, pending, error, refresh } = await useFetch("/api/artworks", {
  headers: requestHeaders,
  credentials: "include",
  query: {
    limit: 80
  },
  default: () => ({
    artworks: []
  })
});

const artworks = computed(() => data.value?.artworks || []);
const errorMessage = computed(() =>
  error.value
    ? error.value?.data?.message || "The artwork catalogue is temporarily unavailable."
    : ""
);

const categoryOptions = computed(() => categoryGroups);

const hasActiveFilters = computed(
  () =>
    Boolean(searchTerm.value) ||
    selectedCategories.value.length > 0 ||
    selectedFileTypes.value.length > 0 ||
    minimumPrice.value !== "" ||
    maximumPrice.value !== "" ||
    artistStatus.value !== "all" ||
    sortBy.value !== "latest"
);

const filteredArtworks = computed(() => {
  const search = normalizeKey(searchTerm.value);
  const min = Number.parseFloat(minimumPrice.value);
  const max = Number.parseFloat(maximumPrice.value);

  const result = artworks.value.filter((artwork) => {
    const searchableText = normalizeKey(
      [
        artwork.title,
        artwork.description,
        artwork.category?.name,
        artwork.artist?.displayName,
        artwork.artist?.artType
      ].join(" ")
    );

    const artworkCategoryGroup = resolveArtworkCategoryGroup(artwork);
    const artworkPriceValue = Number(artwork.priceValue);
    const artworkFileType = resolveArtworkFileType(artwork);
    const matchesCategory =
      selectedCategories.value.length === 0 ||
      selectedCategories.value.includes(artworkCategoryGroup);
    const matchesMinimum =
      !Number.isFinite(min) || (Number.isFinite(artworkPriceValue) && artworkPriceValue >= min);
    const matchesMaximum =
      !Number.isFinite(max) || (Number.isFinite(artworkPriceValue) && artworkPriceValue <= max);
    const matchesArtistStatus =
      artistStatus.value !== "verified" || Boolean(artwork.artist?.verified);
    const matchesFileType =
      selectedFileTypes.value.length === 0 ||
      (artworkFileType && selectedFileTypes.value.includes(artworkFileType));

    return (
      (!search || searchableText.includes(search)) &&
      matchesCategory &&
      matchesMinimum &&
      matchesMaximum &&
      matchesArtistStatus &&
      matchesFileType
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

const heroArtwork = computed(() => paginatedArtworks.value[0] || null);
const spotlightArtworks = computed(() => paginatedArtworks.value.slice(1, 5));
const galleryArtworks = computed(() => paginatedArtworks.value.slice(5));

const formattedResultsCount = computed(() =>
  new Intl.NumberFormat("en-US").format(filteredArtworks.value.length)
);

const collectionTitle = computed(() => {
  if (selectedCategories.value.length > 0) {
    return categoryLabelFromValue(selectedCategories.value[0]);
  }

  return (
    categoryLabelFromValue(resolveArtworkCategoryGroup(heroArtwork.value)) ||
    categoryLabelFromValue(resolveArtworkCategoryGroup(filteredArtworks.value[0])) ||
    "Digital Artworks"
  );
});

const displayedPages = computed(() => {
  if (totalPages.value <= 7) {
    return Array.from({ length: totalPages.value }, (_, index) => ({
      type: "page",
      page: index + 1,
      key: `page-${index + 1}`
    }));
  }

  const pages = new Set([1, totalPages.value]);
  const start = Math.max(2, currentPage.value - 1);
  const end = Math.min(totalPages.value - 1, currentPage.value + 1);

  if (currentPage.value <= 3) {
    pages.add(2);
    pages.add(3);
  } else if (currentPage.value >= totalPages.value - 2) {
    pages.add(totalPages.value - 2);
    pages.add(totalPages.value - 1);
  } else {
    for (let page = start; page <= end; page += 1) {
      pages.add(page);
    }
  }

  const orderedPages = [...pages].sort((left, right) => left - right);
  const items = [];

  orderedPages.forEach((page, index) => {
    if (index > 0 && page - orderedPages[index - 1] > 1) {
      items.push({ type: "ellipsis", key: `ellipsis-${page}` });
    }

    items.push({ type: "page", page, key: `page-${page}` });
  });

  return items;
});

const { actionMessage, actionStatus, favoriteLoading, toggleFavorite } =
  useMarketplaceActions(auth);

watch(
  [
    searchTerm,
    minimumPrice,
    maximumPrice,
    sortBy,
    selectedCategories,
    selectedFileTypes,
    artistStatus
  ],
  async () => {
    if (!route.query.page) {
      return;
    }

    const query = { ...route.query };
    delete query.page;
    await router.replace({ path: route.path, query });
  },
  { deep: true }
);

watch(
  () => [route.query.search, route.query.artType, route.query.category],
  ([search, artType, category]) => {
    searchTerm.value = typeof search === "string" ? search : "";

    const categoryQuery =
      typeof artType === "string" ? artType : typeof category === "string" ? category : "";
    selectedCategories.value = buildCategorySelection(categoryQuery);
  }
);

onMounted(async () => {
  if (auth.user) {
    return;
  }

  try {
    await auth.fetchCurrentUser();
    await refresh();
  } catch {
    // Public marketplace stays accessible for anonymous visitors.
  }
});

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function categoryLabelFromValue(value) {
  return categoryGroups.find((group) => group.value === value)?.label || "";
}

function buildCategorySelection(rawValue) {
  const resolved = resolveCategoryGroupValue(rawValue);
  return resolved ? [resolved] : [];
}

function resolveCategoryGroupValue(rawValue) {
  const normalized = normalizeKey(rawValue).replace(/_/g, "-");
  const exact = categoryGroups.find((group) => group.value === normalized);

  if (exact) {
    return exact.value;
  }

  const partial = categoryGroups.find((group) =>
    group.matches.some((match) => normalized.includes(match))
  );

  return partial?.value || "";
}

function resolveArtworkCategoryGroup(artwork) {
  const sources = [
    normalizeKey(artwork?.category?.name),
    normalizeKey(artwork?.artist?.artType),
    normalizeKey(artwork?.title)
  ].filter(Boolean);

  const found = categoryGroups.find((group) =>
    sources.some((source) => group.matches.some((match) => source.includes(match)))
  );

  return found?.value || categoryGroups[0].value;
}

function resolveArtworkFileType(artwork) {
  const candidateUrl = artwork?.previewUrl || artwork?.imageUrl || "";
  const sanitized = String(candidateUrl).split("?")[0];
  const extension = sanitized.includes(".") ? sanitized.split(".").pop()?.toLowerCase() : "";

  if (["gif", "svg", "png"].includes(extension)) {
    return extension;
  }

  return "";
}

function toggleFileType(type) {
  if (selectedFileTypes.value.includes(type)) {
    selectedFileTypes.value = selectedFileTypes.value.filter((entry) => entry !== type);
    return;
  }

  selectedFileTypes.value = [...selectedFileTypes.value, type];
}

function artworkInitials(artwork) {
  return getArtistInitials(artwork?.artist?.displayName || artwork?.title);
}

function artworkHandle(artwork) {
  const value = artwork?.artist?.displayName || artwork?.artist?.username || "Unknown artist";

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

function artworkPrice(artwork) {
  return formatMarketplacePrice(artwork?.priceValue ?? artwork?.price);
}

function artworkMetaLabel(artwork) {
  if (artwork?.artist?.verified) {
    return "Curated";
  }

  if (Number(artwork?.favoriteCount || 0) > 0) {
    return `${artwork.favoriteCount} favorite${artwork.favoriteCount > 1 ? "s" : ""}`;
  }

  return "";
}

function setCartLoading(artworkId, value) {
  cartLoading.value = {
    ...cartLoading.value,
    [artworkId]: value
  };
}

async function ensureCollectorSessionForCart() {
  if (!auth.user) {
    try {
      await auth.fetchCurrentUser();
    } catch {
      await navigateTo("/login");
      return false;
    }
  }

  if (auth.isAdmin) {
    await navigateTo("/admin");
    return false;
  }

  return true;
}

async function addToCart(artwork) {
  actionMessage.value = "";
  actionStatus.value = "";

  if (!(await ensureCollectorSessionForCart())) {
    return;
  }

  if (isArtworkOwnedByArtist(artwork, auth.user)) {
    actionMessage.value = "You cannot add your own artwork to the cart.";
    actionStatus.value = "error";
    return;
  }

  if (!artwork?.isAvailableForPurchase) {
    actionMessage.value = "This artwork is not available for purchase.";
    actionStatus.value = "error";
    return;
  }

  setCartLoading(artwork.id, true);

  try {
    await cart.setItem(artwork.id, 1);
    actionMessage.value = "Artwork added to your cart.";
    actionStatus.value = "success";
  } catch (requestError) {
    actionMessage.value =
      requestError?.data?.message || cart.error || "Unable to add this artwork to your cart.";
    actionStatus.value = "error";
  } finally {
    setCartLoading(artwork.id, false);
  }
}

async function goToPage(page) {
  const nextPage = Math.min(Math.max(Math.trunc(page), 1), totalPages.value);

  if (nextPage === currentPage.value) {
    return;
  }

  const query = { ...route.query };

  if (nextPage === 1) {
    delete query.page;
  } else {
    query.page = String(nextPage);
  }

  await router.push({ path: route.path, query });

  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function resetFilters() {
  searchTerm.value = "";
  selectedCategories.value = [];
  selectedFileTypes.value = [];
  minimumPrice.value = "";
  maximumPrice.value = "";
  artistStatus.value = "all";
  sortBy.value = "latest";
  showFilters.value = false;
}
</script>

<style scoped lang="scss">
.marketplace-page {
  min-height: 100vh;
  overflow-x: clip;
  background: radial-gradient(circle at top, rgba(123, 44, 255, 0.12), transparent 24%), #000;
  color: #e6edf7;
}

.marketplace-page__shell {
  width: min(100%, 1440px);
  margin: 0 auto;
  padding: 54px 14px 74px;
}

.marketplace-page__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px 18px;
}

.marketplace-page__eyebrow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(230, 237, 247, 0.72);
}

.marketplace-page__filters-toggle {
  display: none;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(18, 20, 20, 0.6);
  padding: 0 18px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #e6edf7;
}

.marketplace-layout {
  display: grid;
  grid-template-columns: 262px minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}

.marketplace-filters {
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-height: 1130px;
  padding: 36px 18px 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(18, 20, 20, 0.56);
  backdrop-filter: blur(10px);
}

.marketplace-filters__section {
  display: grid;
  gap: 14px;
}

.marketplace-filters__section-title {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #ccc3d9;
  opacity: 0.72;
}

.marketplace-filters__label {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 16px;
  font-weight: 400;
  color: #e2e2e2;
}

.marketplace-filters__checkbox {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.marketplace-filters__checkbox input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.marketplace-filters__checkbox-mark {
  position: relative;
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  background: transparent;
}

.marketplace-filters__checkbox input:checked + .marketplace-filters__checkbox-mark {
  border-color: #7b2cff;
  background: #7b2cff;
}

.marketplace-filters__checkbox input:checked + .marketplace-filters__checkbox-mark::after {
  content: "";
  position: absolute;
  inset: 3px 4px 4px 3px;
  border-right: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(45deg);
}

.marketplace-filters__checkbox-label {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 14px;
  color: #ccc3d9;
}

.marketplace-filters__range {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  color: #ccc3d9;
}

.marketplace-filters__input,
.marketplace-filters__select {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(12, 15, 15, 0.3);
  padding: 0 12px;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 14px;
  color: #e6edf7;
  outline: none;
}

.marketplace-filters__input::placeholder {
  color: #6b7280;
}

.marketplace-filters__input:focus,
.marketplace-filters__select:focus {
  border-color: rgba(123, 44, 255, 0.65);
}

.marketplace-filters__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.marketplace-filters__pill {
  min-height: 30px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(30, 32, 32, 0.5);
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #ccc3d9;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.marketplace-filters__pill--active {
  border-color: rgba(209, 188, 255, 0.3);
  background: rgba(123, 44, 255, 0.22);
  color: #f1e9ff;
}

.marketplace-filters__reset {
  min-height: 54px;
  margin-top: auto;
  border-radius: 4px;
  background: linear-gradient(90deg, #7b2cff 0%, #9747ff 100%);
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #f3ebff;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.marketplace-filters__reset:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.marketplace-content,
.marketplace-loading {
  display: grid;
  gap: 24px;
  min-width: 0;
}

.marketplace-feedback {
  border: 1px solid rgba(123, 44, 255, 0.35);
  padding: 14px 16px;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 15px;
}

.marketplace-feedback--success {
  background: rgba(40, 22, 68, 0.32);
  color: #e9deff;
}

.marketplace-feedback--error {
  border-color: rgba(184, 42, 42, 0.5);
  background: rgba(64, 10, 10, 0.32);
  color: #fecaca;
}

.marketplace-showcase {
  display: grid;
  grid-template-columns: minmax(0, 1.58fr) minmax(0, 1fr);
  gap: 22px;
}

.marketplace-showcase--solo {
  grid-template-columns: minmax(0, 1fr);
}

.marketplace-spotlight,
.marketplace-gallery {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
  min-width: 0;
}

.marketplace-gallery {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: -4px;
}

.marketplace-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(18, 20, 20, 0.55);
  overflow: hidden;
}

.marketplace-card--featured {
  min-height: 100%;
}

.marketplace-card--placeholder {
  min-height: 260px;
  background:
    linear-gradient(135deg, rgba(123, 44, 255, 0.12), transparent), rgba(18, 20, 20, 0.55);
}

.marketplace-card--featured.marketplace-card--placeholder {
  min-height: 640px;
}

.marketplace-card__featured-image-shell,
.marketplace-card__image-link {
  display: block;
  background: #090d17;
}

.marketplace-card__featured-image,
.marketplace-card__featured-fallback {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 0.98;
}

.marketplace-card__featured-image {
  object-fit: cover;
}

.marketplace-card__featured-fallback {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top, rgba(123, 44, 255, 0.22), transparent 46%),
    linear-gradient(180deg, #12161f 0%, #05070d 100%);
  font-size: 72px;
  font-weight: 700;
  color: #e6edf7;
}

.marketplace-card__featured-body {
  display: grid;
  gap: 22px;
  padding: 22px 22px 24px;
  background: rgba(15, 18, 16, 0.92);
}

.marketplace-card__featured-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.marketplace-card__featured-title {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 23px;
  font-weight: 500;
  color: #e6edf7;
}

.marketplace-card__featured-artist {
  margin-top: 6px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(230, 237, 247, 0.58);
}

.marketplace-card__featured-price {
  white-space: nowrap;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: rgba(230, 237, 247, 0.82);
}

.marketplace-card__featured-button {
  min-height: 60px;
  border-radius: 2px;
  background: #fff;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7b2cff;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.marketplace-card__featured-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.marketplace-card__featured-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.marketplace-card__image-wrap {
  position: relative;
}

.marketplace-card__image {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1.06;
  object-fit: cover;
}

.marketplace-card__image--fallback {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top, rgba(123, 44, 255, 0.22), transparent 46%),
    linear-gradient(180deg, #12161f 0%, #05070d 100%);
  font-size: 42px;
  font-weight: 700;
  color: #e6edf7;
}

.marketplace-card__favorite {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: inline-flex;
  height: 34px;
  width: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  color: rgba(230, 237, 247, 0.82);
  backdrop-filter: blur(8px);
}

.marketplace-card__favorite-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.marketplace-card__favorite--active {
  color: #d1bcff;
}

.marketplace-card__favorite:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.marketplace-card__body {
  display: flex;
  min-height: 112px;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 14px 16px;
}

.marketplace-card__title {
  display: inline-block;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: #d9dde5;
}

.marketplace-card__price {
  margin-top: 8px;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 14px;
  color: rgba(230, 237, 247, 0.78);
}

.marketplace-card__meta {
  display: flex;
  justify-content: flex-end;
}

.marketplace-card__tag {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 11px;
  color: rgba(230, 237, 247, 0.56);
}

.marketplace-footerbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-top: 10px;
}

.marketplace-footerbar__title {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: clamp(2.65rem, 4.4vw, 4rem);
  font-weight: 700;
  line-height: 0.98;
  color: #fff;
}

.marketplace-footerbar__copy {
  margin-top: 10px;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 16px;
  color: rgba(230, 237, 247, 0.72);
}

.marketplace-footerbar__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.marketplace-footerbar__sort {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: rgba(18, 20, 20, 0.6);
  padding: 0 14px;
}

.marketplace-footerbar__sort select {
  min-width: 154px;
  background: transparent;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e2e2e2;
  outline: none;
}

.marketplace-footerbar__sort-icon {
  font-size: 13px;
  color: #ccc3d9;
}

.marketplace-footerbar__view {
  display: inline-grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  width: 44px;
  height: 44px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: rgba(18, 20, 20, 0.6);
}

.marketplace-footerbar__view span {
  border: 1px solid rgba(230, 237, 247, 0.72);
}

.marketplace-footerbar__view--active {
  border-color: rgba(209, 188, 255, 0.3);
}

.marketplace-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding-top: 6px;
}

.marketplace-pagination__arrow,
.marketplace-pagination__page {
  display: inline-flex;
  min-width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 16px;
  color: #ccc3d9;
}

.marketplace-pagination__arrow {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(18, 20, 20, 0.6);
}

.marketplace-pagination__page {
  padding: 0 12px;
}

.marketplace-pagination__page--active {
  border: 1px solid rgba(209, 188, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
  color: #d1bcff;
}

.marketplace-pagination__arrow:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.marketplace-pagination__ellipsis {
  color: #ccc3d9;
}

.marketplace-empty-state {
  display: grid;
  justify-items: center;
  gap: 12px;
  min-height: 420px;
  align-content: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(18, 20, 20, 0.45);
  padding: 32px;
  text-align: center;
}

.marketplace-empty-state__title {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.marketplace-empty-state__copy {
  max-width: 540px;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: rgba(230, 237, 247, 0.72);
}

.marketplace-empty-state__action {
  min-height: 44px;
  margin-top: 6px;
  padding: 0 18px;
  border: 1px solid rgba(123, 44, 255, 0.45);
  background: rgba(123, 44, 255, 0.14);
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f3ebff;
}

@media (max-width: 1180px) {
  .marketplace-showcase {
    grid-template-columns: minmax(0, 1fr);
  }

  .marketplace-gallery {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .marketplace-page__filters-toggle {
    display: inline-flex;
  }

  .marketplace-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .marketplace-filters {
    display: none;
    min-height: auto;
    position: static;
  }

  .marketplace-filters--open {
    display: flex;
  }

  .marketplace-footerbar {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .marketplace-page__shell {
    padding: 32px 0 56px;
  }

  .marketplace-page__topbar {
    padding-inline: 12px;
  }

  .marketplace-showcase,
  .marketplace-spotlight,
  .marketplace-gallery {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .marketplace-card__featured-heading {
    flex-direction: column;
    align-items: flex-start;
  }

  .marketplace-card__featured-image,
  .marketplace-card__featured-fallback {
    aspect-ratio: 1 / 1.08;
  }

  .marketplace-pagination {
    flex-wrap: wrap;
  }
}
</style>
