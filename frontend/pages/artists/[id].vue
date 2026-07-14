<template>
  <main class="min-h-screen bg-[#02040A] px-6 py-10 text-[#E6EDF7]">
    <section class="mx-auto grid w-full max-w-[1240px] gap-8">
      <NuxtLink
        to="/artists"
        class="inline-flex w-fit items-center justify-center rounded-2xl border border-[#1B2640] bg-[#0A0F1A] px-5 py-3 text-sm font-semibold text-[#D5E0FF] transition hover:bg-[#12192A]"
      >
        Retour aux artistes
      </NuxtLink>

      <section
        v-if="pending"
        class="rounded-[32px] border border-[#151E30] bg-[#070B14] p-8 text-[#96A4B8]"
      >
        Chargement du profil artiste...
      </section>
      <section
        v-else-if="errorMessage"
        class="rounded-[32px] border border-[#6C1F2D] bg-[#261018] p-8 text-[#FBC8D0]"
      >
        {{ errorMessage }}
      </section>
      <template v-else-if="artist">
        <section
          class="grid gap-8 rounded-[32px] border border-[#151E30] bg-[radial-gradient(circle_at_top_left,_rgba(74,108,247,0.18),_transparent_28%),linear-gradient(180deg,_#070B14,_#04070D)] p-8 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div class="flex flex-col gap-6">
            <div class="flex items-start gap-5">
              <div
                class="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#111A31] text-2xl font-semibold text-[#D7E3FF] ring-1 ring-[#4A6CF7]/35"
              >
                {{ initials }}
              </div>

              <div class="flex-1">
                <div class="flex flex-wrap items-center gap-3">
                  <h1
                    class="text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[0.96] text-white"
                  >
                    {{ artist.displayName }}
                  </h1>
                  <span
                    class="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
                    :class="
                      artist.verified
                        ? 'bg-[#4A6CF7]/12 text-[#BCD0FF]'
                        : 'bg-[#3F2A11] text-[#F3D38A]'
                    "
                  >
                    {{ artist.verified ? "Verifie" : "En revue" }}
                  </span>
                </div>
                <p class="mt-4 text-base text-[#D1DBEA]">
                  {{ artist.artType || "Art numerique" }}
                </p>
                <p class="mt-4 max-w-3xl text-sm leading-8 text-[#A4B0C0]">
                  {{
                    artist.bio ||
                    "Ce profil public sera enrichi a mesure que l'artiste structure son portfolio."
                  }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <span
                v-for="style in artist.styles || []"
                :key="style"
                class="rounded-full bg-[#101728] px-3 py-1 text-xs font-medium text-[#C7D4EA]"
              >
                {{ style }}
              </span>
            </div>

            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                class="inline-flex min-h-12 items-center justify-center rounded-2xl border px-6 text-sm font-semibold transition"
                :class="
                  artist.isFollowed
                    ? 'border-[#F2C97D] bg-[#F2C97D]/10 text-[#F7D990]'
                    : 'border-[#24314F] bg-[#0C111D] text-[#E6EDF7] hover:border-[#4A6CF7]'
                "
                :disabled="Boolean(followLoading[artist.id])"
                @click="toggleFollow(artist)"
              >
                {{
                  followLoading[artist.id]
                    ? "Mise a jour..."
                    : artist.isFollowed
                      ? "Unfollow"
                      : "Follow"
                }}
              </button>

              <a
                v-if="artist.portfolioUrl"
                :href="artist.portfolioUrl"
                target="_blank"
                rel="noreferrer"
                class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] bg-transparent px-6 text-sm font-semibold text-[#C9D6FF] transition hover:border-[#4A6CF7]"
              >
                Ouvrir le portfolio
              </a>
            </div>

            <div
              v-if="actionMessage"
              class="rounded-2xl border border-[#203357] bg-[#091121] px-5 py-4 text-sm text-[#BFD0FF]"
            >
              {{ actionMessage }}
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <article
              class="rounded-[24px] border border-[#151E30] bg-[#050912] p-5"
            >
              <p class="text-xs uppercase tracking-[0.16em] text-[#63728B]">
                Oeuvres
              </p>
              <p class="mt-3 text-3xl font-semibold text-white">
                {{ artist.stats?.artworks || 0 }}
              </p>
            </article>
            <article
              class="rounded-[24px] border border-[#151E30] bg-[#050912] p-5"
            >
              <p class="text-xs uppercase tracking-[0.16em] text-[#63728B]">
                Followers
              </p>
              <p class="mt-3 text-3xl font-semibold text-white">
                {{ artist.stats?.followers || 0 }}
              </p>
            </article>
            <article
              class="rounded-[24px] border border-[#151E30] bg-[#050912] p-5"
            >
              <p class="text-xs uppercase tracking-[0.16em] text-[#63728B]">
                Collections
              </p>
              <p class="mt-3 text-3xl font-semibold text-white">
                {{ artist.stats?.collections || 0 }}
              </p>
            </article>
          </div>
        </section>

        <section class="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div class="grid gap-6">
            <div class="flex items-end justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">
                  Portfolio public
                </p>
                <h2 class="mt-3 text-2xl font-semibold text-white">
                  Oeuvres disponibles
                </h2>
              </div>
              <NuxtLink
                to="/artworks"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#24314F] bg-[#0C111D] px-5 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#141C2E]"
              >
                Retour au catalogue
              </NuxtLink>
            </div>

            <div v-if="artworks.length" class="grid gap-6 lg:grid-cols-2">
              <ArtworkCard
                v-for="artwork in artworks"
                :key="artwork.id"
                :artwork="artwork"
                :favorite-loading="Boolean(favoriteLoading[artwork.id])"
                :show-favorite-action="true"
                @toggle-favorite="toggleFavorite"
              />
            </div>
            <div
              v-else
              class="rounded-[28px] border border-[#151E30] bg-[#070B14] p-8 text-[#96A4B8]"
            >
              Cet artiste n'a pas encore d'oeuvres publiques visibles.
            </div>
          </div>

          <div class="grid gap-6">
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">
                Collections d'artiste
              </p>
              <h2 class="mt-3 text-2xl font-semibold text-white">
                Series et selections
              </h2>
            </div>

            <div v-if="collections.length" class="grid gap-4">
              <article
                v-for="collection in collections"
                :key="collection.id"
                class="rounded-[28px] border border-[#151E30] bg-[#070B14] p-6"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h3 class="text-xl font-semibold text-white">
                      {{ collection.title }}
                    </h3>
                    <p class="mt-3 text-sm leading-7 text-[#A4B0C0]">
                      {{
                        collection.description ||
                        "Collection en cours de curation."
                      }}
                    </p>
                  </div>
                  <span
                    class="rounded-full bg-[#101728] px-3 py-1 text-xs font-medium text-[#C7D4EA]"
                  >
                    {{ collection.itemsCount }} oeuvre(s)
                  </span>
                </div>

                <div class="mt-5 grid gap-3">
                  <NuxtLink
                    v-for="item in collection.items.slice(0, 3)"
                    :key="item.id"
                    :to="`/artworks/${item.id}`"
                    class="rounded-2xl border border-[#151E30] bg-[#050912] px-4 py-4 transition hover:border-[#34405B]"
                  >
                    <p class="font-semibold text-[#EFF4FF]">{{ item.title }}</p>
                    <p class="mt-2 text-sm text-[#8D9BB2]">
                      {{ item.category?.name || "Oeuvre numerique" }}
                    </p>
                  </NuxtLink>
                </div>
              </article>
            </div>
            <div
              v-else
              class="rounded-[28px] border border-[#151E30] bg-[#070B14] p-8 text-[#96A4B8]"
            >
              Aucune collection publique n'est visible pour cet artiste.
            </div>
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
const requestHeaders = import.meta.server
  ? useRequestHeaders(["cookie"])
  : undefined;

const { data, pending, error, refresh } = await useFetch(
  `/api/artists/${route.params.id}`,
  {
    headers: requestHeaders,
    credentials: "include",
    default: () => ({
      artist: null,
      artworks: [],
      collections: [],
    }),
  },
);

const artist = computed(() => data.value?.artist || null);
const artworks = computed(() => data.value?.artworks || []);
const collections = computed(() => data.value?.collections || []);
const initials = computed(() => getArtistInitials(artist.value?.displayName));
const errorMessage = computed(() => error.value?.data?.message || "");

const {
  actionMessage,
  favoriteLoading,
  followLoading,
  toggleFavorite,
  toggleFollow,
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
