<template>
  <main class="min-h-screen bg-black px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
    <section class="mx-auto w-full max-w-[1280px]">
      <NuxtLink
        to="/artworks"
        class="inline-flex min-h-11 items-center border border-slate-800 bg-slate-950 px-5 text-subtitle-2 uppercase tracking-[0.12em] text-slate-300 transition hover:border-violet-600"
      >
        Back to marketplace
      </NuxtLink>

      <AppStatePanel
        v-if="pending"
        class="mt-6"
        type="loading"
        title="Loading artwork"
        message="Artwork details are being retrieved."
      />
      <AppStatePanel
        v-else-if="errorMessage"
        class="mt-6"
        type="error"
        title="Unable to load this artwork"
        :message="errorMessage"
        action-label="Try again"
        :action-disabled="pending"
        @action="refresh"
      />
      <AppStatePanel
        v-else-if="!artwork"
        class="mt-6"
        type="empty"
        title="Artwork not found"
        message="This artwork is no longer available in the public marketplace."
        action-label="Browse artworks"
        @action="navigateTo('/artworks')"
      />

      <template v-else>
        <AppStatePanel
          v-if="actionMessage"
          class="mt-6"
          compact
          :type="actionStatus || 'success'"
          :message="actionMessage"
        />

        <section
          class="mt-6 grid overflow-hidden border border-slate-900 bg-slate-950/75 lg:grid-cols-[1.25fr_0.85fr]"
        >
          <div class="border-b border-slate-900 p-4 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div
              class="overflow-hidden rounded-[30px] border border-[#1B2640] bg-[#050912]"
            >
              <img
                v-if="artwork.imageUrl"
                :src="artwork.imageUrl"
                :alt="artwork.title"
                class="max-h-[720px] w-full object-cover"
              />
              <div
                v-else
                class="flex min-h-[420px] items-center justify-center rounded-[30px] border border-[#1B2640] bg-[radial-gradient(circle_at_center,_rgba(74,108,247,0.18),_transparent_50%),linear-gradient(135deg,_#0F1628,_#05070D)] p-10"
              >
                <div class="text-center">
                  <p class="text-xs uppercase tracking-[0.22em] text-[#8AA2FF]">
                    Artwork spotlight
                  </p>
                  <p
                    class="mt-6 text-[clamp(3rem,8vw,6rem)] font-semibold text-white"
                  >
                    {{ artwork.title || artworkInitials }}
                  </p>
                  <p class="mt-4 text-sm text-[#96A4B8]">
                    {{ artwork.category?.name || "Digital artwork" }}
                  </p>
                  <p class="mt-3 max-w-sm mx-auto text-body-1 leading-7 text-slate-400">
                    The artwork record is available. A media preview will appear when a deliverable
                    file is attached.
                  </p>
                </div>
              </div>
              </div>
            </div>
          </div>

<div class="grid gap-6">
  <div>
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <span
        class="rounded-full bg-[#4A6CF7]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#BCD0FF]"
      >
        {{ artwork.category?.name || "Oeuvre numerique" }}
      </span>
      <span
        v-if="artwork.protection"
        class="rounded-full bg-[#10261A] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#9DE2B4]"
      >
        Protection activee
      </span>
      <span
        v-if="artwork.isSold"
        class="rounded-full bg-[#3A1A1A] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5A8A8]"
      >
        Plus disponible
      </span>
    </div>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div
        class="grid h-12 w-12 shrink-0 place-items-center border border-slate-750 bg-black text-violet-300"
      >
        {{ artistInitials }}
      </div>
      <div class="min-w-0 flex-1">
        <NuxtLink
          v-if="artwork.artist"
          :to="`/artists/${artwork.artist.id}`"
          class="text-title-4 text-slate-100 transition hover:text-violet-300"
        >
          {{ artwork.artist.displayName }}
        </NuxtLink>
        <p class="mt-1 text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">
          {{ artwork.artist?.artType || "Digital artist" }}
        </p>
      </div>
      <button
        v-if="artwork.artist && canFollowArtist(artwork.artist)"
        type="button"
        class="min-h-11 w-full border border-slate-800 px-5 text-subtitle-2 uppercase text-slate-300 transition hover:border-violet-600 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        :disabled="Boolean(followLoading[artwork.artist.id])"
        @click="toggleFollow(artwork.artist)"
      >
        {{
          followLoading[artwork.artist.id]
            ? "Updating..."
            : artwork.artist.isFollowed
              ? "Following"
              : "Follow"
        }}
      </button>
    </div>
    <h1
      class="mt-6 text-[clamp(2.4rem,5vw,4.1rem)] font-semibold leading-[0.96] text-white"
    >
      {{ artwork.title }}
    </h1>
  </div>
              >
                {{
                  followLoading[artwork.artist.id]
                    ? "Updating..."
                    : artwork.artist.isFollowed
                      ? "Following"
                      : "Follow"
                }}
              </button>
            </div>

            <h1 class="mt-9 break-words text-title-2 uppercase text-slate-100">
              {{ artwork.title }}
            </h1>
            <p class="mt-5 text-title-3 text-slate-300">{{ formattedPrice }}</p>

            <div class="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <article class="border border-slate-800 bg-black/30 p-4">
                <p class="text-subtitle-2 uppercase text-slate-500">Category</p>
                <p class="mt-3 text-body-1 text-slate-200">
                  {{ artwork.category?.name || "Uncategorized" }}
                </p>
              </article>
              <article class="border border-slate-800 bg-black/30 p-4">
                <p class="text-subtitle-2 uppercase text-slate-500">Published</p>
                <p class="mt-3 text-body-1 text-slate-200">{{ formattedDate }}</p>
              </article>
              <article class="border border-slate-800 bg-black/30 p-4">
                <p class="text-subtitle-2 uppercase text-slate-500">Protection</p>
                <p class="mt-3 text-body-1 text-slate-200">
                  {{ artwork.protection ? "Protected" : "Standard" }}
                </p>
              </article>
              <article class="border border-slate-800 bg-black/30 p-4">
                <p class="text-subtitle-2 uppercase text-slate-500">Favorites</p>
                <p class="mt-3 text-body-1 text-slate-200">{{ artwork.favoriteCount || 0 }}</p>
              </article>
            </div>

            <div class="mt-9">
              <p class="border-b border-slate-800 pb-3 text-subtitle-2 uppercase text-slate-500">
                Description
              </p>
              <p class="mt-5 text-body-1 leading-7 text-slate-400">
                {{ artwork.description || "No description has been provided for this artwork." }}
              </p>
            </div>

            <div class="mt-10 grid gap-3">
              <button
                type="button"
                class="h-14 bg-violet-600 text-body-1 uppercase text-slate-100 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="Boolean(favoriteLoading[artwork.id])"
                @click="toggleFavorite(artwork)"
              >
                {{
                  favoriteLoading[artwork.id]
                    ? "Updating..."
                    : artwork.isFavorite
                      ? "Remove from wishlist"
                      : "Add to wishlist"
                }}
              </button>
              <button
                v-if="!artwork.isSold"
                type="button"
                class="inline-flex min-h-12 items-center justify-center rounded-2xl border px-6 text-sm font-semibold transition"
                :class="
                  isInCart
                    ? 'border-[#F2C97D] bg-[#F2C97D]/10 text-[#F7D990]'
                    : 'border-[#24314F] bg-[#0C111D] text-[#E6EDF7] hover:border-[#4A6CF7]'
                "
                :disabled="cart.loading || isOwnArtwork"
                :title="isOwnArtwork ? 'Vous ne pouvez pas acheter votre propre œuvre.' : undefined"
                @click="toggleCart"
              >
                {{
                  cart.loading
                    ? "Mise à jour..."
                    : isOwnArtwork
                      ? "Votre œuvre — achat impossible"
                      : isInCart
                        ? "Retirer du panier"
                        : "Ajouter au panier"
                }}
              </button>
              <p
                v-else
                class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#3A1A1A] bg-[#1A0A0A] px-6 text-sm font-semibold text-[#F5A8A8]"
              >
                Cette oeuvre n'est plus disponible a l'achat
              </p>

              <button
                type="button"
                class="inline-flex min-h-12 items-center justify-center rounded-2xl border px-6 text-sm font-semibold transition"
                :class="
                  artwork.artist?.isFollowed
                    ? 'border-[#F2C97D] bg-[#F2C97D]/10 text-[#F7D990]'
                    : 'border-[#24314F] bg-[#0C111D] text-[#E6EDF7] hover:border-[#4A6CF7]'
                "
                :disabled="
                  !artwork.artist || Boolean(followLoading[artwork.artist?.id])
                "
                @click="artwork.artist && toggleFollow(artwork.artist)"
              >
                {{
                  cart.loading
                    ? "Mise à jour..."
                    : isOwnArtwork
                      ? "Votre œuvre — achat impossible"
                      : isInCart
                        ? "Retirer du panier"
                        : "Ajouter au panier"
                }}
              </button>
            </div>

            <div
              v-if="cartMessage || actionMessage"
              class="rounded-2xl border border-[#203357] bg-[#091121] px-5 py-4 text-sm text-[#BFD0FF]"
            >
              {{ cartMessage || actionMessage }}
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
                  <p class="mt-2 text-sm text-[#96A4B8]">
                    Utilise le bouton Favori pour la liste de souhaits. Ici, tu peux ranger l'oeuvre
                    dans une collection personnelle.
                  </p>
                </div>
                <NuxtLink
                  to="/wishlist?tab=collections"
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
                  <option
                    v-for="collection in personalCollections"
                    :key="collection.id"
                    :value="String(collection.id)"
                  >
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

              <p v-if="collectionMessage" class="text-sm text-[#BFD0FF]">
                {{ collectionMessage }}
              </p>
              <p
                v-if="!personalCollections.length && !collectionsLoading"
                class="text-sm text-[#96A4B8]"
              >
                Cree ta premiere collection pour organiser tes reperes.
              </p>
            </section>

            <section class="rounded-[28px] border border-[#151E30] bg-[#050912] p-6">
              <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">Artiste</p>
              <div v-if="artwork.artist" class="mt-4 grid gap-3">
                <p class="text-2xl font-semibold text-white">
                  {{ artwork.artist.displayName }}
                </p>
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

        <section class="mt-12 border border-slate-900 bg-slate-950/50 p-4 sm:mt-16 sm:p-8">
          <h2 class="text-title-3 uppercase text-slate-100 sm:text-title-2">More by this artist</h2>
          <div
            v-if="relatedArtworks.length"
            class="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <ArtworkCard
              v-for="related in relatedArtworks"
              :key="related.id"
              :artwork="related"
              :favorite-loading="Boolean(favoriteLoading[related.id])"
              :show-favorite-action="true"
              @toggle-favorite="toggleFavorite"
            />
          </div>
          <AppStatePanel
            v-else
            class="mt-7"
            type="empty"
            title="No related artworks"
            message="This artist has no other public artworks yet."
          />
        </section>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo, useHead, useRequestHeaders, useRoute, useRuntimeConfig } from "#app";
import ArtworkCard from "~/components/marketplace/ArtworkCard.vue";
import { useAnalyticsEvent } from "~/composables/useAnalyticsEvent";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";
import { useAuthStore } from "~/stores/auth";
import { useCartStore } from "~/stores/cart";
import {
  formatMarketplaceDate,
  formatMarketplacePrice,
  getArtistInitials,
  isArtworkOwnedByArtist
} from "~/utils/marketplace";

const route = useRoute();
const auth = useAuthStore();
const config = useRuntimeConfig();
const siteUrl = config.public.siteUrl.replace(/\/$/, "");
const cart = useCartStore();
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const collectionsLoading = ref(false);
const collectionSubmitLoading = ref(false);
const collectionMessage = ref("");
const cartMessage = ref("");
const selectedCollectionId = ref("");
const personalCollections = ref([]);

const { data, pending, error, refresh } = await useFetch(`/api/artworks/${route.params.id}`, {
  headers: requestHeaders,
  credentials: "include",
  default: () => ({
    artwork: null,
    relatedArtworks: []
  })
});

const artwork = computed(() => data.value?.artwork || null);
const relatedArtworks = computed(() => data.value?.relatedArtworks || []);

useHead({
  script: [
    {
      type: "application/ld+json",
      innerHTML: () => {
        if (!artwork.value) return "";

        const schema = {
          "@context": "https://schema.org",
          "@type": "Product",
          name: artwork.value.title,
          description: artwork.value.description || "Digital artwork available on Make It Art.",
          url: `${siteUrl}/artworks/${artwork.value.id}`,
          category: artwork.value.category?.name || "Digital artwork",
          brand: artwork.value.artist
            ? { "@type": "Person", name: artwork.value.artist.displayName }
            : undefined
        };

        if (Number.isFinite(Number(artwork.value.priceValue))) {
          schema.offers = {
            "@type": "Offer",
            url: `${siteUrl}/artworks/${artwork.value.id}`,
            priceCurrency: "EUR",
            price: Number(artwork.value.priceValue),
            // Purchasing isn't live yet on the Platform; PreOrder reflects that
            // honestly instead of falsely advertising InStock availability.
            availability: "https://schema.org/PreOrder"
          };
        }

        return JSON.stringify(schema);
      }
    }
  ]
});
const errorMessage = computed(() =>
  error.value
    ? error.value?.data?.message || "The artwork details are temporarily unavailable."
    : ""
);
const formattedPrice = computed(() =>
  formatMarketplacePrice(artwork.value?.priceValue ?? artwork.value?.price)
);
const formattedDate = computed(() => formatMarketplaceDate(artwork.value?.createdAt));
const showCollectorTools = computed(() => auth.user && !auth.isAdmin);
const isOwnArtwork = computed(() => isArtworkOwnedByArtist(artwork.value, auth.user));
const isInCart = computed(() =>
  Boolean(
    artwork.value?.id && cart.cart?.items?.some((item) => item.artworkId === artwork.value.id)
  )
);
const artworkInitials = computed(() => getArtistInitials(artwork.value?.title || "Artwork"));
const artistInitials = computed(() => getArtistInitials(artwork.value?.artist?.displayName));

const {
  actionMessage,
  actionStatus,
  canFollowArtist,
  favoriteLoading,
  followLoading,
  toggleFavorite,
  toggleFollow
} = useMarketplaceActions(auth);
const { trackEvent } = useAnalyticsEvent();

async function toggleCart() {
  cart.hydrate();

  if (!artwork.value?.id || artwork.value.isSold) {
    return;
  }
    return;
  }

  if (!auth.user) {
    await navigateTo("/login");
    return;
  }

  if (auth.isAdmin) {
    await navigateTo("/admin");
    return;
  }

  cartMessage.value = "";

  try {
    if (isInCart.value) {
      await cart.removeItem(artwork.value.id);
      cartMessage.value = "Œuvre retirée du panier.";
      return;
    }

    await cart.setItem(artwork.value.id, 1);
    cartMessage.value = "Œuvre ajoutée au panier.";
  } catch {
    cartMessage.value = cart.error || "Impossible de mettre à jour votre panier.";
  }
}

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

    personalCollections.value = (response.collections || []).filter(
      (collection) => !collection.isDefaultFavorites
    );
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
  if (artwork.value) {
    trackEvent("view_artwork", { artworkId: artwork.value.id });
  }

  if (artwork.value?.isSold && artwork.value?.id) {
    cart.removeArtwork(artwork.value.id);
  }

  if (!auth.user) {
    try {
      await auth.fetchCurrentUser();
      await refresh();
    } catch {
      // Public page: anonymous visitors are allowed.
    }
  }

  if (auth.user && !auth.isAdmin) {
    try {
      await cart.fetchCart();
    } catch {
      cartMessage.value = cart.error || "Impossible de charger votre panier.";
    }
  }

  await loadCollections();
});
</script>
