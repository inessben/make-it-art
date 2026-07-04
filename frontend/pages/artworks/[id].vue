<template>
  <main class="min-h-screen bg-[#02040A] px-6 py-10 text-[#E6EDF7]">
    <section class="mx-auto grid w-full max-w-[1240px] gap-8">
      <NuxtLink
        to="/artworks"
        class="inline-flex w-fit items-center justify-center rounded-2xl border border-[#1B2640] bg-[#0A0F1A] px-5 py-3 text-sm font-semibold text-[#D5E0FF] transition hover:bg-[#12192A]"
      >
        Retour au catalogue
      </NuxtLink>

      <section v-if="pending" class="rounded-[32px] border border-[#151E30] bg-[#070B14] p-8 text-[#96A4B8]">
        Chargement de l'oeuvre...
      </section>
      <section
        v-else-if="errorMessage"
        class="rounded-[32px] border border-[#6C1F2D] bg-[#261018] p-8 text-[#FBC8D0]"
      >
        {{ errorMessage }}
      </section>
      <template v-else-if="artwork">
        <section
          class="grid gap-8 rounded-[32px] border border-[#151E30] bg-[radial-gradient(circle_at_top_left,_rgba(74,108,247,0.18),_transparent_30%),linear-gradient(180deg,_#070B14,_#04070D)] p-8 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <div class="grid gap-6">
            <div
              class="flex min-h-[420px] items-center justify-center rounded-[30px] border border-[#1B2640] bg-[radial-gradient(circle_at_center,_rgba(74,108,247,0.18),_transparent_50%),linear-gradient(135deg,_#0F1628,_#05070D)] p-10"
            >
              <div class="text-center">
                <p class="text-xs uppercase tracking-[0.22em] text-[#8AA2FF]">Artwork spotlight</p>
                <p class="mt-6 text-[clamp(3rem,8vw,6rem)] font-semibold text-white">
                  {{ artwork.title }}
                </p>
                <p class="mt-4 text-sm text-[#96A4B8]">
                  {{ artwork.category?.name || "Oeuvre numerique" }}
                </p>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <article class="rounded-[24px] border border-[#151E30] bg-[#050912] p-5">
                <p class="text-xs uppercase tracking-[0.16em] text-[#63728B]">Prix</p>
                <p class="mt-3 text-2xl font-semibold text-white">{{ formattedPrice }}</p>
              </article>
              <article class="rounded-[24px] border border-[#151E30] bg-[#050912] p-5">
                <p class="text-xs uppercase tracking-[0.16em] text-[#63728B]">Favoris</p>
                <p class="mt-3 text-2xl font-semibold text-white">{{ artwork.favoriteCount || 0 }}</p>
              </article>
              <article class="rounded-[24px] border border-[#151E30] bg-[#050912] p-5">
                <p class="text-xs uppercase tracking-[0.16em] text-[#63728B]">Publication</p>
                <p class="mt-3 text-2xl font-semibold text-white">{{ formattedDate }}</p>
              </article>
            </div>
          </div>

          <div class="grid gap-6">
            <div>
              <div class="flex flex-wrap items-center gap-3">
                <span class="rounded-full bg-[#4A6CF7]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#BCD0FF]">
                  {{ artwork.category?.name || "Oeuvre numerique" }}
                </span>
                <span
                  v-if="artwork.protection"
                  class="rounded-full bg-[#10261A] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#9DE2B4]"
                >
                  Protection activee
                </span>
              </div>
              <h1 class="mt-6 text-[clamp(2.4rem,5vw,4.1rem)] font-semibold leading-[0.96] text-white">
                {{ artwork.title }}
              </h1>
              <p class="mt-5 max-w-2xl text-sm leading-8 text-[#A4B0C0]">
                {{ artwork.description || "Cette oeuvre sera bientot accompagnee d'une description detaillee." }}
              </p>
            </div>

            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                class="inline-flex min-h-12 items-center justify-center rounded-2xl border px-6 text-sm font-semibold transition"
                :class="
                  artwork.isFavorite
                    ? 'border-[#F2C97D] bg-[#F2C97D]/10 text-[#F7D990]'
                    : 'border-[#24314F] bg-[#0C111D] text-[#E6EDF7] hover:border-[#4A6CF7]'
                "
                :disabled="Boolean(favoriteLoading[artwork.id])"
                @click="toggleFavorite(artwork)"
              >
                {{
                  favoriteLoading[artwork.id]
                    ? "Mise a jour..."
                    : artwork.isFavorite
                      ? "Retirer des favoris"
                      : "Ajouter aux favoris"
                }}
              </button>

              <button
                type="button"
                class="inline-flex min-h-12 items-center justify-center rounded-2xl border px-6 text-sm font-semibold transition"
                :class="
                  artwork.artist?.isFollowed
                    ? 'border-[#F2C97D] bg-[#F2C97D]/10 text-[#F7D990]'
                    : 'border-[#24314F] bg-[#0C111D] text-[#E6EDF7] hover:border-[#4A6CF7]'
                "
                :disabled="!artwork.artist || Boolean(followLoading[artwork.artist?.id])"
                @click="artwork.artist && toggleFollow(artwork.artist)"
              >
                {{
                  artwork.artist && followLoading[artwork.artist.id]
                    ? "Mise a jour..."
                    : artwork.artist?.isFollowed
                      ? "Ne plus suivre"
                      : "Suivre l'artiste"
                }}
              </button>

              <NuxtLink
                v-if="artwork.artist"
                :to="`/artists/${artwork.artist.id}`"
                class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] bg-transparent px-6 text-sm font-semibold text-[#C9D6FF] transition hover:border-[#4A6CF7]"
              >
                Voir le profil artiste
              </NuxtLink>
            </div>

            <div
              v-if="actionMessage"
              class="rounded-2xl border border-[#203357] bg-[#091121] px-5 py-4 text-sm text-[#BFD0FF]"
            >
              {{ actionMessage }}
            </div>

            <section
              v-if="showCollectorTools"
              class="grid gap-4 rounded-[28px] border border-[#151E30] bg-[#050912] p-6"
            >
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">Mes collections</p>
                  <h2 class="mt-3 text-xl font-semibold text-white">
                    Sauvegarder cette oeuvre dans une collection
                  </h2>
                </div>
                <NuxtLink
                  to="/collections"
                  class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#24314F] bg-[#0B111C] px-4 text-sm font-semibold text-[#D5E0FF] transition hover:bg-[#12192A]"
                >
                  Gérer
                </NuxtLink>
              </div>

              <div v-if="collectionsLoading" class="text-sm text-[#96A4B8]">
                Chargement de vos collections...
              </div>
              <div v-else class="grid gap-3 sm:grid-cols-[1fr_auto]">
                <select
                  v-model="selectedCollectionId"
                  class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
                >
                  <option value="">Choisir une collection</option>
                  <option v-for="collection in personalCollections" :key="collection.id" :value="String(collection.id)">
                    {{ collection.title }} ({{ collection.itemsCount }})
                  </option>
                </select>

                <button
                  type="button"
                  class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6D8BFF]"
                  :disabled="collectionSubmitLoading"
                  @click="addToCollection"
                >
                  {{ collectionSubmitLoading ? "Ajout..." : "Ajouter" }}
                </button>
              </div>

              <p v-if="collectionMessage" class="text-sm text-[#BFD0FF]">{{ collectionMessage }}</p>
              <p v-if="!personalCollections.length && !collectionsLoading" class="text-sm text-[#96A4B8]">
                Cree ta premiere collection pour organiser tes reperes.
              </p>
            </section>

            <section class="rounded-[28px] border border-[#151E30] bg-[#050912] p-6">
              <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">Artiste</p>
              <div v-if="artwork.artist" class="mt-4 grid gap-3">
                <p class="text-2xl font-semibold text-white">{{ artwork.artist.displayName }}</p>
                <p class="text-sm leading-7 text-[#A4B0C0]">
                  {{ artwork.artist.bio || "Cet artiste complete actuellement son profil public." }}
                </p>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="style in artwork.artist.styles || []"
                    :key="style"
                    class="rounded-full bg-[#101728] px-3 py-1 text-xs font-medium text-[#C7D4EA]"
                  >
                    {{ style }}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section class="grid gap-6">
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">A voir aussi</p>
              <h2 class="mt-3 text-2xl font-semibold text-white">Oeuvres proches de cet univers</h2>
            </div>
            <NuxtLink
              to="/artworks"
              class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#24314F] bg-[#0C111D] px-5 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#141C2E]"
            >
              Retour au catalogue
            </NuxtLink>
          </div>

          <div v-if="relatedArtworks.length" class="grid gap-6 lg:grid-cols-3">
            <ArtworkCard
              v-for="relatedArtwork in relatedArtworks"
              :key="relatedArtwork.id"
              :artwork="relatedArtwork"
              :favorite-loading="Boolean(favoriteLoading[relatedArtwork.id])"
              :show-favorite-action="true"
              @toggle-favorite="toggleFavorite"
            />
          </div>
          <div v-else class="rounded-[28px] border border-[#151E30] bg-[#070B14] p-8 text-[#96A4B8]">
            Pas encore d'oeuvres similaires affichees pour cette fiche.
          </div>
        </section>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRequestHeaders, useRoute } from "#app";
import { useAuthStore } from "~/stores/auth";
import ArtworkCard from "~/components/marketplace/ArtworkCard.vue";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";
import { formatMarketplaceDate, formatMarketplacePrice } from "~/utils/marketplace";

const route = useRoute();
const auth = useAuthStore();
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const collectionsLoading = ref(false);
const collectionSubmitLoading = ref(false);
const collectionMessage = ref("");
const selectedCollectionId = ref("");
const personalCollections = ref([]);

const {
  data,
  pending,
  error,
  refresh
} = await useFetch(`/api/artworks/${route.params.id}`, {
  headers: requestHeaders,
  credentials: "include",
  default: () => ({
    artwork: null,
    relatedArtworks: []
  })
});

const artwork = computed(() => data.value?.artwork || null);
const relatedArtworks = computed(() => data.value?.relatedArtworks || []);
const formattedPrice = computed(() =>
  formatMarketplacePrice(artwork.value?.priceValue ?? artwork.value?.price)
);
const formattedDate = computed(() => formatMarketplaceDate(artwork.value?.createdAt));
const errorMessage = computed(() => error.value?.data?.message || "");
const showCollectorTools = computed(() => auth.user && !auth.isAdmin);

const {
  actionMessage,
  favoriteLoading,
  followLoading,
  toggleFavorite,
  toggleFollow
} = useMarketplaceActions(auth);

async function loadCollections() {
  if (!showCollectorTools.value) {
    personalCollections.value = [];
    return;
  }

  collectionsLoading.value = true;

  try {
    const response = await $fetch("/api/collections/me", {
      credentials: "include"
    });

    personalCollections.value = response.collections || [];
  } catch (error) {
    collectionMessage.value = error?.data?.message || "Impossible de charger vos collections.";
  } finally {
    collectionsLoading.value = false;
  }
}

async function addToCollection() {
  if (!selectedCollectionId.value) {
    collectionMessage.value = "Choisis d'abord une collection.";
    return;
  }

  if (!artwork.value) {
    return;
  }

  collectionSubmitLoading.value = true;
  collectionMessage.value = "";

  try {
    const response = await $fetch(`/api/collections/me/${selectedCollectionId.value}/artworks`, {
      method: "POST",
      credentials: "include",
      body: {
        artworkId: artwork.value.id
      }
    });

    personalCollections.value = personalCollections.value.map((collection) =>
      collection.id === response.collection.id ? response.collection : collection
    );
    collectionMessage.value = "Oeuvre ajoutee a la collection.";
  } catch (error) {
    collectionMessage.value =
      error?.data?.message || "Impossible d'ajouter cette oeuvre a la collection.";
  } finally {
    collectionSubmitLoading.value = false;
  }
}

onMounted(async () => {
  if (!auth.user) {
    try {
      await auth.fetchCurrentUser();
      await refresh();
    } catch {
      // Public page: anonymous visitors are allowed.
    }
  }

  await loadCollections();
});
</script>
