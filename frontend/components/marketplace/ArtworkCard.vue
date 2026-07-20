<template>
  <article
    class="group grid gap-5 rounded-[28px] border border-[#1A1F2A] bg-[radial-gradient(circle_at_top_left,_rgba(74,108,247,0.18),_transparent_38%),linear-gradient(180deg,_#0B1020,_#04070E)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] transition duration-200 hover:-translate-y-1 hover:border-[#34405B]"
  >
    <NuxtLink
      :to="`/artworks/${artwork.id}`"
      class="block overflow-hidden rounded-[20px] border border-[#1A2336] bg-[#050912]"
    >
      <img
        v-if="artwork.imageUrl"
        :src="artwork.imageUrl"
        :alt="artwork.title"
        class="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
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
        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#131B33] text-lg font-semibold text-[#D5E0FF] ring-1 ring-[#4A6CF7]/30"
      >
        {{ initials }}
      </div>

      <button
        v-if="showFavoriteAction"
        type="button"
        class="inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition"
        :class="
          artwork.isFavorite
            ? 'border-[#F2C97D] bg-[#F2C97D]/10 text-[#F7D990]'
            : 'border-[#1F2A44] bg-[#0D1220] text-[#D3DCEE] hover:border-[#4A6CF7]'
        "
        :disabled="favoriteLoading"
        @click="$emit('toggle-favorite', artwork)"
      >
        {{
          favoriteLoading ? "..." : artwork.isFavorite ? "En favori" : "Favori"
        }}
      </button>
    </div>

    <div class="grid gap-3">
      <div
        class="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em]"
      >
        <span class="rounded-full bg-[#4A6CF7]/12 px-3 py-1 text-[#BFD0FF]">
          {{ artwork.category?.name || "Oeuvre numerique" }}
        </span>
        <span class="rounded-full bg-[#101728] px-3 py-1 text-[#8D9BB2]">
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
          class="text-xl font-semibold text-white transition hover:text-[#C9D6FF]"
        >
          {{ artwork.title }}
        </NuxtLink>
        <p class="mt-3 line-clamp-3 text-sm leading-7 text-[#A4B0C0]">
          {{ artwork.description || "Aucune description pour le moment." }}
        </p>
      </div>
    </div>

    <div class="mt-auto flex items-end justify-between gap-4">
      <div class="grid gap-1">
        <p class="text-xs uppercase tracking-[0.16em] text-[#6E7C93]">
          Artiste
        </p>
        <NuxtLink
          v-if="artwork.artist"
          :to="`/artists/${artwork.artist.id}`"
          class="text-sm font-semibold text-[#E6EDF7] transition hover:text-[#C9D6FF]"
        >
          {{ artwork.artist.displayName }}
        </NuxtLink>
        <span v-else class="text-sm font-semibold text-[#E6EDF7]"
          >Artiste inconnu</span
        >
      </div>

      <div class="text-right">
        <p class="text-xs uppercase tracking-[0.16em] text-[#6E7C93]">Prix</p>
        <p class="mt-1 text-lg font-semibold text-[#F4F7FF]">
          {{ formattedPrice }}
        </p>
        <p class="mt-1 text-xs text-[#8D9BB2]">
          {{ artwork.favoriteCount || 0 }} favoris
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
