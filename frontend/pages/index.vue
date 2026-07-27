<template>
  <main class="homepage">
    <section class="homepage__hero">
      <div class="homepage__hero-glow" />

      <div class="homepage__hero-content">
        <h1 class="homepage__hero-title">
          <span class="homepage__hero-title-line homepage__hero-title-line--light">
            Welcome to
          </span>
          <span class="homepage__hero-title-line homepage__hero-title-line--brand">
            Make It Art
          </span>
        </h1>

        <p class="homepage__hero-subtitle">Digital arts curations &amp; artists marketplace</p>

        <div class="homepage__hero-actions">
          <NuxtLink to="/artworks" class="homepage__hero-button homepage__hero-button--primary">
            Start exploring
          </NuxtLink>
          <NuxtLink to="/artists" class="homepage__hero-button homepage__hero-button--secondary">
            View galleries
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="homepage__section">
      <div class="homepage__section-heading">
        <div>
          <h2 class="homepage__section-title">Browse by categories</h2>
          <p class="homepage__section-copy">Discover art across diverse digital disciplines.</p>
        </div>
      </div>

      <div
        v-if="categoriesPending"
        class="homepage__category-grid"
        aria-label="Category placeholders"
      >
        <div class="homepage__category-card homepage__category-card--small is-placeholder" />
        <div class="homepage__category-card homepage__category-card--wide is-placeholder" />
        <div class="homepage__category-card homepage__category-card--full is-placeholder" />
      </div>

      <div
        v-else-if="categoryCards.length"
        class="homepage__category-grid"
        aria-label="Browse categories"
      >
        <NuxtLink
          v-for="(category, index) in categoryCards"
          :key="category.id"
          :to="buildCategoryRoute(category)"
          class="homepage__category-card"
          :class="categoryCardClass(index)"
          :style="categoryCardStyle(category.imageUrl)"
        >
          <div class="homepage__category-overlay" />
          <div class="homepage__category-body">
            <h3 class="homepage__category-title">{{ category.displayName }}</h3>
            <p class="homepage__category-count">{{ category.piecesLabel }}</p>
          </div>
        </NuxtLink>
      </div>

      <div v-else class="homepage__empty">
        <p class="homepage__empty-title">Categories coming soon</p>
        <p class="homepage__empty-copy">
          Public categories will appear here once the artwork catalog is ready to browse.
        </p>
      </div>

      <div class="homepage__section-link-row">
        <NuxtLink to="/artworks" class="homepage__section-link">
          <span>all categories</span>
          <span aria-hidden="true">&rarr;</span>
        </NuxtLink>
      </div>
    </section>

    <section class="homepage__section">
      <div class="homepage__section-heading homepage__section-heading--compact">
        <div>
          <h2 class="homepage__section-title">Featured artworks</h2>
          <p class="homepage__section-copy">
            Hand-picked digital masterpieces from our global roster.
          </p>
        </div>
      </div>

      <div
        v-if="artworksPending"
        class="homepage__artwork-grid homepage__artwork-grid--placeholder"
        aria-label="Artwork placeholders"
      >
        <div
          v-for="placeholder in artworksPerRail"
          :key="placeholder"
          class="homepage__artwork-card is-placeholder"
        />
      </div>

      <div v-else-if="showcaseArtworks.length" class="homepage__rail">
        <button
          v-if="hasArtworkCarousel"
          type="button"
          class="homepage__rail-arrow homepage__rail-arrow--left"
          aria-label="Previous artworks"
          @click="scrollFeaturedArtworks(-1)"
        >
          &lsaquo;
        </button>

        <div
          ref="featuredArtworkCarousel"
          class="homepage__rail-viewport homepage__hide-scrollbar"
          :class="{ 'homepage__rail-viewport--scrollable': hasArtworkCarousel }"
          @scroll="updateArtworkProgress"
        >
          <div class="homepage__rail-track">
            <article
              v-for="artwork in showcaseArtworks"
              :key="artwork.id"
              data-carousel-card
              class="homepage__artwork-card"
            >
              <NuxtLink :to="`/artworks/${artwork.id}`" class="homepage__artwork-link">
                <div class="homepage__artwork-image-shell">
                  <img
                    v-if="artwork.imageUrl"
                    :src="artwork.imageUrl"
                    :alt="artwork.title"
                    class="homepage__artwork-image"
                  />
                  <div v-else class="homepage__artwork-image homepage__artwork-image--fallback">
                    {{ artworkInitials(artwork) }}
                  </div>
                </div>

                <div class="homepage__artwork-meta">
                  <p class="homepage__artwork-title">{{ artwork.title }}</p>
                  <div class="homepage__artwork-bottom">
                    <p class="homepage__artwork-handle">{{ artworkHandle(artwork) }}</p>
                    <p class="homepage__artwork-price">{{ artworkPrice(artwork) }}</p>
                  </div>
                </div>
              </NuxtLink>
            </article>
          </div>
        </div>

        <button
          v-if="hasArtworkCarousel"
          type="button"
          class="homepage__rail-arrow homepage__rail-arrow--right"
          aria-label="Next artworks"
          @click="scrollFeaturedArtworks(1)"
        >
          &rsaquo;
        </button>
      </div>

      <div v-else class="homepage__empty">
        <p class="homepage__empty-title">Artworks coming soon</p>
        <p class="homepage__empty-copy">
          Featured artworks will appear here as soon as verified artists publish their work.
        </p>
      </div>

      <div class="homepage__section-link-row homepage__section-link-row--tight">
        <NuxtLink to="/artworks" class="homepage__section-link">
          <span>more artworks</span>
          <span aria-hidden="true">&rarr;</span>
        </NuxtLink>
      </div>
    </section>

    <section class="homepage__section">
      <div class="homepage__section-heading homepage__section-heading--compact">
        <div>
          <h2 class="homepage__section-title">Some artists</h2>
          <p class="homepage__section-copy">Discover art across diverse digital disciplines.</p>
        </div>
      </div>

      <div class="homepage__artists-shell">
        <button
          v-if="hasArtistCarousel"
          type="button"
          class="homepage__rail-arrow homepage__rail-arrow--left homepage__rail-arrow--artists"
          aria-label="Previous artists"
          @click="scrollHomeArtists(-1)"
        >
          &lsaquo;
        </button>

        <div
          v-if="artistsPending"
          class="homepage__artist-grid homepage__artist-grid--placeholder"
          aria-label="Artist placeholders"
        >
          <div
            v-for="placeholder in artistsPerRail"
            :key="placeholder"
            class="homepage__artist-card is-placeholder"
          />
        </div>

        <template v-else-if="showcaseArtists.length">
          <div
            ref="homeArtistCarousel"
            class="homepage__rail-viewport homepage__hide-scrollbar"
            :class="{ 'homepage__rail-viewport--scrollable': hasArtistCarousel }"
            @scroll="updateArtistProgress"
          >
            <div class="homepage__rail-track homepage__rail-track--artists">
              <article
                v-for="artist in showcaseArtists"
                :key="artist.id"
                data-carousel-card
                class="homepage__artist-card"
              >
                <NuxtLink :to="`/artists/${artist.id}`" class="homepage__artist-link">
                  <div class="homepage__artist-banner" />

                  <div class="homepage__artist-head">
                    <div class="homepage__artist-avatar">
                      <img
                        v-if="artist.avatarUrl"
                        :src="artist.avatarUrl"
                        :alt="artist.displayName"
                        class="homepage__artist-avatar-image"
                      />
                      <img v-else src="/logo.png" alt="" class="homepage__artist-avatar-logo" />
                    </div>

                    <div class="homepage__artist-headcopy">
                      <div class="homepage__artist-name-row">
                        <p class="homepage__artist-name">{{ artist.displayName }}</p>
                        <span v-if="artist.verified" class="homepage__artist-verified">
                          <span aria-hidden="true">&#10003;</span>
                        </span>
                      </div>
                      <p class="homepage__artist-role">{{ artistRole(artist) }}</p>
                    </div>
                  </div>

                  <div class="homepage__artist-body">
                    <p class="homepage__artist-tagline">
                      It's {{ artist.displayName }} your fav' artist
                    </p>
                    <p class="homepage__artist-bio">{{ artistBio(artist) }}</p>
                  </div>
                </NuxtLink>
              </article>
            </div>
          </div>

          <div class="homepage__artists-meter">
            <span class="homepage__artists-meter-track" />
            <span class="homepage__artists-meter-thumb" :style="artistMeterStyle" />
          </div>
        </template>

        <div v-else class="homepage__empty homepage__empty--artists">
          <p class="homepage__empty-title">Artists coming soon</p>
          <p class="homepage__empty-copy">
            Verified artist profiles will appear here as soon as the public catalog is available.
          </p>
        </div>

        <button
          v-if="hasArtistCarousel"
          type="button"
          class="homepage__rail-arrow homepage__rail-arrow--right homepage__rail-arrow--artists"
          aria-label="Next artists"
          @click="scrollHomeArtists(1)"
        >
          &rsaquo;
        </button>
      </div>

      <div class="homepage__section-link-row homepage__section-link-row--tight">
        <NuxtLink to="/artists" class="homepage__section-link">
          <span>all artists</span>
          <span aria-hidden="true">&rarr;</span>
        </NuxtLink>
      </div>
    </section>

    <section class="homepage__collective">
      <div class="homepage__collective-inner">
        <h2 class="homepage__collective-title">Join the collective</h2>

        <div class="homepage__collective-panels">
          <article class="homepage__collective-panel">
            <p class="homepage__collective-copy">
              Subscribe to receive exclusive access to early drops
            </p>

            <form class="homepage__newsletter-form" @submit.prevent>
              <input
                v-model="newsletterEmail"
                type="email"
                class="homepage__newsletter-input"
                placeholder="YOUR EMAIL ADDRESS"
              />
              <button type="submit" class="homepage__newsletter-button">Subscribe</button>
            </form>
          </article>

          <article class="homepage__collective-panel">
            <p class="homepage__collective-copy">
              Are you an artist interested in selling your work ? Feel free to fill out this form !
            </p>

            <NuxtLink to="/become-artist" class="homepage__collective-cta">
              Become An Artist
            </NuxtLink>
          </article>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { useRequestHeaders } from "#app";
import { formatMarketplacePrice, getArtistInitials } from "~/utils/marketplace";

const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const artworksPerRail = 4;
const artistsPerRail = 3;
const featuredArtworkCarousel = ref(null);
const homeArtistCarousel = ref(null);
const artworkProgress = ref(0);
const artistProgress = ref(0);
const newsletterEmail = ref("");

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
const showcaseArtworks = computed(() => (artworksData.value?.artworks || []).slice(0, 12));
const showcaseArtists = computed(() => (artistsData.value?.artists || []).slice(0, 12));
const hasArtworkCarousel = computed(() => showcaseArtworks.value.length > artworksPerRail);
const hasArtistCarousel = computed(() => showcaseArtists.value.length > artistsPerRail);

const categoryCards = computed(() =>
  featuredCategories.value.map((category, index) => {
    const meta = categoryPresentation(category.name, index);
    const categoryMatches = showcaseArtworks.value.filter(
      (artwork) =>
        normalizeKey(artwork.category?.name) === normalizeKey(category.name) ||
        artwork.category?.id === category.id
    );
    const pieceCount = Math.max(category.artworksCount || categoryMatches.length || 0, 0);

    return {
      ...category,
      ...meta,
      imageUrl: category.imageUrl || "",
      piecesLabel: `${pieceCount} ${pieceCount === 1 ? "Piece" : "Pieces"}`
    };
  })
);

const artistMeterStyle = computed(() => {
  const width = hasArtistCarousel.value ? 24 : 100;
  const left = hasArtistCarousel.value ? artistProgress.value * (100 - width) : 0;

  return {
    width: `${width}%`,
    left: `${left}%`
  };
});

watch(
  [showcaseArtworks, showcaseArtists],
  async () => {
    await nextTick();
    updateArtworkProgress();
    updateArtistProgress();
  },
  { immediate: true }
);

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function categoryPresentation(name, index) {
  const key = normalizeKey(name);
  const map = {
    "digital art": { displayName: "Digital Arts" },
    "digital arts": { displayName: "Digital Arts" },
    illustration: { displayName: "Digital Arts" },
    illustrations: { displayName: "Digital Arts" },
    graphics: { displayName: "Graphics" },
    graphic: { displayName: "Graphics" },
    "graphical assets": { displayName: "Graphics" },
    photographie: { displayName: "Photographies" },
    photographies: { displayName: "Photographies" },
    photography: { displayName: "Photographies" }
  };

  return (
    map[key] || {
      displayName:
        index === 0
          ? "Digital Arts"
          : index === 1
            ? "Graphics"
            : index === 2
              ? "Photographies"
              : name
    }
  );
}

function categoryCardClass(index) {
  if (index === 0) return "homepage__category-card--small";
  if (index === 1) return "homepage__category-card--wide";
  return "homepage__category-card--full";
}

function categoryCardStyle(imageUrl) {
  if (!imageUrl) {
    return {
      backgroundImage:
        "linear-gradient(180deg, rgba(32, 18, 58, 0.55) 0%, rgba(5, 8, 15, 0.94) 100%)"
    };
  }

  return {
    backgroundImage:
      `linear-gradient(180deg, rgba(6, 10, 17, 0.02) 0%, rgba(6, 10, 17, 0.88) 100%), ` +
      `url(${imageUrl})`
  };
}

function buildCategoryRoute(category) {
  return {
    path: "/artworks",
    query: {
      search: category.name
    }
  };
}

function artworkPrice(artwork) {
  return formatMarketplacePrice(artwork.priceValue ?? artwork.price);
}

function artworkHandle(artwork) {
  const base =
    artwork.artist?.displayName ||
    artwork.artist?.username ||
    artwork.artist?.email ||
    "make_it_art";

  return `BY @${String(base)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")}`;
}

function artworkInitials(artwork) {
  return getArtistInitials(artwork.artist?.displayName || artwork.title);
}

function artistRole(artist) {
  return artist.artType || "Digital Artist";
}

function artistBio(artist) {
  const fallback =
    "I love painting, drawing and make something different because art it will be something different.";
  const source = String(artist.bio || fallback).trim();

  return source.length > 120 ? `${source.slice(0, 117)}...` : source;
}

function updateProgressFor(carouselRef, targetRef) {
  const carousel = carouselRef.value;

  if (!carousel) {
    targetRef.value = 0;
    return;
  }

  const maxScroll = carousel.scrollWidth - carousel.clientWidth;
  targetRef.value = maxScroll > 0 ? carousel.scrollLeft / maxScroll : 0;
}

function updateArtworkProgress() {
  updateProgressFor(featuredArtworkCarousel, artworkProgress);
}

function updateArtistProgress() {
  updateProgressFor(homeArtistCarousel, artistProgress);
}

function scrollCarousel(carouselRef, direction) {
  const carousel = carouselRef.value;

  if (!carousel) return;

  const cards = carousel.querySelectorAll("[data-carousel-card]");

  if (!cards.length) return;

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

<style scoped lang="scss">
.homepage {
  background: radial-gradient(circle at 50% 0%, rgba(123, 44, 255, 0.11), transparent 26%), #000;
  color: #e6edf7;
}

.homepage__hero {
  position: relative;
  display: flex;
  min-height: 900px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0 24px 48px;
}

.homepage__hero-glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 20%, rgba(123, 44, 255, 0.22), transparent 22%),
    linear-gradient(180deg, rgba(123, 44, 255, 0.04) 0%, rgba(0, 0, 0, 0) 35%);
  pointer-events: none;
}

.homepage__hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(100%, 930px);
  flex-direction: column;
  align-items: center;
  gap: 30px;
  text-align: center;
}

.homepage__hero-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-transform: uppercase;
}

.homepage__hero-title-line {
  display: block;
  font-family: "Hanken Grotesk", sans-serif;
  line-height: 0.94;
  letter-spacing: -0.06em;
}

.homepage__hero-title-line--light {
  font-size: clamp(4rem, 7.8vw, 6.8rem);
  font-weight: 200;
  color: #fff;
}

.homepage__hero-title-line--brand {
  font-size: clamp(4.8rem, 10vw, 7.7rem);
  font-weight: 800;
  color: #7b2cff;
}

.homepage__hero-subtitle {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: clamp(0.86rem, 1.15vw, 1rem);
  font-weight: 500;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: #898989;
}

.homepage__hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.homepage__hero-button {
  display: inline-flex;
  min-height: 56px;
  min-width: 234px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 18px 32px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.homepage__hero-button:hover {
  transform: translateY(-1px);
}

.homepage__hero-button--primary {
  background: #7b2cff;
  color: #080011;
}

.homepage__hero-button--primary:hover {
  background: #8c47ff;
}

.homepage__hero-button--secondary {
  background: rgba(255, 255, 255, 0.03);
  color: rgba(230, 237, 247, 0.92);
}

.homepage__hero-button--secondary:hover {
  border-color: rgba(123, 44, 255, 0.8);
}

.homepage__section {
  width: min(100%, 1440px);
  margin: 0 auto;
  padding: 0 32px 136px;
}

.homepage__section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.homepage__section-heading--compact {
  width: 100%;
  max-width: none;
}

.homepage__section-title {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: clamp(2.35rem, 5vw, 3.95rem);
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
  color: #fff;
}

.homepage__section-copy {
  margin-top: 12px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: clamp(0.95rem, 1.18vw, 1.08rem);
  line-height: 1.45;
  color: rgba(230, 237, 247, 0.72);
}

.homepage__category-grid {
  display: grid;
  margin-top: 58px;
  gap: 16px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.homepage__category-card {
  position: relative;
  display: flex;
  min-height: 312px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  background-color: #090d17;
  background-position: center;
  background-size: cover;
  transition:
    transform 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease;
}

.homepage__category-card:hover {
  transform: translateY(-2px);
  border-color: rgba(123, 44, 255, 0.46);
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.3);
}

.homepage__category-card--small {
  grid-column: span 2;
}

.homepage__category-card--wide {
  grid-column: span 3;
}

.homepage__category-card--full {
  grid-column: span 5;
}

.homepage__category-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(9, 13, 23, 0.04) 18%, rgba(9, 13, 23, 0.88) 100%);
}

.homepage__category-body {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  margin-top: auto;
  flex-direction: column;
  gap: 6px;
  padding: 28px 22px;
}

.homepage__category-title {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 24px;
  font-weight: 500;
  color: #e6edf7;
}

.homepage__category-count {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(230, 237, 247, 0.9);
}

.homepage__rail,
.homepage__artists-shell {
  position: relative;
  margin-top: 58px;
}

.homepage__rail-viewport {
  overflow: hidden;
}

.homepage__rail-viewport--scrollable {
  overflow-x: auto;
  scroll-behavior: smooth;
}

.homepage__rail-track {
  display: flex;
  gap: 20px;
}

.homepage__rail-track--artists {
  gap: 24px;
}

.homepage__artwork-grid--placeholder,
.homepage__artist-grid--placeholder {
  display: grid;
  gap: 20px;
}

.homepage__artwork-grid--placeholder {
  margin-top: 58px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.homepage__artist-grid--placeholder {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.homepage__artwork-card {
  width: min(100%, 320px);
  flex: 0 0 min(100%, 320px);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: #090d17;
}

.homepage__artwork-link {
  display: block;
}

.homepage__artwork-image-shell {
  overflow: hidden;
  background: #090d17;
}

.homepage__artwork-image {
  display: block;
  width: 100%;
  aspect-ratio: 0.72;
  object-fit: cover;
  transition: transform 0.24s ease;
}

.homepage__artwork-link:hover .homepage__artwork-image {
  transform: scale(1.03);
}

.homepage__artwork-image--fallback {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top, rgba(123, 44, 255, 0.28), transparent 46%),
    linear-gradient(180deg, #111727, #04070d);
  font-size: 52px;
  font-weight: 700;
  color: #e6edf7;
}

.homepage__artwork-meta {
  display: flex;
  min-height: 78px;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 12px 14px;
}

.homepage__artwork-title {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: rgba(230, 237, 247, 0.92);
}

.homepage__artwork-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.homepage__artwork-handle,
.homepage__artwork-price {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 9px;
  letter-spacing: 0.02em;
  color: rgba(230, 237, 247, 0.42);
}

.homepage__artist-card {
  width: min(100%, 392px);
  flex: 0 0 min(100%, 392px);
  overflow: hidden;
  border: 1px solid rgba(114, 92, 170, 0.22);
  background: #0a0c14;
}

.homepage__artist-link {
  display: block;
}

.homepage__artist-banner {
  height: 74px;
  background:
    linear-gradient(180deg, rgba(28, 34, 58, 0.95), rgba(20, 25, 40, 0.95)),
    radial-gradient(circle at top, rgba(123, 44, 255, 0.2), transparent 60%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.homepage__artist-head {
  display: flex;
  gap: 18px;
  padding: 0 18px;
  margin-top: -50px;
}

.homepage__artist-avatar {
  display: grid;
  height: 82px;
  width: 82px;
  flex: 0 0 82px;
  place-items: center;
  overflow: hidden;
  border: 3px solid rgba(94, 42, 180, 0.88);
  border-radius: 999px;
  background: radial-gradient(circle at top, rgba(123, 44, 255, 0.26), #12071f 72%);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.36);
}

.homepage__artist-avatar-image {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.homepage__artist-avatar-logo {
  width: 58px;
  object-fit: contain;
}

.homepage__artist-headcopy {
  padding-top: 18px;
}

.homepage__artist-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.homepage__artist-name {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 22px;
  font-weight: 600;
  color: #e6edf7;
}

.homepage__artist-verified {
  display: inline-flex;
  height: 22px;
  width: 22px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(230, 237, 247, 0.75);
  border-radius: 999px;
  font-size: 11px;
  color: rgba(230, 237, 247, 0.92);
}

.homepage__artist-role {
  margin-top: 8px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 14px;
  color: rgba(230, 237, 247, 0.6);
}

.homepage__artist-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 18px 24px;
}

.homepage__artist-tagline {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  color: rgba(230, 237, 247, 0.72);
}

.homepage__artist-bio {
  min-height: 88px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: rgba(230, 237, 247, 0.6);
}

.homepage__rail-arrow {
  position: absolute;
  top: 50%;
  z-index: 2;
  display: flex;
  height: 54px;
  width: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(14, 16, 26, 0.82);
  color: rgba(230, 237, 247, 0.92);
  font-size: 34px;
  line-height: 1;
  transform: translateY(-50%);
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.homepage__rail-arrow:hover {
  background: rgba(39, 22, 69, 0.96);
  color: #fff;
}

.homepage__rail-arrow--left {
  left: -18px;
}

.homepage__rail-arrow--right {
  right: -18px;
}

.homepage__rail-arrow--artists {
  top: 42%;
}

.homepage__artists-meter {
  position: relative;
  width: 280px;
  height: 8px;
  margin-top: 18px;
  margin-left: 8px;
}

.homepage__artists-meter-track,
.homepage__artists-meter-thumb {
  position: absolute;
  inset-block: 0;
  border-radius: 999px;
}

.homepage__artists-meter-track {
  inset-inline: 0;
  background: rgba(255, 255, 255, 0.18);
}

.homepage__artists-meter-thumb {
  background: rgba(255, 255, 255, 0.82);
  transition: left 0.2s ease;
}

.homepage__section-link-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.homepage__section-link-row--tight {
  margin-top: 28px;
}

.homepage__section-link {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 24px 0;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 16px;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
  white-space: nowrap;
  color: rgba(230, 237, 247, 0.72);
  transition: color 0.2s ease;
}

.homepage__section-link:hover {
  color: #fff;
}

.homepage__collective {
  padding: 130px 24px;
  background: linear-gradient(182deg, rgba(123, 44, 255, 0.22) -60%, #000 58%);
}

.homepage__collective-inner {
  width: min(100%, 1248px);
  margin: 0 auto;
}

.homepage__collective-title {
  position: relative;
  z-index: 0;
  margin-bottom: -30px;
  text-align: center;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: clamp(3.2rem, 8vw, 6rem);
  font-weight: 700;
  line-height: 0.9;
  text-transform: uppercase;
  color: #e6edf7;
}

.homepage__collective-panels {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid #24005b;
  background: rgba(1, 5, 14, 0.34);
  backdrop-filter: blur(10px);
}

.homepage__collective-panel {
  display: flex;
  min-height: 276px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 64px 56px;
}

.homepage__collective-panel + .homepage__collective-panel {
  border-left: 1px solid #24005b;
}

.homepage__collective-copy {
  max-width: 576px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 16px;
  line-height: 1.5;
  text-align: center;
  color: rgba(230, 237, 247, 0.85);
}

.homepage__newsletter-form {
  display: grid;
  width: min(100%, 490px);
  grid-template-columns: 1fr auto;
  overflow: hidden;
  border: 1px solid #7b2cff;
  border-radius: 8px;
}

.homepage__newsletter-input {
  min-height: 66px;
  padding: 16px 32px;
  background: rgba(9, 13, 23, 0.42);
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 14px;
  color: #e6edf7;
}

.homepage__newsletter-input::placeholder {
  color: #6b7280;
}

.homepage__newsletter-button {
  min-width: 108px;
  padding: 0 24px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 14px;
  font-weight: 700;
  text-decoration: underline;
  color: #fff;
}

.homepage__collective-cta {
  display: inline-flex;
  min-height: 56px;
  width: min(100%, 490px);
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #7b2cff;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  transition: background-color 0.2s ease;
}

.homepage__collective-cta:hover {
  background: #8d47ff;
}

.homepage__empty {
  display: grid;
  min-height: 320px;
  place-items: center;
  margin-top: 58px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 13, 23, 0.65);
  padding: 32px;
  text-align: center;
}

.homepage__empty--artists {
  min-height: 328px;
}

.homepage__empty-title {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(230, 237, 247, 0.8);
}

.homepage__empty-copy {
  margin-top: 12px;
  max-width: 560px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  line-height: 1.6;
  color: rgba(230, 237, 247, 0.6);
}

.is-placeholder {
  background: linear-gradient(135deg, rgba(123, 44, 255, 0.08), transparent), rgba(9, 13, 23, 0.85);
}

.homepage__hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.homepage__hide-scrollbar::-webkit-scrollbar {
  display: none;
}

@media (max-width: 1279px) {
  .homepage__rail-arrow {
    display: none;
  }

  .homepage__artwork-card {
    width: min(100%, 286px);
    flex-basis: min(100%, 286px);
  }

  .homepage__artist-card {
    width: min(100%, 340px);
    flex-basis: min(100%, 340px);
  }
}

@media (max-width: 1024px) {
  .homepage__hero {
    min-height: 760px;
  }

  .homepage__category-grid {
    grid-template-columns: 1fr;
  }

  .homepage__category-card--small,
  .homepage__category-card--wide,
  .homepage__category-card--full {
    grid-column: auto;
  }

  .homepage__artwork-grid--placeholder {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .homepage__artist-grid--placeholder {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .homepage__collective-panels {
    grid-template-columns: 1fr;
  }

  .homepage__collective-panel + .homepage__collective-panel {
    border-left: 0;
    border-top: 1px solid #24005b;
  }
}

@media (max-width: 767px) {
  .homepage__hero {
    min-height: 620px;
    padding: 0 16px 56px;
  }

  .homepage__hero-subtitle {
    max-width: 320px;
    line-height: 1.45;
  }

  .homepage__hero-actions {
    width: 100%;
    gap: 14px;
  }

  .homepage__hero-button {
    width: 100%;
    min-width: 0;
  }

  .homepage__section {
    padding: 0 16px 88px;
  }

  .homepage__artwork-grid--placeholder,
  .homepage__artist-grid--placeholder {
    grid-template-columns: 1fr;
  }

  .homepage__artwork-card,
  .homepage__artist-card {
    width: 100%;
    flex-basis: 100%;
  }

  .homepage__artist-avatar {
    height: 72px;
    width: 72px;
    flex-basis: 72px;
  }

  .homepage__artist-name {
    font-size: 18px;
  }

  .homepage__artists-meter {
    width: 180px;
    margin-left: 0;
  }

  .homepage__collective {
    padding: 88px 16px;
  }

  .homepage__collective-title {
    margin-bottom: -12px;
    line-height: 1;
  }

  .homepage__collective-panel {
    padding: 32px 20px;
  }

  .homepage__newsletter-form {
    grid-template-columns: 1fr;
  }

  .homepage__newsletter-button {
    min-height: 56px;
    border-top: 1px solid rgba(123, 44, 255, 0.28);
  }
}
</style>
