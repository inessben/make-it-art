<template>
  <main class="min-h-screen bg-black text-slate-100">
    <div
      class="mx-auto grid w-full max-w-[1440px] gap-8 px-5 py-8 lg:grid-cols-[258px_minmax(0,1fr)] lg:py-0"
    >
      <AccountSettingsSidebar compact />

      <section class="min-w-0 px-0 pb-20 pt-7 lg:px-0 lg:pt-8">
        <header class="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 class="text-title-2 text-slate-100">Your Wishlist</h1>
            <p class="mt-3 max-w-[510px] text-body-1 leading-6 text-slate-400">
              Manage your saved digital masterpieces and unique artistic tokens for your private
              collection.
            </p>
          </div>

          <div class="flex gap-4 xl:pt-4">
            <div class="min-w-[120px] rounded border border-slate-800 bg-slate-950/70 px-6 py-5">
              <p class="text-subtitle-2 uppercase text-slate-500">Items</p>
              <p class="mt-1 text-title-3 text-slate-400">{{ artworks.length }}</p>
            </div>
            <div class="min-w-[145px] rounded border border-slate-800 bg-slate-950/70 px-6 py-5">
              <p class="text-subtitle-2 uppercase text-slate-500">Total value</p>
              <p class="mt-1 text-title-3 text-slate-400">{{ formattedTotalValue }}</p>
            </div>
          </div>
        </header>

        <div class="mt-16 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div class="flex flex-wrap gap-4">
            <button
              type="button"
              class="min-h-9 rounded-xl border px-6 text-subtitle-2 transition-colors"
              :class="
                selectedCategory === 'all'
                  ? 'border-violet-400 text-slate-100'
                  : 'border-slate-800 text-slate-100 hover:border-slate-500'
              "
              @click="selectedCategory = 'all'"
            >
              All Artworks
            </button>
            <button
              v-for="category in categories"
              :key="category"
              type="button"
              class="min-h-9 rounded-xl border px-6 text-subtitle-2 text-slate-100 transition-colors"
              :class="
                selectedCategory === category
                  ? 'border-violet-400'
                  : 'border-slate-800 hover:border-slate-500'
              "
              @click="selectedCategory = category"
            >
              {{ category }}
            </button>
          </div>

          <label class="flex items-center gap-3 text-subtitle-2 text-slate-500">
            <span>Sort by:</span>
            <select v-model="sortBy" class="bg-black font-semibold text-slate-100 outline-none">
              <option value="recent">Recently Added</option>
              <option value="price-desc">Highest Price</option>
              <option value="price-asc">Lowest Price</option>
            </select>
          </label>
        </div>

        <div
          v-if="actionMessage"
          class="mt-6 border border-slate-800 bg-slate-950 px-5 py-3 text-footer text-violet-200"
        >
          {{ actionMessage }}
        </div>

        <AppStatePanel
          v-if="pending"
          class="mt-16"
          type="loading"
          message="Loading your favorites..."
        />
        <AppStatePanel
          v-else-if="errorMessage"
          class="mt-16"
          type="error"
          title="Unable to load your wishlist"
          :message="errorMessage"
          action-label="Try again"
          @action="refresh"
        />
        <AppStatePanel
          v-else-if="!artworks.length"
          class="mt-16"
          title="Your wishlist is empty"
          message="Explore the marketplace to start saving digital artworks."
        />

        <section v-else class="mt-16 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="artwork in visibleArtworks"
            :key="artwork.id"
            class="overflow-hidden rounded border border-slate-800 bg-slate-950/75"
          >
            <div class="relative aspect-square border-b border-slate-800 bg-black">
              <button
                type="button"
                class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-750 bg-slate-950 text-title-3 text-violet-600 transition-colors hover:border-violet-600"
                :disabled="favoriteLoading[artwork.id]"
                aria-label="Remove from favorites"
                @click="handleFavoriteToggle(artwork)"
              >
                {{ favoriteLoading[artwork.id] ? "…" : "♥" }}
              </button>
            </div>

            <div class="px-4 py-4">
              <div class="flex items-start justify-between gap-4">
                <NuxtLink
                  :to="`/artworks/${artwork.id}`"
                  class="truncate text-body-1 text-slate-100 transition-colors hover:text-violet-400"
                  >{{ artwork.title }}</NuxtLink
                >
                <span class="shrink-0 text-subtitle-2 text-slate-400">{{
                  formatMarketplacePrice(artwork.priceValue ?? artwork.price)
                }}</span>
              </div>
              <NuxtLink
                v-if="artwork.artist"
                :to="`/artists/${artwork.artist.id}`"
                class="mt-3 flex items-center gap-2 text-subtitle-3 uppercase text-slate-500 transition-colors hover:text-violet-400"
              >
                <span
                  class="flex h-5 w-5 items-center justify-center rounded-full border border-slate-750 text-subtitle-3 text-slate-100"
                  >{{ getArtistInitials(artwork.artist.displayName) }}</span
                >
                <span>By {{ artwork.artist.displayName }}</span>
              </NuxtLink>
            </div>
          </article>

          <NuxtLink
            to="/artworks"
            class="flex min-h-[370px] flex-col items-center justify-center border border-dashed border-slate-800 text-slate-500 transition-colors hover:border-violet-700 hover:text-violet-400"
          >
            <span
              class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-current text-title-3"
              >+</span
            >
            <span class="mt-5 text-subtitle-2 uppercase tracking-[0.12em]">Discover more</span>
          </NuxtLink>
        </section>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import AccountSettingsSidebar from "~/components/account/AccountSettingsSidebar.vue";
import { useAuthStore } from "~/stores/auth";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";
import { formatMarketplacePrice, getArtistInitials } from "~/utils/marketplace";

const auth = useAuthStore();
const selectedCategory = ref("all");
const sortBy = ref("recent");

const { data, pending, error, refresh } = await useFetch("/api/favorites/me", {
  credentials: "include",
  default: () => ({ artworks: [] })
});

const artworks = computed(() => data.value?.artworks || []);
const categories = computed(() => [
  ...new Set(artworks.value.map((artwork) => artwork.category?.name).filter(Boolean))
]);
const visibleArtworks = computed(() => {
  const filtered =
    selectedCategory.value === "all"
      ? [...artworks.value]
      : artworks.value.filter((artwork) => artwork.category?.name === selectedCategory.value);

  return filtered.sort((left, right) => {
    if (sortBy.value === "price-desc")
      return Number(right.priceValue || 0) - Number(left.priceValue || 0);
    if (sortBy.value === "price-asc")
      return Number(left.priceValue || 0) - Number(right.priceValue || 0);
    return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
  });
});
const totalValue = computed(() =>
  artworks.value.reduce((total, artwork) => total + (Number(artwork.priceValue) || 0), 0)
);
const formattedTotalValue = computed(() => formatMarketplacePrice(totalValue.value));
const errorMessage = computed(() => error.value?.data?.message || "");

const { actionMessage, favoriteLoading, toggleFavorite } = useMarketplaceActions(auth);

async function handleFavoriteToggle(artwork) {
  const success = await toggleFavorite(artwork);
  if (success && !artwork.isFavorite) {
    data.value = { artworks: artworks.value.filter((item) => item.id !== artwork.id) };
  } else if (!success) {
    await refresh();
  }
}
</script>
