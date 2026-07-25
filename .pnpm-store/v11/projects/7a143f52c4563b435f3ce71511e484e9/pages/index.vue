<template>
  <main class="min-h-screen overflow-hidden bg-[#02040A] text-[#E6EDF7]">
    <section
      class="relative isolate overflow-hidden border-b border-[#121826] bg-[radial-gradient(circle_at_top_left,_rgba(74,108,247,0.22),_transparent_34%),radial-gradient(circle_at_85%_15%,_rgba(242,201,125,0.12),_transparent_22%),linear-gradient(180deg,_#050812,_#02040A)]"
    >
      <div
        class="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.02)_100%)]"
      />
      <div
        class="relative z-10 mx-auto grid w-full max-w-[1240px] gap-10 px-6 pb-16 pt-16 lg:grid-cols-[1.2fr_0.9fr]"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.22em] text-[#8AA2FF]">Make It Art</p>
          <h1
            class="mt-6 max-w-3xl text-[clamp(2.7rem,7vw,5.8rem)] font-semibold leading-[0.94] text-white"
          >
            Discover digital artists with a futuristic gallery vibe.
          </h1>
          <p class="mt-6 max-w-2xl text-base leading-8 text-[#A7B4C9]">
            Explore artworks, follow the artists that inspire you, and organize your favorites in
            personal collections ready for the next e-commerce phase.
          </p>

          <div class="mt-10 flex flex-wrap gap-4">
            <NuxtLink
              to="/artworks"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-7 text-sm font-semibold text-black transition hover:bg-[#6D8BFF]"
            >
              Browse artworks
            </NuxtLink>
            <NuxtLink
              to="/artists"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] bg-[#0C111D] px-7 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#141C2E]"
            >
              Meet artists
            </NuxtLink>
            <NuxtLink
              v-if="auth.isVerifiedArtist"
              to="/artworks/new"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#F2C97D] bg-[#F2C97D]/10 px-7 text-sm font-semibold text-[#F7D990] transition hover:bg-[#F2C97D]/20"
            >
              Publish an artwork
            </NuxtLink>
            <NuxtLink
              v-if="showCollectorShortcut"
              to="/wishlist"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] bg-transparent px-7 text-sm font-semibold text-[#C9D6FF] transition hover:border-[#4A6CF7]"
            >
              Wishlist
            </NuxtLink>
          </div>

          <div
            v-if="actionMessage"
            class="mt-8 inline-flex rounded-2xl border border-[#203357] bg-[#091121] px-5 py-3 text-sm text-[#BFD0FF]"
          >
            {{ actionMessage }}
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <article class="rounded-[28px] border border-[#151E30] bg-[#070B14]/92 p-6 backdrop-blur">
            <p class="text-xs uppercase tracking-[0.18em] text-[#6F84AA]">Featured artworks</p>
            <p class="mt-4 text-4xl font-semibold text-white">
              {{ overview.stats.artworks }}
            </p>
            <p class="mt-3 text-sm leading-7 text-[#96A4B8]">
              A public catalogue designed for discovery, favorites, and navigation to each artist.
            </p>
          </article>
          <article class="rounded-[28px] border border-[#151E30] bg-[#070B14]/92 p-6 backdrop-blur">
            <p class="text-xs uppercase tracking-[0.18em] text-[#6F84AA]">Verified artists</p>
            <p class="mt-4 text-4xl font-semibold text-white">
              {{ overview.stats.artists }}
            </p>
            <p class="mt-3 text-sm leading-7 text-[#96A4B8]">
              Richer public profiles with styles, portfolios, and follow actions.
            </p>
          </article>
          <article
            class="rounded-[28px] border border-[#1B2640] bg-[linear-gradient(135deg,_rgba(74,108,247,0.22),_rgba(6,8,14,0.95)_56%)] p-6 sm:col-span-2"
          >
            <p class="text-xs uppercase tracking-[0.18em] text-[#D7E2FF]">Collector journey</p>
            <div class="mt-5 grid gap-3 text-sm text-[#DCE7FF] sm:grid-cols-3">
              <div class="rounded-2xl bg-[#050812]/55 px-4 py-4">1. Discover artworks</div>
              <div class="rounded-2xl bg-[#050812]/55 px-4 py-4">2. Explore artist profiles</div>
              <div class="rounded-2xl bg-[#050812]/55 px-4 py-4">
                3. Save favorites and collections
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto grid w-full max-w-[1240px] gap-14 px-6 py-16">
      <section
        v-if="categories.length"
        class="grid gap-5 rounded-[28px] border border-[#151E30] bg-[#070B14] p-6"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">Categories</p>
          <h2 class="mt-3 text-2xl font-semibold text-white">Explore by creative universe</h2>
          <p class="mt-3 max-w-2xl text-sm leading-7 text-[#96A4B8]">
            Filter the catalogue by category to find the kind of artwork that inspires you.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <NuxtLink
            v-for="category in categories"
            :key="category.id"
            :to="`/artworks?category=${category.id}`"
            class="inline-flex min-h-10 items-center justify-center rounded-full border border-[#24314F] bg-[#0C111D] px-4 text-sm font-semibold text-[#C9D6FF] transition hover:border-[#4A6CF7] hover:bg-[#141C2E]"
          >
            {{ category.name }}
          </NuxtLink>
        </div>
      </section>

      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">Current selection</p>
          <h2 class="mt-3 text-[clamp(2rem,4vw,3rem)] font-semibold text-white">
            Artworks worth saving
          </h2>
          <p class="mt-4 max-w-2xl text-sm leading-7 text-[#96A4B8]">
            Detailed artwork pages linked to public artist profiles for smoother discovery.
          </p>
        </div>
        <NuxtLink
          to="/artworks"
          class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] bg-[#0C111D] px-6 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#141C2E]"
        >
          View full catalogue
        </NuxtLink>
      </div>

      <section
        v-if="pending"
        class="rounded-[28px] border border-[#151E30] bg-[#080C16] p-8 text-[#96A4B8]"
      >
        Loading the marketplace...
      </section>
      <section
        v-else-if="errorMessage"
        class="rounded-[28px] border border-[#6C1F2D] bg-[#261018] p-8 text-[#FBC8D0]"
      >
        {{ errorMessage }}
      </section>
      <section v-else class="grid gap-6 lg:grid-cols-3">
        <ArtworkCard
          v-for="artwork in overview.artworks"
          :key="artwork.id"
          :artwork="artwork"
          :favorite-loading="Boolean(favoriteLoading[artwork.id])"
          :show-favorite-action="true"
          @toggle-favorite="toggleFavorite"
        />
      </section>

      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">Featured artists</p>
          <h2 class="mt-3 text-[clamp(2rem,4vw,3rem)] font-semibold text-white">
            Explore the worlds behind the artworks
          </h2>
          <p class="mt-4 max-w-2xl text-sm leading-7 text-[#96A4B8]">
            A real entry point for artist discovery, with follow actions and public portfolios.
          </p>
        </div>
        <NuxtLink
          to="/artists"
          class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] bg-[#0C111D] px-6 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#141C2E]"
        >
          Browse artists
        </NuxtLink>
      </div>

      <section v-if="!pending && !errorMessage" class="grid gap-6 lg:grid-cols-2">
        <ArtistCard
          v-for="artist in overview.artists"
          :key="artist.id"
          :artist="artist"
          :follow-loading="Boolean(followLoading[artist.id])"
          :show-follow-action="canFollowArtist(artist)"
          @toggle-follow="toggleFollow"
        />
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRequestHeaders } from "#app";
import { storeToRefs } from "pinia";
import { useAuthStore } from "~/stores/auth";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";
import ArtworkCard from "~/components/marketplace/ArtworkCard.vue";
import ArtistCard from "~/components/marketplace/ArtistCard.vue";

const auth = useAuthStore();
const { user } = storeToRefs(auth);
const categories = ref([]);
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;

const {
  data,
  pending,
  error,
  refresh: refreshOverview
} = await useFetch("/api/marketplace/overview", {
  headers: requestHeaders,
  credentials: "include",
  default: () => ({
    stats: {
      artworks: 0,
      artists: 0
    },
    artworks: [],
    artists: []
  })
});

const overview = computed(() => {
  return (
    data.value || {
      stats: {
        artworks: 0,
        artists: 0
      },
      artworks: [],
      artists: []
    }
  );
});

const errorMessage = computed(() => error.value?.data?.message || "");
const showCollectorShortcut = computed(() => user.value && !auth.isAdmin);

const { actionMessage, favoriteLoading, followLoading, canFollowArtist, toggleFavorite, toggleFollow } =
  useMarketplaceActions(auth);

onMounted(async () => {
  try {
    const response = await $fetch("/api/categories", {
      credentials: "include"
    });

    categories.value = response.categories || [];
  } catch {
    categories.value = [];
  }

  if (!auth.user) {
    try {
      await auth.fetchCurrentUser();
      await refreshOverview();
    } catch {
      // Public page: anonymous visitors are allowed.
    }
  }
});
</script>
