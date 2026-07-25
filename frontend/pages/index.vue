<template>
  <main class="overflow-hidden bg-black text-slate-100">
    <section
      class="flex min-h-[790px] items-start justify-center px-6 pt-[112px] text-center lg:min-h-[840px] lg:pt-[140px]"
    >
      <div class="flex flex-col items-center">
        <h1 class="flex flex-col items-center uppercase">
          <span
            class="text-title-2 font-light leading-[0.95] text-slate-100 sm:text-title-1 lg:text-big-title-4"
            >Welcome to</span
          >
          <span
            class="text-title-1 font-black leading-[0.9] text-violet-600 sm:text-big-title-4 lg:text-big-title-3"
            >Make It Art</span
          >
        </h1>
        <p class="mt-7 text-title-4 uppercase tracking-[0.28em] text-slate-500">
          Digital arts curations &amp; artists marketplace
        </p>
        <div class="mt-14 flex flex-wrap justify-center gap-6">
          <NuxtLink
            to="/artworks"
            class="inline-flex h-16 min-w-[238px] items-center justify-center bg-violet-600 px-8 text-subtitle-2 font-bold uppercase tracking-[0.22em] text-black transition-colors hover:bg-violet-400"
          >
            Start exploring
          </NuxtLink>
          <NuxtLink
            to="/artists"
            class="inline-flex h-16 min-w-[238px] items-center justify-center border border-slate-800 bg-black px-8 text-subtitle-2 font-bold uppercase tracking-[0.22em] text-slate-100 transition-colors hover:border-violet-600"
          >
            View galleries
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-[1392px] px-6 pb-28">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="text-title-2 uppercase text-slate-100">Browse by categories</h2>
          <p class="mt-2 max-w-2xl text-body-1 text-slate-400">
            Discover art across diverse digital disciplines.
          </p>
        </div>
        <NuxtLink
          to="/artworks"
          class="inline-flex items-center gap-3 text-footer text-slate-400 underline underline-offset-4 transition-colors hover:text-violet-400"
        >
          all categories <span aria-hidden="true">-></span>
        </NuxtLink>
      </div>

      <div
        v-if="categoriesPending"
        class="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-5"
        aria-label="Category placeholders"
      >
        <div class="min-h-[322px] border border-slate-900 bg-slate-950 lg:col-span-2" />
        <div class="min-h-[322px] border border-slate-900 bg-slate-950 lg:col-span-3" />
        <div class="min-h-[322px] border border-slate-900 bg-slate-950 lg:col-span-5" />
      </div>

      <div
        v-else-if="featuredCategories.length"
        class="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-5"
        aria-label="Featured categories"
      >
        <NuxtLink
          v-for="(category, index) in featuredCategories"
          :key="category.id"
          :to="buildCategoryRoute(category)"
          class="group flex min-h-[322px] flex-col justify-between overflow-hidden border border-slate-800 bg-slate-950 p-6 transition duration-200 hover:-translate-y-1 hover:border-slate-700"
          :class="categoryCardClass(index, featuredCategories.length)"
        >
          <div class="flex items-start justify-between gap-4">
            <span
              class="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-violet-700/40 bg-violet-700/10 px-3 text-sm font-semibold text-violet-200"
            >
              {{ String(index + 1).padStart(2, "0") }}
            </span>
            <span
              class="text-xs uppercase tracking-[0.18em] text-slate-500 transition group-hover:text-violet-300"
            >
              Explore
            </span>
          </div>

          <div class="mt-10">
            <p class="text-title-3 uppercase text-slate-100 sm:text-title-2">
              {{ category.name }}
            </p>
            <p class="mt-4 max-w-2xl text-body-1 leading-7 text-slate-400">
              {{ categoryDescription(category.name) }}
            </p>
          </div>

          <div class="mt-10 flex items-center justify-between text-sm text-slate-400">
            <span>Open category</span>
            <span class="transition group-hover:translate-x-1">-></span>
          </div>
        </NuxtLink>
      </div>

      <div
        v-else
        class="mt-14 grid min-h-[322px] place-items-center border border-slate-800 bg-slate-950 px-6 text-center"
      >
        <div>
          <p class="text-title-4 uppercase tracking-[0.12em] text-slate-500">
            Categories coming soon
          </p>
          <p class="mt-3 max-w-xl text-body-1 leading-7 text-slate-400">
            Public categories will appear here once the artwork catalog is ready to browse.
          </p>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-[1440px] pb-28">
      <div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="text-title-2 uppercase text-slate-100">Featured artworks</h2>
          <p class="mt-2 max-w-2xl text-body-1 text-slate-400">
            Hand-picked digital masterpieces from our global roster.
          </p>
        </div>
        <NuxtLink
          to="/artworks"
          class="inline-flex items-center gap-3 text-footer text-slate-400 underline underline-offset-4 transition-colors hover:text-violet-400"
        >
          more artworks <span aria-hidden="true">-></span>
        </NuxtLink>
      </div>

      <div
        v-if="artworksPending"
        class="mt-14 grid grid-cols-1 gap-6 px-6 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Featured artwork placeholders"
      >
        <div
          v-for="placeholder in artworksPerRail"
          :key="placeholder"
          class="min-h-[462px] border border-slate-900 bg-slate-950"
        />
      </div>

      <div v-else-if="featuredArtworks.length" class="relative mt-14 px-6">
        <button
          v-if="hasArtworkCarousel"
          type="button"
          class="absolute -left-2 top-1/2 z-10 hidden h-14 w-10 -translate-y-1/2 items-center justify-center text-title-3 text-slate-100 transition hover:text-violet-300 xl:flex"
          aria-label="Previous artworks"
          @click="scrollFeaturedArtworks(-1)"
        >
          <
        </button>

        <div
          ref="featuredArtworkCarousel"
          class="hide-scrollbar scroll-smooth"
          :class="hasArtworkCarousel ? 'overflow-x-auto' : 'overflow-x-hidden'"
          aria-label="Featured artworks"
        >
          <div class="flex items-stretch gap-6">
            <div
              v-for="artwork in featuredArtworks"
              :key="artwork.id"
              data-carousel-card
              class="w-full shrink-0 sm:w-[calc((100%_-_1.5rem)/2)] xl:w-[calc((100%_-_4.5rem)/4)]"
            >
              <ArtworkCard class="h-full" :artwork="artwork" :show-favorite-action="false" />
            </div>
          </div>
        </div>

        <button
          v-if="hasArtworkCarousel"
          type="button"
          class="absolute -right-2 top-1/2 z-10 hidden h-14 w-10 -translate-y-1/2 items-center justify-center text-title-3 text-slate-100 transition hover:text-violet-300 xl:flex"
          aria-label="Next artworks"
          @click="scrollFeaturedArtworks(1)"
        >
          >
        </button>
      </div>

      <div
        v-else
        class="mt-14 grid min-h-[320px] place-items-center border border-slate-800 bg-slate-950 px-6 text-center"
      >
        <div>
          <p class="text-title-4 uppercase tracking-[0.12em] text-slate-500">
            Artworks coming soon
          </p>
          <p class="mt-3 max-w-xl text-body-1 leading-7 text-slate-400">
            Featured artworks will appear here as soon as verified artists publish their work.
          </p>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-[1440px] px-6 pb-36">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="text-title-2 uppercase text-slate-100">Some artists</h2>
          <p class="mt-2 max-w-2xl text-body-1 text-slate-400">
            Discover art across diverse digital disciplines.
          </p>
        </div>
        <NuxtLink
          to="/artists"
          class="inline-flex items-center gap-3 text-footer text-slate-400 underline underline-offset-4 transition-colors hover:text-violet-400"
        >
          all artists <span aria-hidden="true">-></span>
        </NuxtLink>
      </div>

      <div class="relative mt-14">
        <button
          v-if="hasArtistCarousel"
          type="button"
          class="absolute -left-2 top-1/2 z-10 hidden h-14 w-10 -translate-y-1/2 items-center justify-center text-title-3 text-slate-100 transition hover:text-violet-300 xl:flex"
          aria-label="Previous artists"
          @click="scrollHomeArtists(-1)"
        >
          <
        </button>

        <div
          v-if="artistsPending"
          class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Artist profile placeholders"
        >
          <div
            v-for="placeholder in artistsPerRail"
            :key="placeholder"
            class="min-h-[370px] border border-slate-800 bg-slate-950"
          />
        </div>

        <div
          v-else-if="homeArtists.length"
          ref="homeArtistCarousel"
          class="hide-scrollbar scroll-smooth"
          :class="hasArtistCarousel ? 'overflow-x-auto' : 'overflow-x-hidden'"
          aria-label="Featured artists"
        >
          <div class="flex items-stretch gap-6">
            <div
              v-for="artist in homeArtists"
              :key="artist.id"
              data-carousel-card
              class="w-full shrink-0 sm:w-[calc((100%_-_1.5rem)/2)] xl:w-[calc((100%_-_4.5rem)/4)]"
            >
              <ArtistCard class="h-full" :artist="artist" :show-follow-action="false" />
            </div>
          </div>
        </div>

        <div
          v-else
          class="grid min-h-[370px] place-items-center border border-slate-800 bg-slate-950 px-6 text-center"
        >
          <div>
            <p class="text-title-4 uppercase tracking-[0.12em] text-slate-500">
              Artists coming soon
            </p>
            <p class="mt-3 max-w-xl text-body-1 leading-7 text-slate-400">
              Verified artist profiles will appear here as soon as the public catalog is available.
            </p>
          </div>
        </div>

        <button
          v-if="hasArtistCarousel"
          type="button"
          class="absolute -right-2 top-1/2 z-10 hidden h-14 w-10 -translate-y-1/2 items-center justify-center text-title-3 text-slate-100 transition hover:text-violet-300 xl:flex"
          aria-label="Next artists"
          @click="scrollHomeArtists(1)"
        >
          >
        </button>
      </div>
    </section>

    <section
      class="relative border-y border-violet-950 bg-gradient-to-b from-violet-950 to-black px-5 py-16 sm:px-6 sm:py-20"
    >
      <h2 class="text-center text-title-2 uppercase text-slate-100 sm:text-title-1">
        Join the collective
      </h2>
      <p class="mx-auto mt-4 max-w-2xl text-center text-body-1 leading-7 text-slate-400">
        Get early access to curated drops or apply to showcase your work on Make It Art.
      </p>
      <div
        class="relative mx-auto mt-10 grid w-full max-w-[1180px] overflow-hidden border border-violet-950 bg-slate-950/95 md:grid-cols-2"
      >
        <div
          class="flex flex-col justify-center border-b border-violet-950 px-6 py-10 md:border-b-0 md:border-r sm:px-10"
        >
          <p class="text-body-1 leading-7 text-slate-300">
            Meet collectors and artists, share your work and join the Make It Art community.
          </p>
          <a
            href="https://discord.com/invite/TsF3jMGDr3"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-7 inline-flex min-h-14 items-center justify-center gap-3 bg-slate-100 px-7 text-button-2 font-semibold text-black transition-colors hover:bg-slate-300"
          >
            <img class="h-6 w-8" src="/icons/discord.svg" alt="" />
            Join our Discord community
          </a>
        </div>
        <div class="flex flex-col justify-center px-6 py-10 sm:px-10">
          <p class="text-body-1 leading-7 text-slate-300">
            Are you an artist ready to sell your work? Submit your profile for curation.
          </p>
          <NuxtLink to="/become-artist" class="ui-button-primary mt-7">Become an artist</NuxtLink>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRequestHeaders } from "#app";
import ArtistCard from "~/components/marketplace/ArtistCard.vue";
import ArtworkCard from "~/components/marketplace/ArtworkCard.vue";

const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const artworksPerRail = 4;
const artistsPerRail = 4;
const featuredArtworkCarousel = ref(null);
const homeArtistCarousel = ref(null);

const { data: categoriesData, pending: categoriesPending } = await useFetch("/api/categories", {
  headers: requestHeaders,
  credentials: "include",
  default: () => ({
    categories: []
  })
});

const { data: artworksData, pending: artworksPending } = await useFetch("/api/artworks", {
  headers: requestHeaders,
  credentials: "include",
  query: {
    limit: 12,
    sort: "popular"
  },
  default: () => ({
    artworks: []
  })
});

const { data: artistsData, pending: artistsPending } = await useFetch("/api/artists", {
  headers: requestHeaders,
  credentials: "include",
  query: {
    limit: 12
  },
  default: () => ({
    artists: []
  })
});

const featuredCategories = computed(() => (categoriesData.value?.categories || []).slice(0, 3));
const featuredArtworks = computed(() => artworksData.value?.artworks || []);
const homeArtists = computed(() => artistsData.value?.artists || []);
const hasArtworkCarousel = computed(() => featuredArtworks.value.length > artworksPerRail);
const hasArtistCarousel = computed(() => homeArtists.value.length > artistsPerRail);

function categoryDescription(categoryName) {
  const descriptions = {
    illustration: "Browse narrative compositions, experimental drawings and vivid digital scenes.",
    photography:
      "Explore curated photographic artworks shaped for digital collectors and galleries.",
    graphic: "Discover graphic assets, visual systems and bold compositions ready for curation."
  };

  const key = String(categoryName || "")
    .trim()
    .toLowerCase();

  return (
    descriptions[key] ||
    "Discover curated works from this creative discipline in the public catalog."
  );
}

function categoryCardClass(index, total) {
  if (total === 1) {
    return "lg:col-span-5";
  }

  if (total === 2) {
    return index === 0 ? "lg:col-span-2" : "lg:col-span-3";
  }

  if (index === 0) {
    return "lg:col-span-2";
  }

  if (index === 1) {
    return "lg:col-span-3";
  }

  return "lg:col-span-5";
}

function buildCategoryRoute(category) {
  return {
    path: "/artworks",
    query: {
      search: category.name
    }
  };
}

function scrollCarousel(carouselRef, direction) {
  const carousel = carouselRef.value;

  if (!carousel) {
    return;
  }

  const cards = carousel.querySelectorAll("[data-carousel-card]");

  if (!cards.length) {
    return;
  }

  const firstCard = cards[0];
  const secondCard = cards[1];
  const step = secondCard ? secondCard.offsetLeft - firstCard.offsetLeft : firstCard.clientWidth;

  carousel.scrollBy({
    left: direction * step,
    behavior: "smooth"
  });
}

function scrollFeaturedArtworks(direction) {
  scrollCarousel(featuredArtworkCarousel, direction);
}

function scrollHomeArtists(direction) {
  scrollCarousel(homeArtistCarousel, direction);
}
</script>

<style scoped>
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
