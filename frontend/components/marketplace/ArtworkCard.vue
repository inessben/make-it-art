<template>
  <article
    class="group grid min-w-0 gap-5 rounded-[24px] border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] transition duration-200 hover:-translate-y-1 hover:border-slate-750 sm:rounded-[28px] sm:p-5"
  >
<NuxtLink
  :to="`/artworks/${artwork.id}`"
  class="block overflow-hidden rounded-[20px] border border-[#1A2336] bg-[#050912]"
>
  <img
    v-if="artwork.imageUrl"
    :src="artwork.imageUrl"
    :alt="artwork.title"
    class="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.02] select-none"
    draggable="false"
    @dragstart.prevent
    @contextmenu.prevent
  />
  <div
    v-else
    class="flex aspect-[4/5] items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(74,108,247,0.18),_transparent_50%),linear-gradient(135deg,_#0F1628,_#05070D)]"
  >
    <span class="text-3xl font-semibold text-[#D5E0FF]">{{ initials }}</span>
  </div>
</NuxtLink>

<div class="flex items-start justify-between gap-4">
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
        {{ favoriteLoading ? "..." : artwork.isFavorite ? "Favorited" : "Favorite" }}
      </button>
    </div>

    <div class="grid gap-3">
      <div class="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest">
        <span class="rounded-full bg-violet-700/10 px-3 py-1 text-violet-200">
          {{ artwork.category?.name || "Digital artwork" }}
        </span>
        <span class="rounded-full bg-slate-850 px-3 py-1 text-slate-500">
          {{ formattedDate }}
        </span>
        <span
          v-if="artwork.isSold"
          class="rounded-full bg-[#3A1A1A] px-3 py-1 text-[#F5A8A8]"
        >
          Plus disponible
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

    <div class="mt-auto flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="grid gap-1">
        <p class="text-xs uppercase tracking-widest text-slate-500">Artist</p>
        <NuxtLink
          v-if="artwork.artist"
          :to="`/artists/${artwork.artist.id}`"
          class="text-sm font-semibold text-slate-100 transition hover:text-violet-200"
        >
          {{ artwork.artist.displayName }}
        </NuxtLink>
        <span v-else class="text-sm font-semibold text-slate-100">Unknown artist</span>
      </div>

      <div class="text-left sm:text-right">
        <p class="text-xs uppercase tracking-widest text-slate-500">Price</p>
        <p class="mt-1 text-lg font-semibold text-slate-100">
          {{ formattedPrice }}
        </p>
        <p class="mt-1 text-xs text-slate-500">{{ artwork.favoriteCount || 0 }} favorites</p>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from "vue";
import {
  formatMarketplaceDate,
  formatMarketplacePrice,
  getArtistInitials
} from "~/utils/marketplace";

const props = defineProps({
  artwork: {
    type: Object,
    required: true
  },
  favoriteLoading: {
    type: Boolean,
    default: false
  },
  showFavoriteAction: {
    type: Boolean,
    default: false
  }
});

defineEmits(["toggle-favorite"]);

const formattedPrice = computed(() => {
  return formatMarketplacePrice(props.artwork.priceValue ?? props.artwork.price);
});

const formattedDate = computed(() => formatMarketplaceDate(props.artwork.createdAt));
const initials = computed(() =>
  getArtistInitials(props.artwork.artist?.displayName || props.artwork.title)
);
</script>
