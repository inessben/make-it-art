<template>
  <article
    class="group grid min-w-0 gap-5 rounded-[24px] border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] transition duration-200 hover:-translate-y-1 hover:border-slate-750 sm:rounded-[28px] sm:p-5"
  >
    <div class="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
      <div
        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-lg font-semibold text-violet-200 ring-1 ring-violet-700/30"
      >
        {{ initials }}
      </div>

      <button
        v-if="showFavoriteAction"
        type="button"
        class="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        :class="
          artwork.isFavorite
            ? 'border-amber-300 bg-amber-300/10 text-amber-200'
            : 'border-slate-750 bg-slate-850 text-slate-100 hover:border-violet-700'
        "
        :disabled="favoriteLoading"
        @click="$emit('toggle-favorite', artwork)"
      >
        {{
          favoriteLoading
            ? "..."
            : artwork.isFavorite
              ? "Favorited"
              : "Favorite"
        }}
      </button>
    </div>

    <div class="grid gap-3">
      <div
        class="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest"
      >
        <span class="rounded-full bg-violet-700/10 px-3 py-1 text-violet-200">
          {{ artwork.category?.name || "Digital artwork" }}
        </span>
        <span class="rounded-full bg-slate-850 px-3 py-1 text-slate-500">
          {{ formattedDate }}
        </span>
      </div>

      <div>
        <NuxtLink
          :to="`/artworks/${artwork.id}`"
          class="text-xl font-semibold text-white transition hover:text-violet-200"
        >
          {{ artwork.title }}
        </NuxtLink>
        <p class="mt-3 line-clamp-3 text-sm leading-7 text-slate-400">
          {{ artwork.description || "No description yet." }}
        </p>
      </div>
    </div>

    <div
      class="mt-auto flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div class="grid gap-1">
        <p class="text-xs uppercase tracking-widest text-slate-500">Artist</p>
        <NuxtLink
          v-if="artwork.artist"
          :to="`/artists/${artwork.artist.id}`"
          class="text-sm font-semibold text-slate-100 transition hover:text-violet-200"
        >
          {{ artwork.artist.displayName }}
        </NuxtLink>
        <span v-else class="text-sm font-semibold text-slate-100"
          >Unknown artist</span
        >
      </div>

      <div class="text-left sm:text-right">
        <p class="text-xs uppercase tracking-widest text-slate-500">Price</p>
        <p class="mt-1 text-lg font-semibold text-slate-100">
          {{ formattedPrice }}
        </p>
        <p class="mt-1 text-xs text-slate-500">
          {{ artwork.favoriteCount || 0 }} favorites
        </p>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from "vue";
import {
  formatMarketplaceDate,
  formatMarketplacePrice,
  getArtistInitials,
} from "~/utils/marketplace";

const props = defineProps({
  artwork: {
    type: Object,
    required: true,
  },
  favoriteLoading: {
    type: Boolean,
    default: false,
  },
  showFavoriteAction: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["toggle-favorite"]);

const formattedPrice = computed(() => {
  return formatMarketplacePrice(
    props.artwork.priceValue ?? props.artwork.price,
  );
});

const formattedDate = computed(() =>
  formatMarketplaceDate(props.artwork.createdAt),
);
const initials = computed(() =>
  getArtistInitials(props.artwork.artist?.displayName || props.artwork.title),
);
</script>
