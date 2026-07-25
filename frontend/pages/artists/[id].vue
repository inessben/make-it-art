<template>
  <main class="min-h-screen bg-black px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
    <section class="mx-auto grid w-full max-w-[1240px] gap-8">
      <NuxtLink
        to="/artists"
        class="inline-flex min-h-11 w-fit items-center justify-center border border-slate-800 bg-slate-950 px-5 text-subtitle-2 uppercase tracking-[0.12em] text-slate-300 transition hover:border-violet-600"
      >
        Back to artists
      </NuxtLink>

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
      <template v-else-if="artist">
        <section
          class="grid gap-7 rounded-[24px] border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-5 sm:rounded-[32px] sm:p-8 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div class="flex flex-col gap-6">
            <div class="flex flex-col items-start gap-5 sm:flex-row">
              <div
                class="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-slate-800 text-2xl font-semibold text-violet-200 ring-1 ring-violet-700/30"
              >
                {{ initials }}
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-3">
                  <h1 class="break-words text-title-2 text-white sm:text-title-1">
                    {{ artist.displayName }}
                  </h1>
                  <span
                    class="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest"
                    :class="
                      artist.verified
                        ? 'bg-violet-700/10 text-violet-200'
                        : 'bg-amber-950 text-amber-300'
                    "
                  >
                    {{ artist.verified ? "Verified" : "Under review" }}
                  </span>
                </div>
                <p class="mt-4 text-base text-slate-100">
                  {{ artist.artType || "Digital art" }}
                </p>
                <p class="mt-4 max-w-3xl text-sm leading-8 text-slate-400">
                  {{
                    artist.bio ||
                    "This public profile will grow as the artist develops their portfolio."
                  }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <span
                v-for="style in artist.styles || []"
                :key="style"
                class="rounded-full bg-slate-850 px-3 py-1 text-xs font-medium text-slate-100"
              >
                {{ style }}
              </span>
            </div>

            <div class="grid gap-3 sm:flex sm:flex-wrap">
              <button
                type="button"
                class="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border px-6 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                :class="
                  artist.isFollowed
                    ? 'border-amber-300 bg-amber-300/10 text-amber-200'
                    : 'border-slate-750 bg-slate-850 text-slate-100 hover:border-violet-700'
                "
                :disabled="Boolean(followLoading[artist.id])"
                @click="toggleFollow(artist)"
              >
                {{
                  followLoading[artist.id]
                    ? "Updating..."
                    : artist.isFollowed
                      ? "Unfollow"
                      : "Follow this artist"
                }}
              </button>

              <a
                v-if="artist.portfolioUrl"
                :href="artist.portfolioUrl"
                target="_blank"
                rel="noreferrer"
                class="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-750 bg-transparent px-6 text-sm font-semibold text-violet-200 transition hover:border-violet-700 sm:w-auto"
              >
                Open portfolio
              </a>
            </div>

            <AppStatePanel
              v-if="actionMessage"
              compact
              :type="actionStatus || 'success'"
              :message="actionMessage"
            />
          </div>

          <div class="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <article class="rounded-[24px] border border-slate-800 bg-slate-950 p-5">
              <p class="text-xs uppercase tracking-widest text-slate-500">Artworks</p>
              <p class="mt-3 text-3xl font-semibold text-white">
                {{ artist.stats?.artworks || 0 }}
              </p>
            </article>
            <article class="rounded-[24px] border border-slate-800 bg-slate-950 p-5">
              <p class="text-xs uppercase tracking-widest text-slate-500">Followers</p>
              <p class="mt-3 text-3xl font-semibold text-white">
                {{ artist.stats?.followers || 0 }}
              </p>
            </article>
            <article class="rounded-[24px] border border-slate-800 bg-slate-950 p-5">
              <p class="text-xs uppercase tracking-widest text-slate-500">Collections</p>
              <p class="mt-3 text-3xl font-semibold text-white">
                {{ artist.stats?.collections || 0 }}
              </p>
            </article>
          </div>
        </section>

        <section class="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div class="grid gap-6">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p class="text-xs uppercase tracking-widest text-violet-400">Public portfolio</p>
                <h2 class="mt-3 text-2xl font-semibold text-white">Available artworks</h2>
              </div>
              <NuxtLink
                to="/artworks"
                class="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-750 bg-slate-850 px-5 text-sm font-semibold text-slate-100 transition hover:bg-slate-750 sm:w-auto"
              >
                Back to marketplace
              </NuxtLink>
            </div>

            <div v-if="artworks.length" class="grid gap-6 sm:grid-cols-2">
              <ArtworkCard
                v-for="artwork in artworks"
                :key="artwork.id"
                :artwork="artwork"
                :favorite-loading="Boolean(favoriteLoading[artwork.id])"
                :show-favorite-action="true"
                @toggle-favorite="toggleFavorite"
              />
            </div>
            <AppStatePanel
              v-else
              type="empty"
              title="No public artworks"
              message="This artist does not have any public artworks yet."
            />
          </div>

          <div class="grid gap-6">
            <div>
              <p class="text-xs uppercase tracking-widest text-violet-400">Artist collections</p>
              <h2 class="mt-3 text-2xl font-semibold text-white">Series and selections</h2>
            </div>

            <div v-if="collections.length" class="grid gap-4">
              <article
                v-for="collection in collections"
                :key="collection.id"
                class="rounded-[28px] border border-slate-800 bg-slate-900 p-6"
              >
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 class="text-xl font-semibold text-white">
                      {{ collection.title }}
                    </h3>
                    <p class="mt-3 text-sm leading-7 text-slate-400">
                      {{ collection.description || "Collection currently being curated." }}
                    </p>
                  </div>
                  <span
                    class="rounded-full bg-slate-850 px-3 py-1 text-xs font-medium text-slate-100"
                  >
                    {{ collection.itemsCount }} artwork(s)
                  </span>
                </div>

                <div class="mt-5 grid gap-3">
                  <NuxtLink
                    v-for="item in collection.items.slice(0, 3)"
                    :key="item.id"
                    :to="`/artworks/${item.id}`"
                    class="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 transition hover:border-slate-750"
                  >
                    <p class="font-semibold text-slate-100">{{ item.title }}</p>
                    <p class="mt-2 text-sm text-slate-500">
                      {{ item.category?.name || "Digital artwork" }}
                    </p>
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
          </div>
        </section>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useRequestHeaders, useRoute } from "#app";
import { useAuthStore } from "~/stores/auth";
import ArtworkCard from "~/components/marketplace/ArtworkCard.vue";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";
import { getArtistInitials } from "~/utils/marketplace";

const route = useRoute();
const auth = useAuthStore();
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;

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

const {
  actionMessage,
  actionStatus,
  favoriteLoading,
  followLoading,
  toggleFavorite,
  toggleFollow
} = useMarketplaceActions(auth);

onMounted(async () => {
  if (!auth.user) {
    try {
      await auth.fetchCurrentUser();
      await refresh();
    } catch {
      // Public page: anonymous visitors are allowed.
    }
  }
});
</script>
