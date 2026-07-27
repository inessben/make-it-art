<template>
  <main class="min-h-screen bg-black px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
    <section class="mx-auto w-full max-w-[1360px]">
      <AppStatePanel
        v-if="pending"
        class="mt-8"
        type="loading"
        title="Loading artwork"
        message="Artwork details are being retrieved."
      />
      <AppStatePanel
        v-else-if="errorMessage"
        class="mt-8"
        type="error"
        title="Unable to load this artwork"
        :message="errorMessage"
        action-label="Try again"
        :action-disabled="pending"
        @action="refresh"
      />
      <AppStatePanel
        v-else-if="!artwork"
        class="mt-8"
        type="empty"
        title="Artwork not found"
        message="This artwork is no longer available in the public marketplace."
        action-label="Browse artworks"
        @action="navigateTo('/artworks')"
      />

      <template v-else>
        <AppStatePanel
          v-if="actionMessage"
          class="mt-8"
          compact
          :type="actionStatus || 'success'"
          :message="actionMessage"
        />
        <AppStatePanel
          v-if="cartMessage"
          class="mt-4"
          compact
          :type="cartMessageType"
          :message="cartMessage"
        />

        <section
          class="mt-8 grid gap-0 border border-[#161A1D] bg-[#111414] xl:grid-cols-[minmax(0,1.58fr)_minmax(360px,0.9fr)]"
        >
          <div class="border-b border-[#1C2022] xl:border-b-0 xl:border-r">
            <div
              class="relative h-full overflow-hidden bg-[#101515] min-h-[520px] lg:min-h-[760px]"
            >
              <img
                v-if="artworkImageUrl"
                :src="artworkImageUrl"
                :alt="artwork.title"
                class="block h-full min-h-[520px] w-full object-cover lg:min-h-[760px]"
              />
              <div
                v-else
                class="grid min-h-[520px] place-items-center bg-[radial-gradient(circle_at_50%_30%,rgba(115,43,255,0.28),transparent_45%),linear-gradient(180deg,#111616_0%,#06080C_100%)] p-6 text-center lg:min-h-[760px]"
              >
                <div class="max-w-sm">
                  <div
                    class="mx-auto grid h-24 w-24 place-items-center rounded-[20px] border border-violet-500/40 bg-black/60 text-3xl font-semibold text-violet-300"
                  >
                    {{ artworkInitials }}
                  </div>
                  <p class="mt-6 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {{ artwork.category?.name || "Digital artwork" }}
                  </p>
                  <p class="mt-4 text-base leading-7 text-slate-300">
                    The artwork record is online. A visual preview will appear here as soon as the
                    media file is available.
                  </p>
                </div>
              </div>

              <div class="absolute bottom-5 right-5 flex items-center gap-3">
                <a
                  v-if="artworkImageUrl"
                  :href="artworkImageUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-white/10 bg-black/45 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white/80 backdrop-blur transition hover:border-violet-500 hover:text-white"
                  aria-label="Open preview"
                >
                  Open
                </a>
                <button
                  type="button"
                  class="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-white/10 bg-black/45 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white/80 backdrop-blur transition hover:border-violet-500 hover:text-white"
                  aria-label="Share artwork"
                  @click="shareArtwork"
                >
                  Share
                </button>
              </div>
            </div>
          </div>

          <aside class="bg-[#171919] p-6 sm:p-8 xl:p-10">
            <div class="flex flex-col gap-5">
              <div class="flex flex-wrap gap-2">
                <span
                  class="rounded-full bg-[#4A6CF7]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#BCD0FF]"
                >
                  {{ artwork.category?.name || "Digital artwork" }}
                </span>
                <span
                  class="rounded-full bg-[#241D3D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#D8C8FF]"
                >
                  {{ formatArtworkLicenseType(artwork.licenseType) }}
                </span>
                <span
                  v-if="artwork.protection"
                  class="rounded-full bg-[#10261A] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#9DE2B4]"
                >
                  Protection active
                </span>
                <span
                  v-if="artwork.watermarkApplied"
                  class="rounded-full bg-[#1A2336] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#9FB4D9]"
                >
                  Watermarked preview
                </span>
                <span
                  v-if="availability.status !== 'AVAILABLE'"
                  class="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
                  :class="availabilityClass"
                >
                  {{ availability.label }}
                </span>
              </div>

              <div class="flex items-start justify-between gap-4">
                <div class="flex min-w-0 items-center gap-4">
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-violet-500/30 bg-[#0C1018] text-sm font-semibold text-violet-200"
                  >
                    <img
                      v-if="artwork.artist?.avatarUrl"
                      :src="artwork.artist.avatarUrl"
                      :alt="artwork.artist.displayName"
                      class="h-full w-full object-cover"
                    />
                    <template v-else>{{ artistInitials }}</template>
                  </div>

                  <div class="min-w-0">
                    <NuxtLink
                      v-if="artwork.artist"
                      :to="artistProfileRoute"
                      class="truncate text-[2rem] font-semibold text-white transition hover:text-violet-300"
                    >
                      {{ artwork.artist.displayName }}
                    </NuxtLink>
                    <p
                      class="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500"
                    >
                      {{ artistRoleLabel }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <button
                    v-if="artwork.artist && canFollowArtist(artwork.artist)"
                    type="button"
                    class="inline-flex min-h-10 items-center rounded-full border border-white/10 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-violet-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
              </div>

              <div>
                <h1
                  class="mt-4 break-words text-[clamp(2.6rem,6vw,4rem)] font-semibold uppercase leading-[0.94] tracking-[-0.04em] text-white"
                >
                  {{ artwork.title }}
                </h1>

                <div class="mt-4 flex flex-wrap items-end gap-3">
                  <p class="text-[clamp(2rem,4vw,2.8rem)] font-semibold text-slate-100">
                    {{ formattedPrice }}
                  </p>
                  <p class="pb-1 text-sm text-slate-500">
                    {{ availabilityText }}
                  </p>
                </div>
              </div>

              <div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <article
                  v-for="fact in artworkFacts"
                  :key="fact.label"
                  class="border border-white/10 bg-transparent p-5"
                >
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {{ fact.label }}
                  </p>
                  <p class="mt-4 text-lg font-medium text-slate-100">
                    {{ fact.value }}
                  </p>
                </article>
              </div>

              <div class="mt-2">
                <p
                  class="border-b border-white/10 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  Description
                </p>
                <p class="mt-5 text-base leading-8 text-slate-300">
                  {{ artwork.description || "No description has been provided for this artwork." }}
                </p>
              </div>

              <section
                v-if="artwork.management"
                class="mt-2 rounded-[28px] border border-[#293A66] bg-[#091121] p-6"
                aria-labelledby="artwork-management-title"
              >
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">
                      Espace propriétaire
                    </p>
                    <h2 id="artwork-management-title" class="mt-3 text-xl font-semibold text-white">
                      Gérer l’œuvre
                    </h2>
                  </div>
                  <span
                    class="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]"
                    :class="visibilityClass"
                  >
                    {{ visibilityPresentation.label }}
                  </span>
                </div>

                <p class="mt-4 text-sm leading-6 text-[#AFC0DA]">
                  Les autorisations sont vérifiées par le serveur selon les achats et paiements en
                  cours.
                </p>

                <ul class="mt-5 grid gap-3 sm:grid-cols-2" aria-label="Actions de gestion">
                  <li
                    v-for="item in managementActionSummary"
                    :key="item.key"
                    class="rounded-2xl border border-[#203357] bg-[#050912] p-4"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <span class="font-semibold text-white">{{ item.label }}</span>
                      <span
                        class="text-xs font-semibold uppercase tracking-[0.1em]"
                        :class="item.available ? 'text-[#9DE2B4]' : 'text-[#F7D990]'"
                      >
                        {{ item.available ? "Disponible" : "Indisponible" }}
                      </span>
                    </div>
                    <p v-if="!item.available" class="mt-2 text-sm text-[#AFC0DA]">
                      {{ item.reason }}
                    </p>
                  </li>
                </ul>

                <div class="mt-5 flex flex-wrap gap-3">
                  <button
                    v-if="artwork.management.capabilities.canHide"
                    ref="hideTrigger"
                    type="button"
                    class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#6F5C23] bg-[#2B220E] px-6 text-sm font-semibold text-[#F7D990] transition hover:border-[#A78931]"
                    @click="openHideDialog"
                  >
                    Masquer
                  </button>
                  <NuxtLink
                    v-if="artwork.management.capabilities.canEdit"
                    :to="`/artworks/${artwork.id}/edit`"
                    class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6D8BFF]"
                  >
                    Modifier l’œuvre
                  </NuxtLink>
                  <button
                    v-if="artwork.management.capabilities.canDelete"
                    ref="deleteTrigger"
                    type="button"
                    class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#7A3131] bg-[#2A1010] px-6 text-sm font-semibold text-[#FFB4B4] transition hover:border-[#B64747] hover:bg-[#3A1515]"
                    @click="openDeleteDialog"
                  >
                    Supprimer
                  </button>
                </div>
                <p
                  v-if="managementMessage"
                  class="mt-4 rounded-2xl border p-4 text-sm"
                  :class="
                    managementMessageTone === 'success'
                      ? 'border-[#24543A] bg-[#10261A] text-[#9DE2B4]'
                      : 'border-[#7A3131] bg-[#2A1010] text-[#FFB4B4]'
                  "
                  role="alert"
                >
                  {{ managementMessage }}
                </p>
              </section>

              <div class="mt-2 grid gap-3">
                <button
                  v-if="artwork.isAvailableForPurchase"
                  type="button"
                  class="inline-flex min-h-[62px] items-center justify-center rounded-[6px] bg-gradient-to-r from-[#6F2BFF] to-[#A046FF] px-6 text-base font-semibold uppercase tracking-[0.12em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="cart.loading || isOwnArtwork"
                  :title="isOwnArtwork ? 'You cannot buy your own artwork.' : undefined"
                  @click="toggleCart"
                >
                  {{
                    cart.loading
                      ? "Updating..."
                      : isOwnArtwork
                        ? "Your artwork - purchase unavailable"
                        : isInCart
                          ? "Remove from cart"
                          : "Add to cart"
                  }}
                </button>
                <p
                  v-else
                  class="inline-flex min-h-[62px] items-center justify-center rounded-[6px] border border-[#3A1A1A] bg-[#1A0A0A] px-6 text-base font-semibold uppercase tracking-[0.1em] text-[#F5A8A8]"
                >
                  {{ availabilityMessage }}
                </p>

                <button
                  type="button"
                  class="inline-flex min-h-[58px] items-center justify-center rounded-[6px] border border-white/10 px-6 text-base font-semibold uppercase tracking-[0.12em] text-white transition hover:border-violet-500 hover:bg-white/5"
                  @click="notifyOfferUnavailable"
                >
                  Make an offer
                </button>

                <div class="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    class="inline-flex min-h-[54px] items-center justify-center rounded-[6px] border border-white/10 px-5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:border-violet-500 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="Boolean(favoriteLoading[artwork.id])"
                    @click="toggleFavorite(artwork)"
                  >
                    {{
                      favoriteLoading[artwork.id]
                        ? "Updating..."
                        : artwork.isFavorite
                          ? "Saved to wishlist"
                          : "Add to wishlist"
                    }}
                  </button>

                  <a
                    v-if="artwork.hasHdFile && artwork.hdDownloadUrl"
                    :href="artwork.hdDownloadUrl"
                    class="inline-flex min-h-[54px] items-center justify-center rounded-[6px] border border-white/10 px-5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:border-violet-500 hover:bg-white/5"
                  >
                    Download HD
                  </a>
                </div>

                <p class="pt-2 text-sm leading-7 text-slate-500">
                  Public previews may be compressed{{
                    artwork.watermarkApplied ? " and watermarked" : ""
                  }}. The HD asset is reserved for the artist and verified buyers.
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section class="mt-12 border border-[#161A1D] bg-[#111414] p-5 sm:mt-16 sm:p-8">
          <h2 class="text-[clamp(2rem,5vw,3.2rem)] font-semibold uppercase leading-none text-white">
            More by this artist
          </h2>
          <div
            v-if="relatedArtworks.length"
            class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
          >
            <article
              v-for="related in relatedArtworks"
              :key="related.id"
              class="group border border-white/10 bg-[#111414] p-0"
            >
              <NuxtLink :to="`/artworks/${related.id}`" class="block">
                <div class="relative overflow-hidden bg-[#090C10]">
                  <img
                    v-if="related.imageUrl"
                    :src="related.imageUrl"
                    :alt="related.title"
                    class="aspect-[4/4.2] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                  <div
                    v-else
                    class="flex aspect-[4/4.2] items-center justify-center bg-[linear-gradient(180deg,#10151B_0%,#05070C_100%)] text-3xl font-semibold text-violet-200"
                  >
                    {{ relatedArtworkInitials(related) }}
                  </div>
                </div>
              </NuxtLink>

              <div class="flex items-start justify-between gap-3 px-4 pb-4 pt-3">
                <div class="min-w-0">
                  <NuxtLink
                    :to="`/artworks/${related.id}`"
                    class="block truncate text-base font-medium text-slate-100 transition hover:text-violet-300"
                  >
                    {{ related.title }}
                  </NuxtLink>
                  <p class="mt-1 text-sm text-slate-400">
                    {{ relatedArtworkPrice(related) }}
                  </p>
                </div>

                <button
                  type="button"
                  class="mt-1 text-slate-500 transition hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="Boolean(favoriteLoading[related.id])"
                  @click="toggleFavorite(related)"
                >
                  {{ related.isFavorite ? "Saved" : "Save" }}
                </button>
              </div>
            </article>
          </div>
          <AppStatePanel
            v-else
            class="mt-8"
            type="empty"
            title="No related artworks"
            message="This artist has no other public artworks yet."
          />
        </section>
      </template>
    </section>
  </main>

  <Teleport to="body">
    <div v-if="deleteDialogOpen" class="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <section
        class="w-full max-w-lg rounded-[28px] border border-[#7A3131] bg-[#090D18] p-6 shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-artwork-title"
        aria-describedby="delete-artwork-description"
        @keydown.esc.prevent.stop="closeDeleteDialog"
        @keydown.tab="trapDeleteDialogFocus"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF9E9E]">
          Action définitive
        </p>
        <h2 id="delete-artwork-title" class="mt-3 text-2xl font-semibold text-white">
          Supprimer « {{ artwork?.title }} » ?
        </h2>
        <p id="delete-artwork-description" class="mt-4 text-sm leading-6 text-[#B7C5DD]">
          Cette œuvre et ses médias seront supprimés définitivement. Cette action ne peut pas être
          annulée.
        </p>
        <div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref="deleteCancelButton"
            type="button"
            class="min-h-12 rounded-2xl border border-[#34415A] px-5 text-sm font-semibold text-white transition hover:border-[#61708E] disabled:opacity-50"
            :disabled="deletingArtwork"
            @click="closeDeleteDialog"
          >
            Annuler
          </button>
          <button
            ref="deleteConfirmButton"
            type="button"
            class="min-h-12 rounded-2xl bg-[#C84D4D] px-5 text-sm font-semibold text-white transition hover:bg-[#E15C5C] disabled:cursor-wait disabled:opacity-50"
            :disabled="deletingArtwork"
            @click="confirmArtworkDeletion"
          >
            {{ deletingArtwork ? "Suppression…" : "Supprimer définitivement" }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="hideDialogOpen" class="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <section
        class="w-full max-w-lg rounded-[28px] border border-[#6F5C23] bg-[#090D18] p-6 shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hide-artwork-title"
        aria-describedby="hide-artwork-description"
        @keydown.esc.prevent.stop="closeHideDialog"
        @keydown.tab="trapHideDialogFocus"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#F7D990]">
          Suspension de la publication
        </p>
        <h2 id="hide-artwork-title" class="mt-3 text-2xl font-semibold text-white">
          Masquer « {{ artwork?.title }} » ?
        </h2>
        <p id="hide-artwork-description" class="mt-4 text-sm leading-6 text-[#B7C5DD]">
          L’œuvre disparaîtra immédiatement des espaces publics et aucune nouvelle tentative d’achat
          ne sera acceptée. Les paiements déjà engagés et les droits acquis continueront
          normalement.
        </p>
        <div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref="hideCancelButton"
            type="button"
            class="min-h-12 rounded-2xl border border-[#34415A] px-5 text-sm font-semibold text-white transition hover:border-[#61708E] disabled:opacity-50"
            :disabled="hidingArtwork"
            @click="closeHideDialog"
          >
            Annuler
          </button>
          <button
            ref="hideConfirmButton"
            type="button"
            class="min-h-12 rounded-2xl bg-[#D2A83E] px-5 text-sm font-semibold text-black transition hover:bg-[#E7C25F] disabled:cursor-wait disabled:opacity-50"
            :disabled="hidingArtwork"
            @click="confirmArtworkHide"
          >
            {{ hidingArtwork ? "Masquage…" : "Masquer l’œuvre" }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { navigateTo, useHead, useRequestHeaders, useRoute, useRuntimeConfig } from "#app";
import { useAnalyticsEvent } from "~/composables/useAnalyticsEvent";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";
import { useAuthStore } from "~/stores/auth";
import { useCartStore } from "~/stores/cart";
import {
  formatArtworkLicenseType,
  formatArtworkManagementReason,
  formatMarketplaceDate,
  formatMarketplacePrice,
  getArtistInitials,
  getArtworkAvailabilityPresentation,
  getArtworkVisibilityPresentation,
  isArtworkOwnedByArtist
} from "~/utils/marketplace";

const route = useRoute();
const auth = useAuthStore();
const config = useRuntimeConfig();
const siteUrl = config.public.siteUrl.replace(/\/$/, "");
const cart = useCartStore();
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const cartMessage = ref("");
const cartMessageType = ref("success");
const managementMessage = ref("");
const managementMessageTone = ref("error");
const deleteDialogOpen = ref(false);
const deletingArtwork = ref(false);
const deleteTrigger = ref(null);
const deleteCancelButton = ref(null);
const deleteConfirmButton = ref(null);
const hideDialogOpen = ref(false);
const hidingArtwork = ref(false);
const hideTrigger = ref(null);
const hideCancelButton = ref(null);
const hideConfirmButton = ref(null);

function schemaAvailability(status) {
  const values = {
    AVAILABLE: "https://schema.org/InStock",
    RESERVED: "https://schema.org/LimitedAvailability",
    SOLD: "https://schema.org/SoldOut",
    UNAVAILABLE: "https://schema.org/OutOfStock"
  };

  return values[String(status || "").toUpperCase()] || values.UNAVAILABLE;
}

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
            availability: schemaAvailability(
              artwork.value.availabilityStatus ||
                (artwork.value.isAvailableForPurchase ? "AVAILABLE" : "UNAVAILABLE")
            )
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
const formattedDate = computed(() => formatMarketplaceDate(artwork.value?.createdAt));
const formattedPrice = computed(() =>
  formatMarketplacePrice(artwork.value?.priceValue ?? artwork.value?.price)
);
const availability = computed(() => getArtworkAvailabilityPresentation(artwork.value));
const visibilityPresentation = computed(() =>
  getArtworkVisibilityPresentation(artwork.value?.management?.lifecycle?.visibility)
);
const visibilityClass = computed(() => {
  const tones = {
    published: "border-[#24543A] bg-[#10261A] text-[#9DE2B4]",
    hidden: "border-[#5B4A1A] bg-[#2B220E] text-[#F7D990]",
    archived: "border-[#34415A] bg-[#1A2336] text-[#B7C5DD]"
  };
  return tones[visibilityPresentation.value.tone] || tones.published;
});
const managementActionSummary = computed(() => {
  const capabilities = artwork.value?.management?.capabilities;
  if (!capabilities) return [];

  return [
    ["edit", "Modifier", "canEdit"],
    ["delete", "Supprimer", "canDelete"],
    ["hide", "Masquer", "canHide"],
    ["publish", "Republier", "canPublish"],
    ["archive", "Archiver", "canArchive"],
    ["restore", "Restaurer", "canRestore"]
  ].map(([key, label, capability]) => ({
    key,
    label,
    available: Boolean(capabilities[capability]),
    reason: formatArtworkManagementReason(capabilities.reasons?.[key])
  }));
});
const availabilityClass = computed(() => {
  const tones = {
    available: "bg-[#10261A] text-[#9DE2B4]",
    reserved: "bg-[#2B220E] text-[#F7D990]",
    sold: "bg-[#3A1A1A] text-[#F5A8A8]",
    unavailable: "bg-[#1A2336] text-[#9FB4D9]"
  };

  return tones[availability.value.tone] || tones.unavailable;
});
const isOwnArtwork = computed(() => isArtworkOwnedByArtist(artwork.value, auth.user));
const isInCart = computed(() =>
  Boolean(
    artwork.value?.id && cart.cart?.items?.some((item) => item.artworkId === artwork.value.id)
  )
);
const artworkInitials = computed(() => getArtistInitials(artwork.value?.title || "Artwork"));
const artistInitials = computed(() => getArtistInitials(artwork.value?.artist?.displayName));
const artworkImageUrl = computed(
  () => artwork.value?.previewUrl || artwork.value?.imageUrl || artwork.value?.hdDownloadUrl || ""
);
const artistProfileRoute = computed(() =>
  artwork.value?.artist ? `/artists/${artwork.value.artist.id}` : "/artists"
);
const artistRoleLabel = computed(
  () =>
    (artwork.value?.artist?.verified ? "Master artist" : artwork.value?.artist?.artType) ||
    "Digital artist"
);
const availabilityText = computed(() => {
  if (isOwnArtwork.value) {
    return "owned by you";
  }

  const labels = {
    AVAILABLE: "available now",
    RESERVED: "payment in progress",
    SOLD: "sold",
    UNAVAILABLE: "currently unavailable"
  };

  return labels[availability.value.status] || "currently unavailable";
});
const availabilityMessage = computed(() => {
  if (availability.value.status === "RESERVED") {
    return "This artwork is temporarily reserved while a payment is being completed.";
  }

  if (availability.value.status === "SOLD") {
    return "This exclusive artwork has already been sold.";
  }

  return "This artwork is not currently available for purchase.";
});
const artworkFacts = computed(() => [
  {
    label: "Medium",
    value: artwork.value?.category?.name || artwork.value?.artist?.artType || "Digital artwork"
  },
  {
    label: "Published",
    value: formattedDate.value
  },
  {
    label: "License",
    value: formatArtworkLicenseType(artwork.value?.licenseType)
  },
  {
    label: "Delivery",
    value: artwork.value?.hasHdFile ? "HD file included" : "Preview only"
  },
  {
    label: "Protection",
    value: artwork.value?.protection ? "Protected" : "Standard"
  },
  {
    label: "Edition",
    value:
      Number(artwork.value?.stockQuantity || 0) > 1
        ? `Edition of ${artwork.value.stockQuantity}`
        : "Unique 1 of 1"
  }
]);

function relatedArtworkInitials(item) {
  return getArtistInitials(item?.artist?.displayName || item?.title || "Artwork");
}

function relatedArtworkPrice(item) {
  return formatMarketplacePrice(item?.priceValue ?? item?.price);
}

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

async function openDeleteDialog() {
  managementMessage.value = "";
  managementMessageTone.value = "error";
  deleteDialogOpen.value = true;
  await nextTick();
  deleteCancelButton.value?.focus();
}

async function openHideDialog() {
  managementMessage.value = "";
  managementMessageTone.value = "error";
  hideDialogOpen.value = true;
  await nextTick();
  hideCancelButton.value?.focus();
}

async function closeHideDialog() {
  if (hidingArtwork.value) return;
  hideDialogOpen.value = false;
  await nextTick();
  hideTrigger.value?.focus();
}

function trapHideDialogFocus(event) {
  const firstButton = hideCancelButton.value;
  const lastButton = hideConfirmButton.value;
  if (!firstButton || !lastButton) return;

  if (event.shiftKey && document.activeElement === firstButton) {
    event.preventDefault();
    lastButton.focus();
  } else if (!event.shiftKey && document.activeElement === lastButton) {
    event.preventDefault();
    firstButton.focus();
  }
}

async function confirmArtworkHide() {
  const expectedVersion = artwork.value?.management?.lifecycle?.version;
  if (!artwork.value?.id || !expectedVersion || hidingArtwork.value) return;

  hidingArtwork.value = true;
  managementMessage.value = "";

  try {
    const csrf = await $fetch("/api/v1/security/csrf-token", { credentials: "include" });
    const response = await $fetch(`/api/artists/me/artworks/${artwork.value.id}/hide`, {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": csrf.csrfToken },
      body: { expectedVersion }
    });
    data.value = { ...data.value, artwork: response.artwork };
    cart.removeArtwork(response.artwork.id);
    hideDialogOpen.value = false;
    managementMessageTone.value = "success";
    managementMessage.value = response.message;
  } catch (hideError) {
    hideDialogOpen.value = false;
    managementMessageTone.value = "error";
    managementMessage.value =
      hideError?.data?.message || "Impossible de masquer cette œuvre pour le moment.";
    await refresh();
  } finally {
    hidingArtwork.value = false;
  }
}

async function closeDeleteDialog() {
  if (deletingArtwork.value) return;
  deleteDialogOpen.value = false;
  await nextTick();
  deleteTrigger.value?.focus();
}

function trapDeleteDialogFocus(event) {
  const firstButton = deleteCancelButton.value;
  const lastButton = deleteConfirmButton.value;
  if (!firstButton || !lastButton) return;

  if (event.shiftKey && document.activeElement === firstButton) {
    event.preventDefault();
    lastButton.focus();
  } else if (!event.shiftKey && document.activeElement === lastButton) {
    event.preventDefault();
    firstButton.focus();
  }
}

async function confirmArtworkDeletion() {
  const expectedVersion = artwork.value?.management?.lifecycle?.version;
  if (!artwork.value?.id || !expectedVersion || deletingArtwork.value) return;

  deletingArtwork.value = true;
  managementMessage.value = "";

  try {
    const csrf = await $fetch("/api/v1/security/csrf-token", { credentials: "include" });
    await $fetch(`/api/artists/me/artworks/${artwork.value.id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "x-csrf-token": csrf.csrfToken },
      body: { expectedVersion }
    });
    await navigateTo({ path: "/artist-profile", query: { artworkDeleted: "1" } });
  } catch (deleteError) {
    deleteDialogOpen.value = false;
    managementMessage.value =
      deleteError?.data?.message || "Impossible de supprimer cette œuvre pour le moment.";
    await refresh();
    await nextTick();
    deleteTrigger.value?.focus();
  } finally {
    deletingArtwork.value = false;
  }
}

async function toggleCart() {
  cart.hydrate();

  if (!artwork.value?.id || !artwork.value.isAvailableForPurchase) {
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
      cartMessage.value = "Artwork removed from cart.";
      cartMessageType.value = "success";
      return;
    }

    await cart.setItem(artwork.value.id, 1);
    cartMessage.value = "Artwork added to cart.";
    cartMessageType.value = "success";
  } catch {
    cartMessage.value = cart.error || "Unable to update your cart.";
    cartMessageType.value = "error";
  }
}

async function shareArtwork() {
  if (!artwork.value) {
    return;
  }

  const url = `${siteUrl}/artworks/${artwork.value.id}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: artwork.value.title,
        text: artwork.value.description || "Discover this artwork on Make It Art.",
        url
      });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      actionMessage.value = "Artwork link copied to clipboard.";
      actionStatus.value = "success";
    }

    trackEvent("share_artwork", { artworkId: artwork.value.id });
  } catch {
    // Ignore share cancellations.
  }
}

function notifyOfferUnavailable() {
  actionMessage.value = "Offer requests are not enabled yet for this artwork.";
  actionStatus.value = "error";
}

onMounted(async () => {
  if (artwork.value) {
    trackEvent("view_artwork", { artworkId: artwork.value.id });
  }

  if (artwork.value && !artwork.value.isAvailableForPurchase && artwork.value.id) {
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
      cartMessage.value = cart.error || "Unable to load your cart.";
      cartMessageType.value = "error";
    }
  }
});
</script>
