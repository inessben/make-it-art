<template>
  <main class="artist-page">
    <section class="artist-page__shell">
      <AppStatePanel
        v-if="pending"
        type="loading"
        title="Loading artist profile"
        message="The artist portfolio is being retrieved."
      />
      <AppStatePanel
        v-else-if="errorMessage"
        type="error"
        title="Unable to load this artist"
        :message="errorMessage"
        action-label="Try again"
        :action-disabled="pending"
        @action="refresh"
      />
      <AppStatePanel
        v-else-if="!artist"
        type="empty"
        title="Artist not found"
        message="This profile is no longer available in the public directory."
      />
      <template v-else>
        <section class="artist-hero">
          <div class="artist-hero__media" :style="heroBackgroundStyle" />
          <div class="artist-hero__overlay" />

          <div class="artist-hero__content">
            <div class="artist-hero__identity">
              <div class="artist-hero__avatar-shell">
                <div class="artist-hero__avatar-frame">
                  <img
                    v-if="artist.avatarUrl"
                    :src="artist.avatarUrl"
                    :alt="artist.displayName"
                    class="artist-hero__avatar-image"
                  />
                  <span v-else class="artist-hero__avatar-fallback">{{ initials }}</span>
                </div>

                <span
                  v-if="artist.verified"
                  class="artist-hero__badge"
                  aria-label="Verified artist"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M9.4 16.6 5.8 13l1.4-1.4 2.2 2.2 6-6 1.4 1.4-7.4 7.4Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
              </div>

              <div class="artist-hero__copy">
                <div class="artist-hero__heading">
                  <h1 class="artist-hero__name">{{ artist.displayName }}</h1>
                  <NuxtLink
                    v-if="isOwnArtistProfile"
                    to="/artist-profile"
                    class="artist-hero__edit-link"
                    aria-label="Edit my public profile"
                    title="Edit my public profile"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M3 17.3V21h3.7L18 9.7 14.3 6 3 17.3Zm17.7-10a1 1 0 0 0 0-1.4l-2.6-2.6a1 1 0 0 0-1.4 0l-1.7 1.7 3.7 3.7 2-1.4Z"
                        fill="currentColor"
                      />
                    </svg>
                  </NuxtLink>
                </div>
                <p class="artist-hero__descriptor">{{ artistDescriptor }}</p>
              </div>
            </div>

            <div class="artist-hero__actions">
              <NuxtLink
                v-if="isOwnArtistProfile"
                to="/artworks/new"
                class="artist-hero__button artist-hero__button--primary artist-hero__button--add"
              >
                <span class="artist-hero__button-plus" aria-hidden="true">+</span>
                <span>Add artwork</span>
              </NuxtLink>
              <button
                v-else-if="showFollowAction"
                type="button"
                class="artist-hero__button artist-hero__button--primary"
                :disabled="Boolean(followLoading[artist.id])"
                @click="toggleFollow(artist)"
              >
                {{
                  followLoading[artist.id]
                    ? "Updating..."
                    : artist.isFollowed
                      ? "Following"
                      : "Follow"
                }}
              </button>
              <button
                v-else
                type="button"
                class="artist-hero__button artist-hero__button--primary"
                @click="activeTab = 'portfolio'"
              >
                View works
              </button>

              <a
                v-if="secondaryAction?.kind === 'external'"
                :href="secondaryAction.href"
                target="_blank"
                rel="noreferrer"
                class="artist-hero__button artist-hero__button--secondary"
              >
                {{ secondaryAction.label }}
              </a>
              <button
                v-else-if="secondaryAction"
                type="button"
                class="artist-hero__button artist-hero__button--secondary"
                @click="handleSecondaryAction"
              >
                {{ secondaryAction.label }}
              </button>
            </div>
          </div>
        </section>

        <section class="artist-layout">
          <aside class="artist-sidebar">
            <div class="artist-stats">
              <article class="artist-panel artist-panel--stat">
                <span class="artist-panel__eyebrow">Followers</span>
                <strong class="artist-panel__metric">{{ followersMetric }}</strong>
              </article>
              <article class="artist-panel artist-panel--stat">
                <span class="artist-panel__eyebrow">Artworks</span>
                <strong class="artist-panel__metric">{{ artworksMetric }}</strong>
              </article>
            </div>

            <article class="artist-panel artist-panel--bio">
              <span class="artist-panel__accent">Biography</span>
              <p class="artist-panel__bio-copy">
                {{ artist.bio || defaultBiography }}
              </p>

              <div class="artist-panel__links">
                <a
                  v-if="artist.portfolioUrl"
                  :href="artist.portfolioUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="artist-panel__link"
                >
                  <span class="artist-panel__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M12 3c-2.2 0-4.3.8-5.9 2.4A8.3 8.3 0 0 0 3.7 11H7c.2-2 .8-3.8 1.8-5.1C9.8 4.2 10.9 3.3 12 3Zm3.2 2.9c1 1.3 1.7 3.1 1.8 5.1h3.3a8.3 8.3 0 0 0-2.4-5.6A8.3 8.3 0 0 0 12 3c1.1.3 2.2 1.2 3.2 2.9ZM7 13H3.7c.2 2.1 1.1 4 2.5 5.5A8.3 8.3 0 0 0 12 21c-1.1-.3-2.2-1.2-3.2-2.9A11.6 11.6 0 0 1 7 13Zm10 0c-.2 2-.8 3.8-1.8 5.1-1 1.7-2.1 2.6-3.2 2.9a8.3 8.3 0 0 0 5.8-2.5 8.3 8.3 0 0 0 2.5-5.5H17Zm-8 0c.2 1.6.7 3 1.4 4.1.6 1 .9 1.4 1.2 1.6.3-.2.6-.6 1.2-1.6.7-1.1 1.2-2.5 1.4-4.1H9Zm5-2c-.2-1.6-.7-3-1.4-4.1-.6-1-.9-1.4-1.2-1.6-.3.2-.6.6-1.2 1.6A9.7 9.7 0 0 0 9 11h5Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span>{{ portfolioLabel }}</span>
                </a>

                <div
                  v-if="artist.socialHandle"
                  class="artist-panel__link artist-panel__link--static"
                >
                  <span class="artist-panel__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M12 5a7 7 0 0 0 0 14h3v-2h-3a5 5 0 1 1 5-5v.8a1.2 1.2 0 0 1-2.4 0V12a4.6 4.6 0 1 0-1.3 3.2 3 3 0 0 0 5.7-1.4V12A7 7 0 0 0 12 5Zm0 8.4a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span>{{ artist.socialHandle }}</span>
                </div>
              </div>
            </article>

            <article v-if="latestDrop" class="artist-panel artist-panel--drop">
              <span class="artist-panel__chip">{{ latestDrop.eyebrow }}</span>
              <h2 class="artist-panel__drop-title">{{ latestDrop.title }}</h2>
              <p class="artist-panel__drop-copy">{{ latestDrop.description }}</p>

              <button type="button" class="artist-panel__drop-button" @click="openLatestDrop">
                {{ latestDrop.actionLabel }}
              </button>
            </article>
          </aside>

          <div class="artist-main">
            <div class="artist-main__header">
              <nav class="artist-tabs" aria-label="Artist sections">
                <button
                  v-for="tab in tabs"
                  :key="tab.value"
                  type="button"
                  class="artist-tabs__button"
                  :class="{ 'artist-tabs__button--active': activeTab === tab.value }"
                  @click="activeTab = tab.value"
                >
                  {{ tab.label }}
                </button>
              </nav>

              <div class="artist-main__header-actions">
                <NuxtLink
                  v-if="isOwnArtistProfile"
                  to="/artworks/new"
                  class="artist-main__add-artwork"
                >
                  <span aria-hidden="true">+</span>
                  <span>Add artwork</span>
                </NuxtLink>

                <div v-if="activeTab === 'portfolio'" class="artist-main__view-toggle">
                  <button
                    type="button"
                    class="artist-main__view-button"
                    :class="{ 'artist-main__view-button--active': displayMode === 'masonry' }"
                    aria-label="Masonry view"
                    @click="displayMode = 'masonry'"
                  >
                    <span />
                    <span />
                    <span />
                    <span />
                  </button>
                  <button
                    type="button"
                    class="artist-main__view-button artist-main__view-button--lines"
                    :class="{ 'artist-main__view-button--active': displayMode === 'grid' }"
                    aria-label="Grid view"
                    @click="displayMode = 'grid'"
                  >
                    <span />
                    <span />
                    <span />
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="actionMessage"
              class="artist-feedback"
              :class="{
                'artist-feedback--error': actionStatus === 'error',
                'artist-feedback--success': actionStatus !== 'error'
              }"
            >
              {{ actionMessage }}
            </div>

            <section v-if="activeTab === 'portfolio'" class="artist-tab-panel">
              <div
                v-if="portfolioEntries.length"
                class="artist-gallery"
                :class="{
                  'artist-gallery--masonry': displayMode === 'masonry',
                  'artist-gallery--grid': displayMode === 'grid'
                }"
              >
                <article
                  v-for="artwork in portfolioEntries"
                  :key="artwork.id"
                  class="artist-artwork-card"
                  :class="artwork.layoutClass"
                >
                  <NuxtLink :to="`/artworks/${artwork.id}`" class="artist-artwork-card__media">
                    <img
                      v-if="artwork.imageUrl"
                      :src="artwork.imageUrl"
                      :alt="artwork.title"
                      class="artist-artwork-card__image"
                    />
                    <div v-else class="artist-artwork-card__fallback">
                      {{ getArtistInitials(artwork.title) }}
                    </div>
                  </NuxtLink>

                  <div class="artist-artwork-card__body">
                    <div class="artist-artwork-card__heading">
                      <h3 class="artist-artwork-card__title">{{ artwork.title }}</h3>
                      <span class="artist-artwork-card__price">
                        {{ formatMarketplacePrice(artwork.priceValue ?? artwork.price) }}
                      </span>
                    </div>
                    <p class="artist-artwork-card__meta">
                      Collection: {{ artwork.collectionTitle }}
                    </p>
                  </div>
                </article>
              </div>

              <AppStatePanel
                v-else
                type="empty"
                title="No public artworks"
                message="This artist does not have any public artworks yet."
              />

              <div v-if="portfolioEntries.length" class="artist-main__cta">
                <NuxtLink
                  :to="{ path: '/artworks', query: { search: artist.displayName } }"
                  class="artist-main__cta-button"
                >
                  View all artworks
                </NuxtLink>
              </div>
            </section>

            <section v-else-if="activeTab === 'collections'" class="artist-tab-panel">
              <div v-if="sortedCollections.length" class="artist-collections">
                <article
                  v-for="collection in sortedCollections"
                  :key="collection.id"
                  class="artist-collection-card"
                >
                  <div class="artist-collection-card__header">
                    <div>
                      <h3 class="artist-collection-card__title">{{ collection.title }}</h3>
                      <p class="artist-collection-card__copy">
                        {{
                          collection.description ||
                          "A curated public selection from this artist portfolio."
                        }}
                      </p>
                    </div>
                    <span class="artist-collection-card__badge">
                      {{ collection.itemsCount }} artwork(s)
                    </span>
                  </div>

                  <div v-if="collection.items.length" class="artist-collection-card__previews">
                    <NuxtLink
                      v-for="item in collection.items.slice(0, 3)"
                      :key="item.id"
                      :to="`/artworks/${item.id}`"
                      class="artist-collection-card__preview"
                    >
                      <img
                        v-if="item.imageUrl"
                        :src="item.imageUrl"
                        :alt="item.title"
                        class="artist-collection-card__preview-image"
                      />
                      <div v-else class="artist-collection-card__preview-fallback">
                        {{ getArtistInitials(item.title) }}
                      </div>
                      <span class="artist-collection-card__preview-title">{{ item.title }}</span>
                    </NuxtLink>
                  </div>
                </article>
              </div>

              <AppStatePanel
                v-else
                type="empty"
                title="No public collections"
                message="No public collection is available for this artist."
              />
            </section>

            <section v-else class="artist-tab-panel">
              <div v-if="activityEntries.length" class="artist-activity">
                <article
                  v-for="entry in activityEntries"
                  :key="entry.id"
                  class="artist-activity__item"
                >
                  <div class="artist-activity__marker" />
                  <div class="artist-activity__content">
                    <span class="artist-activity__eyebrow">{{ entry.eyebrow }}</span>
                    <h3 class="artist-activity__title">{{ entry.title }}</h3>
                    <p class="artist-activity__copy">{{ entry.description }}</p>
                    <div class="artist-activity__footer">
                      <span>{{ entry.dateLabel }}</span>
                      <NuxtLink v-if="entry.link" :to="entry.link" class="artist-activity__link">
                        Open
                      </NuxtLink>
                    </div>
                  </div>
                </article>
              </div>

              <AppStatePanel
                v-else
                type="empty"
                title="No recent activity"
                message="This artist has not published any visible update yet."
              />
            </section>
          </div>
        </section>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo, useRequestHeaders, useRoute } from "#app";
import { useAuthStore } from "~/stores/auth";
import { useAnalyticsEvent } from "~/composables/useAnalyticsEvent";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";
import {
  formatMarketplaceDate,
  formatMarketplacePrice,
  getArtistInitials
} from "~/utils/marketplace";

const defaultBiography =
  "This artist is shaping a distinctive digital universe. Public highlights, curated collections and new portfolio drops will appear here as the profile evolves.";

const tabs = [
  { label: "Portfolio", value: "portfolio" },
  { label: "Collections", value: "collections" },
  { label: "Activity", value: "activity" }
];

const artworkLayoutCycle = [
  "artist-artwork-card--tall",
  "artist-artwork-card--medium",
  "artist-artwork-card--short",
  "artist-artwork-card--medium",
  "artist-artwork-card--short",
  "artist-artwork-card--tall"
];

const route = useRoute();
const auth = useAuthStore();
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;

const activeTab = ref("portfolio");
const displayMode = ref("masonry");

const { data, pending, error, refresh } = await useFetch(`/api/artists/${route.params.id}`, {
  headers: requestHeaders,
  credentials: "include",
  default: () => ({
    artist: null,
    artworks: [],
    collections: []
  })
});

const artist = computed(() => data.value?.artist || null);
const artworks = computed(() => data.value?.artworks || []);
const collections = computed(() => data.value?.collections || []);
const initials = computed(() => getArtistInitials(artist.value?.displayName));
const errorMessage = computed(() =>
  error.value ? error.value?.data?.message || "The artist profile is temporarily unavailable." : ""
);

const sortedArtworks = computed(() =>
  [...artworks.value].sort(
    (left, right) =>
      new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
  )
);

const sortedCollections = computed(() =>
  [...collections.value].sort(
    (left, right) =>
      new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
  )
);

const firstVisualArtwork = computed(
  () => sortedArtworks.value[0] || sortedCollections.value[0]?.items?.[0] || null
);

const heroBackgroundStyle = computed(() => {
  const visualUrl = artist.value?.coverUrl || firstVisualArtwork.value?.imageUrl;

  if (!visualUrl) {
    return {};
  }

  return {
    backgroundImage: `linear-gradient(180deg, rgba(110, 110, 110, 0.32) 0%, rgba(0, 0, 0, 0.86) 88%), url(${visualUrl})`
  };
});

const artistDescriptor = computed(() => {
  const parts = [
    artist.value?.artType,
    ...(Array.isArray(artist.value?.styles) ? artist.value.styles.slice(0, 2) : [])
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return parts.join(" & ") || "Digital artist";
});

const isOwnArtistProfile = computed(() => {
  const viewedArtistId = Number(artist.value?.id);
  const currentArtistId = Number(auth.user?.artist?.id);

  return (
    auth.isArtist === true &&
    Number.isSafeInteger(viewedArtistId) &&
    viewedArtistId > 0 &&
    viewedArtistId === currentArtistId
  );
});

const showFollowAction = computed(() => canFollowArtist(artist.value));

const portfolioLabel = computed(() => {
  if (!artist.value?.portfolioUrl) {
    return "";
  }

  try {
    return new URL(artist.value.portfolioUrl).hostname.replace(/^www\./, "");
  } catch {
    return artist.value.portfolioUrl;
  }
});

const secondaryAction = computed(() => {
  if (artist.value?.portfolioUrl) {
    return {
      label: "Portfolio",
      href: artist.value.portfolioUrl,
      kind: "external"
    };
  }

  const socialHandle = String(artist.value?.socialHandle || "").trim();

  if (socialHandle.startsWith("http://") || socialHandle.startsWith("https://")) {
    return {
      label: "Social",
      href: socialHandle,
      kind: "external"
    };
  }

  if (sortedCollections.value.length > 0) {
    return {
      label: "Collections",
      kind: "internal",
      tab: "collections"
    };
  }

  if (sortedArtworks.value.length > 0) {
    return {
      label: "Activity",
      kind: "internal",
      tab: "activity"
    };
  }

  return {
    label: "Portfolio",
    kind: "internal",
    tab: "portfolio"
  };
});

const followersMetric = computed(() => formatCompactNumber(artist.value?.stats?.followers || 0));
const artworksMetric = computed(() => formatCompactNumber(artist.value?.stats?.artworks || 0));

const artworkCollectionTitles = computed(() => {
  const titles = new Map();

  for (const collection of sortedCollections.value) {
    for (const item of collection.items || []) {
      const artworkId = Number(item?.id);

      if (Number.isSafeInteger(artworkId) && artworkId > 0 && !titles.has(artworkId)) {
        titles.set(artworkId, collection.title);
      }
    }
  }

  return titles;
});

const portfolioEntries = computed(() =>
  sortedArtworks.value.map((artwork, index) => ({
    ...artwork,
    collectionTitle:
      artworkCollectionTitles.value.get(Number(artwork.id)) ||
      artwork.category?.name ||
      "Independent release",
    layoutClass: artworkLayoutCycle[index % artworkLayoutCycle.length]
  }))
);

const latestCollection = computed(() => sortedCollections.value[0] || null);
const latestArtwork = computed(() => sortedArtworks.value[0] || null);

const latestDrop = computed(() => {
  if (latestCollection.value) {
    return {
      eyebrow: "Latest drop",
      title: latestCollection.value.title,
      description:
        latestCollection.value.description ||
        `A collection of ${latestCollection.value.itemsCount} public artwork(s).`,
      actionLabel: "View collection",
      kind: "collection"
    };
  }

  if (latestArtwork.value) {
    return {
      eyebrow: "Latest release",
      title: latestArtwork.value.title,
      description:
        latestArtwork.value.description ||
        "Discover the newest artwork currently visible in this artist portfolio.",
      actionLabel: "Open artwork",
      kind: "artwork",
      link: `/artworks/${latestArtwork.value.id}`
    };
  }

  return null;
});

const activityEntries = computed(() => {
  const entries = [
    ...sortedArtworks.value.map((artwork) => ({
      id: `artwork-${artwork.id}`,
      eyebrow: "Artwork published",
      title: artwork.title,
      description: `Released in ${artworkCollectionTitles.value.get(Number(artwork.id)) || artwork.category?.name || "the public portfolio"}.`,
      date: artwork.createdAt,
      dateLabel: formatMarketplaceDate(artwork.createdAt),
      link: `/artworks/${artwork.id}`
    })),
    ...sortedCollections.value.map((collection) => ({
      id: `collection-${collection.id}`,
      eyebrow: "Collection curated",
      title: collection.title,
      description:
        collection.description ||
        `${collection.itemsCount} artwork(s) gathered in this public collection.`,
      date: collection.createdAt,
      dateLabel: formatMarketplaceDate(collection.createdAt),
      link: null
    }))
  ];

  return entries
    .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime())
    .slice(0, 8);
});

const { actionMessage, actionStatus, canFollowArtist, followLoading, toggleFollow } =
  useMarketplaceActions(auth);
const { trackEvent } = useAnalyticsEvent();

onMounted(async () => {
  if (!auth.user) {
    try {
      await auth.fetchCurrentUser();
      await refresh();
    } catch {
      // Public page: anonymous visitors are allowed.
    }
  }

  if (artist.value) {
    trackEvent("view_artist", { artistId: artist.value.id });
  }
});

async function openLatestDrop() {
  if (!latestDrop.value) {
    return;
  }

  if (latestDrop.value.kind === "collection") {
    activeTab.value = "collections";
    return;
  }

  if (latestDrop.value.link) {
    await navigateTo(latestDrop.value.link);
  }
}

function handleSecondaryAction() {
  if (secondaryAction.value?.kind !== "internal") {
    return;
  }

  activeTab.value = secondaryAction.value.tab || "portfolio";
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number(value || 0));
}
</script>

<style scoped lang="scss">
.artist-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, rgba(123, 44, 255, 0.12), transparent 22%), #000;
  color: #e6edf7;
}

.artist-page__shell {
  width: min(100%, 1240px);
  margin: 0 auto;
  padding: 54px 16px 116px;
}

.artist-hero {
  position: relative;
  min-height: 400px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(98, 98, 98, 0.56) 0%, rgba(0, 0, 0, 0.96) 92%);
}

.artist-hero__media {
  position: absolute;
  inset: 0;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  filter: saturate(0.8);
  opacity: 0.52;
}

.artist-hero__overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(0, 0, 0, 0) 36%),
    linear-gradient(180deg, rgba(0, 0, 0, 0) 48%, rgba(0, 0, 0, 0.94) 100%);
}

.artist-hero__content {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100%;
  min-height: 400px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  padding: 32px;
}

.artist-hero__identity {
  display: flex;
  align-items: flex-end;
  gap: 24px;
}

.artist-hero__avatar-shell {
  position: relative;
  flex: 0 0 144px;
}

.artist-hero__avatar-frame {
  display: grid;
  width: 144px;
  height: 144px;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.artist-hero__avatar-image {
  width: calc(100% - 8px);
  height: calc(100% - 8px);
  border-radius: 4px;
  object-fit: cover;
}

.artist-hero__avatar-fallback {
  display: grid;
  width: calc(100% - 8px);
  height: calc(100% - 8px);
  place-items: center;
  border-radius: 4px;
  background:
    radial-gradient(circle at top, rgba(123, 44, 255, 0.32), transparent 52%), rgba(0, 0, 0, 0.2);
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 48px;
  font-weight: 700;
  color: #fff;
}

.artist-hero__badge {
  position: absolute;
  top: -8px;
  right: -8px;
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #d1bcff;
  color: #24005b;
  box-shadow: 0 0 14px rgba(123, 44, 255, 0.7);
}

.artist-hero__badge svg {
  width: 15px;
  height: 15px;
}

.artist-hero__copy {
  max-width: 460px;
}

.artist-hero__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}

.artist-hero__name {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: clamp(2.4rem, 4vw, 3.25rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  color: #fff;
}

.artist-hero__edit-link {
  display: inline-flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(209, 188, 255, 0.34);
  border-radius: 999px;
  background: rgba(12, 12, 18, 0.68);
  color: #d1bcff;
  backdrop-filter: blur(10px);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.artist-hero__edit-link:hover {
  transform: translateY(-1px);
  border-color: rgba(209, 188, 255, 0.7);
  color: #fff;
}

.artist-hero__edit-link svg {
  width: 18px;
  height: 18px;
}

.artist-hero__descriptor {
  margin-top: 12px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #6d6d6d;
}

.artist-hero__summary {
  margin-top: 18px;
  max-width: 560px;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 15px;
  line-height: 1.8;
  color: rgba(230, 237, 247, 0.76);
}

.artist-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.artist-hero__button {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  padding: 0 32px;
  border-radius: 4px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease,
    border-color 0.2s ease;
}

.artist-hero__button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.artist-hero__button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.artist-hero__button--primary {
  background: #fff;
  color: #24005b;
}

.artist-hero__button--add {
  gap: 10px;
}

.artist-hero__button-plus {
  font-size: 20px;
  line-height: 1;
}

.artist-hero__button--secondary {
  border: 1px solid rgba(209, 188, 255, 0.4);
  background: rgba(255, 255, 255, 0.03);
  color: #fff;
  backdrop-filter: blur(10px);
}

.artist-layout {
  display: grid;
  grid-template-columns: 348px minmax(0, 1fr);
  gap: 28px;
  margin-top: 28px;
  align-items: start;
}

.artist-sidebar {
  display: grid;
  gap: 28px;
}

.artist-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.artist-panel {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
}

.artist-panel--stat {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 20px 18px;
}

.artist-panel__eyebrow {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a2a1a4;
}

.artist-panel__metric {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 36px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.03em;
  color: #fff;
}

.artist-panel--bio,
.artist-panel--drop {
  display: grid;
  gap: 20px;
  padding: 30px;
}

.artist-panel__accent {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7b2cff;
}

.artist-panel__bio-copy {
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 16px;
  line-height: 1.75;
  color: #fff;
}

.artist-panel__links {
  display: grid;
  gap: 16px;
}

.artist-panel__link {
  display: flex;
  align-items: center;
  gap: 14px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 15px;
  color: #e6edf7;
}

.artist-panel__link--static {
  opacity: 0.92;
}

.artist-panel__icon {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  color: #7b2cff;
}

.artist-panel__icon svg {
  width: 20px;
  height: 20px;
}

.artist-panel__chip {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d5d8de;
}

.artist-panel__drop-title {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.1;
  color: #fff;
}

.artist-panel__drop-copy {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 16px;
  line-height: 1.7;
  color: rgba(230, 237, 247, 0.76);
}

.artist-panel__drop-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: transparent;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #dfe6f2;
}

.artist-main {
  min-width: 0;
}

.artist-main__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
}

.artist-main__header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.artist-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
}

.artist-tabs__button {
  position: relative;
  padding: 6px 0 14px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a8a8a;
}

.artist-tabs__button::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: transparent;
  transition: background-color 0.2s ease;
}

.artist-tabs__button--active {
  color: #7b2cff;
}

.artist-tabs__button--active::after {
  background: #7b2cff;
}

.artist-main__view-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.artist-main__add-artwork {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 18px;
  border: 1px solid rgba(123, 44, 255, 0.38);
  border-radius: 999px;
  background: rgba(123, 44, 255, 0.12);
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #efe9ff;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.artist-main__add-artwork:hover {
  transform: translateY(-1px);
  border-color: rgba(123, 44, 255, 0.7);
  background: rgba(123, 44, 255, 0.2);
}

.artist-main__add-artwork span[aria-hidden="true"] {
  font-size: 18px;
  line-height: 1;
}

.artist-main__view-button {
  display: inline-grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  width: 38px;
  height: 38px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
}

.artist-main__view-button span {
  border: 1px solid rgba(230, 237, 247, 0.9);
}

.artist-main__view-button--lines {
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.artist-main__view-button--lines span {
  width: 100%;
  height: 2px;
  border: 0;
  background: rgba(230, 237, 247, 0.9);
}

.artist-main__view-button--active {
  border-color: rgba(123, 44, 255, 0.45);
  box-shadow: inset 0 0 0 1px rgba(123, 44, 255, 0.18);
}

.artist-feedback {
  margin-bottom: 18px;
  border: 1px solid rgba(123, 44, 255, 0.35);
  padding: 14px 16px;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 15px;
}

.artist-feedback--success {
  background: rgba(40, 22, 68, 0.32);
  color: #e9deff;
}

.artist-feedback--error {
  border-color: rgba(184, 42, 42, 0.5);
  background: rgba(64, 10, 10, 0.32);
  color: #fecaca;
}

.artist-tab-panel {
  min-width: 0;
}

.artist-gallery--masonry {
  column-count: 3;
  column-gap: 16px;
}

.artist-gallery--grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.artist-artwork-card {
  break-inside: avoid;
  margin-bottom: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
}

.artist-gallery--grid .artist-artwork-card {
  margin-bottom: 0;
}

.artist-artwork-card__media {
  display: block;
  overflow: hidden;
  border-radius: 4px 4px 0 0;
  margin: 12px 12px 0;
}

.artist-artwork-card__image,
.artist-artwork-card__fallback {
  display: block;
  width: 100%;
  object-fit: cover;
}

.artist-artwork-card__fallback {
  display: grid;
  place-items: center;
  background: radial-gradient(circle at top, rgba(123, 44, 255, 0.28), transparent 48%), #12161f;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 38px;
  font-weight: 700;
  color: #fff;
}

.artist-artwork-card--tall .artist-artwork-card__image,
.artist-artwork-card--tall .artist-artwork-card__fallback {
  aspect-ratio: 1 / 1.28;
}

.artist-artwork-card--medium .artist-artwork-card__image,
.artist-artwork-card--medium .artist-artwork-card__fallback {
  aspect-ratio: 1 / 1.04;
}

.artist-artwork-card--short .artist-artwork-card__image,
.artist-artwork-card--short .artist-artwork-card__fallback {
  aspect-ratio: 1 / 0.84;
}

.artist-artwork-card__body {
  display: grid;
  gap: 8px;
  padding: 14px 12px 16px;
}

.artist-artwork-card__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.artist-artwork-card__title {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: #fff;
}

.artist-artwork-card__price {
  white-space: nowrap;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7b2cff;
}

.artist-artwork-card__meta {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 10px;
  line-height: 1.5;
  text-transform: uppercase;
  color: #a2a1a4;
}

.artist-main__cta {
  display: flex;
  justify-content: center;
  padding-top: 10px;
}

.artist-main__cta-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  padding: 0 28px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
}

.artist-collections {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.artist-collection-card {
  display: grid;
  gap: 18px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
}

.artist-collection-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.artist-collection-card__title {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 22px;
  font-weight: 600;
  color: #fff;
}

.artist-collection-card__copy {
  margin-top: 10px;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 15px;
  line-height: 1.7;
  color: rgba(230, 237, 247, 0.76);
}

.artist-collection-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #e6edf7;
}

.artist-collection-card__previews {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.artist-collection-card__preview {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(5, 8, 12, 0.75);
}

.artist-collection-card__preview-image,
.artist-collection-card__preview-fallback {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.artist-collection-card__preview-fallback {
  display: grid;
  place-items: center;
  background: radial-gradient(circle at top, rgba(123, 44, 255, 0.28), transparent 48%), #12161f;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 26px;
  font-weight: 700;
  color: #fff;
}

.artist-collection-card__preview-title {
  display: block;
  padding: 10px;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 13px;
  color: #fff;
}

.artist-activity {
  display: grid;
  gap: 18px;
}

.artist-activity__item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 14px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
}

.artist-activity__marker {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 999px;
  background: #7b2cff;
  box-shadow: 0 0 12px rgba(123, 44, 255, 0.5);
}

.artist-activity__content {
  min-width: 0;
}

.artist-activity__eyebrow {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7b2cff;
}

.artist-activity__title {
  margin-top: 8px;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 22px;
  font-weight: 600;
  color: #fff;
}

.artist-activity__copy {
  margin-top: 10px;
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 15px;
  line-height: 1.7;
  color: rgba(230, 237, 247, 0.76);
}

.artist-activity__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #a2a1a4;
}

.artist-activity__link {
  color: #fff;
}

@media (max-width: 1180px) {
  .artist-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .artist-gallery--grid,
  .artist-collections {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .artist-hero__content {
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
  }

  .artist-hero__actions {
    justify-content: flex-start;
  }

  .artist-main__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .artist-main__header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .artist-gallery--masonry {
    column-count: 2;
  }
}

@media (max-width: 720px) {
  .artist-page__shell {
    padding: 32px 12px 84px;
  }

  .artist-hero {
    min-height: auto;
  }

  .artist-hero__content {
    min-height: auto;
    padding: 24px 18px;
  }

  .artist-hero__identity {
    flex-direction: column;
    align-items: flex-start;
  }

  .artist-hero__avatar-shell {
    flex-basis: auto;
  }

  .artist-hero__avatar-frame {
    width: 120px;
    height: 120px;
  }

  .artist-stats,
  .artist-gallery--grid,
  .artist-collections {
    grid-template-columns: 1fr;
  }

  .artist-gallery--masonry {
    column-count: 1;
  }

  .artist-tabs {
    gap: 16px;
  }

  .artist-hero__actions {
    width: 100%;
  }

  .artist-hero__button {
    width: 100%;
  }

  .artist-collection-card__header,
  .artist-artwork-card__heading,
  .artist-activity__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .artist-collection-card__previews {
    grid-template-columns: 1fr;
  }
}
</style>
