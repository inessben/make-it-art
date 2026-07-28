<template>
  <main
    class="artwork-page min-h-screen bg-black px-4 py-8 text-slate-100 sm:px-8 sm:py-12 lg:px-10"
  >
    <section class="mx-auto w-full max-w-[1360px]">
      <AppStatePanel
        v-if="pending"
        class="mt-4"
        type="loading"
        title="Loading artwork"
        message="Artwork details are being retrieved."
      />
      <AppStatePanel
        v-else-if="errorMessage"
        class="mt-4"
        type="error"
        title="Unable to load this artwork"
        :message="errorMessage"
        action-label="Try again"
        :action-disabled="pending"
        @action="refresh"
      />
      <AppStatePanel
        v-else-if="!artwork"
        class="mt-4"
        type="empty"
        title="Artwork not found"
        message="This artwork is no longer available in the public marketplace."
        action-label="Browse artworks"
        @action="navigateTo('/artworks')"
      />

      <template v-else>
        <AppStatePanel
          v-if="actionMessage"
          class="mb-6"
          compact
          :type="actionStatus || 'success'"
          :message="actionMessage"
        />
        <AppStatePanel
          v-if="cartMessage"
          class="mb-6"
          compact
          :type="cartMessageType"
          :message="cartMessage"
        />

        <section
          class="artwork-hero grid overflow-hidden border border-[#161A1D] bg-[#111414] lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]"
        >
          <div class="relative border-b border-[#1C2022] bg-[#101515] lg:border-b-0 lg:border-r">
            <div
              class="relative aspect-square w-full overflow-hidden lg:aspect-auto lg:h-full lg:min-h-[640px]"
            >
              <ProtectedArtworkMedia
                v-if="artworkImageUrl"
                :src="artworkImageUrl"
                :alt="artwork.title"
                :artwork-id="artwork.id"
                img-class="h-full w-full object-cover"
                class="absolute inset-0 h-full w-full"
              />
              <div
                v-else
                class="grid h-full min-h-[420px] place-items-center bg-[radial-gradient(circle_at_50%_30%,rgba(115,43,255,0.22),transparent_45%),linear-gradient(180deg,#111616_0%,#06080C_100%)] p-6 text-center lg:min-h-[640px]"
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
                    A visual preview will appear here as soon as the media file is available.
                  </p>
                </div>
              </div>

              <div class="absolute bottom-5 right-5 z-10 flex items-center gap-3">
                <button
                  v-if="artworkImageUrl"
                  type="button"
                  class="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-white/10 bg-black/45 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white/80 backdrop-blur transition hover:border-violet-500 hover:text-white"
                  @click="openProtectedPreview"
                >
                  Open
                </button>
                <button
                  type="button"
                  class="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-white/10 bg-black/45 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white/80 backdrop-blur transition hover:border-violet-500 hover:text-white"
                  @click="shareArtwork"
                >
                  Share
                </button>
              </div>
            </div>
          </div>

          <aside class="flex flex-col gap-5 bg-[#171919] p-6 sm:p-8 xl:p-10">
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
                    class="block truncate text-[1.75rem] font-semibold leading-none text-white transition hover:text-violet-300 sm:text-[2rem]"
                  >
                    {{ artwork.artist.displayName }}
                  </NuxtLink>
                  <p class="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {{ artistRoleLabel }}
                  </p>
                </div>
              </div>

              <button
                v-if="artwork.artist && canFollowArtist(artwork.artist)"
                type="button"
                class="inline-flex min-h-10 shrink-0 items-center rounded-full border border-white/10 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-violet-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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

            <div>
              <h1
                class="break-words text-[clamp(2.4rem,5.5vw,3.6rem)] font-semibold uppercase leading-[0.94] tracking-[-0.04em] text-white"
              >
                {{ artwork.title }}
              </h1>
              <div class="mt-4 flex flex-wrap items-end gap-3">
                <p class="text-[clamp(1.85rem,3.5vw,2.6rem)] font-semibold text-slate-100">
                  {{ formattedPrice }}
                </p>
                <p class="pb-1 text-sm text-slate-500">{{ availabilityText }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <article
                v-for="fact in artworkFacts"
                :key="fact.label"
                class="border border-white/10 bg-transparent p-4 sm:p-5"
              >
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {{ fact.label }}
                </p>
                <p class="mt-3 text-base font-medium text-slate-100 sm:text-lg">
                  {{ fact.value }}
                </p>
              </article>
            </div>

            <div>
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
              v-if="artwork.management || isOwnArtwork"
              class="mt-2 border border-white/10 bg-[#111414] px-4 py-4 sm:px-5"
              aria-labelledby="artwork-management-title"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-3">
                  <h2
                    id="artwork-management-title"
                    class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"
                  >
                    Gérer l’œuvre
                  </h2>
                  <span
                    v-if="artwork.management"
                    class="rounded-[4px] border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em]"
                    :class="visibilityClass"
                  >
                    {{ visibilityPresentation.label }}
                  </span>
                </div>
                <p class="text-xs text-slate-500">Actions réservées au propriétaire</p>
              </div>

              <div class="mt-4 flex flex-wrap gap-2" aria-label="Actions de gestion">
                <NuxtLink
                  v-if="!artwork.management || artwork.management.capabilities?.canEdit !== false"
                  :to="`/artworks/${artwork.id}/edit`"
                  class="inline-flex min-h-10 items-center justify-center rounded-[6px] border border-violet-500/60 bg-violet-500/10 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-violet-100 transition hover:border-violet-400 hover:bg-violet-500/20"
                  aria-label="Modifier l’œuvre"
                >
                  Modifier
                </NuxtLink>
                <button
                  v-if="artwork.management?.capabilities?.canHide"
                  ref="hideTrigger"
                  type="button"
                  class="inline-flex min-h-10 items-center justify-center rounded-[6px] border border-[#6F5C23] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#F7D990] transition hover:border-[#A78931] hover:bg-[#2B220E]"
                  @click="openHideDialog"
                >
                  Masquer
                </button>
                <button
                  v-if="artwork.management?.capabilities?.canPublish"
                  type="button"
                  class="inline-flex min-h-10 items-center justify-center rounded-[6px] border border-violet-500/60 bg-violet-500/10 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-violet-100 transition hover:border-violet-400 hover:bg-violet-500/20 disabled:cursor-wait disabled:opacity-50"
                  :disabled="publishingArtwork"
                  @click="confirmArtworkPublish"
                >
                  {{ publishingArtwork ? "Republication…" : "Republier" }}
                </button>
                <button
                  v-if="artwork.management?.capabilities?.canArchive"
                  ref="archiveTrigger"
                  type="button"
                  class="inline-flex min-h-10 items-center justify-center rounded-[6px] border border-white/15 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 transition hover:border-slate-500 hover:bg-white/5 hover:text-white"
                  @click="openArchiveDialog"
                >
                  Archiver
                </button>
                <button
                  v-if="artwork.management?.capabilities?.canRestore"
                  ref="restoreTrigger"
                  type="button"
                  class="inline-flex min-h-10 items-center justify-center rounded-[6px] border border-violet-500/60 bg-violet-500/10 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-violet-100 transition hover:border-violet-400 hover:bg-violet-500/20"
                  @click="openRestoreDialog"
                >
                  Restaurer
                </button>
                <button
                  v-if="!artwork.management || artwork.management.capabilities?.canDelete !== false"
                  ref="deleteTrigger"
                  type="button"
                  class="inline-flex min-h-10 items-center justify-center rounded-[6px] border border-[#7A3131] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#FFB4B4] transition hover:border-[#B64747] hover:bg-[#2A1010]"
                  @click="openDeleteDialog"
                >
                  Supprimer
                </button>
              </div>

              <details
                v-if="blockedManagementActions.length"
                class="group mt-3 border-t border-white/10 pt-3"
              >
                <summary
                  class="flex cursor-pointer list-none items-center justify-between gap-3 text-xs text-slate-500 transition hover:text-slate-300 [&::-webkit-details-marker]:hidden"
                >
                  <span>Voir les actions indisponibles</span>
                  <span
                    class="text-base leading-none transition group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <ul class="mt-3 grid gap-2">
                  <li
                    v-for="item in blockedManagementActions"
                    :key="item.key"
                    class="grid gap-1 text-xs sm:grid-cols-[7rem_1fr] sm:gap-3"
                  >
                    <span class="font-semibold text-slate-300">{{ item.label }}</span>
                    <span class="leading-5 text-slate-500">{{ item.reason }}</span>
                  </li>
                </ul>
              </details>

              <p
                v-if="managementMessage"
                class="mt-3 border px-3 py-2 text-sm"
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
              <div
                v-else
                class="group relative rounded-[6px] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
                tabindex="0"
                :aria-describedby="`purchase-unavailable-${artwork.id}`"
              >
                <button
                  type="button"
                  class="inline-flex min-h-[62px] w-full cursor-not-allowed items-center justify-center rounded-[6px] border border-white/10 bg-white/[0.04] px-6 text-base font-semibold uppercase tracking-[0.12em] text-slate-500"
                  disabled
                  aria-disabled="true"
                >
                  {{ unavailablePurchaseLabel }}
                </button>
                <span
                  :id="`purchase-unavailable-${artwork.id}`"
                  role="tooltip"
                  class="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-20 w-max max-w-[min(18rem,calc(100vw-3rem))] -translate-x-1/2 rounded-[6px] border border-white/10 bg-[#090C10] px-3 py-2 text-center text-xs font-medium normal-case tracking-normal text-slate-200 opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus:opacity-100"
                >
                  {{ availabilityMessage }}
                </span>
              </div>

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
              class="group border border-white/10 bg-[#111414]"
            >
              <NuxtLink :to="`/artworks/${related.id}`" class="block">
                <div class="relative overflow-hidden bg-[#090C10]">
                  <ProtectedArtworkMedia
                    v-if="related.imageUrl"
                    :src="related.imageUrl"
                    :alt="related.title"
                    :artwork-id="related.id"
                    img-class="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    class="block"
                  />
                  <div
                    v-else
                    class="flex aspect-square items-center justify-center bg-[linear-gradient(180deg,#10151B_0%,#05070C_100%)] text-3xl font-semibold text-violet-200"
                  >
                    {{ relatedArtworkInitials(related) }}
                  </div>
                </div>
              </NuxtLink>

              <div class="flex items-start justify-between gap-3 px-4 pb-4 pt-3">
                <div class="min-w-0">
                  <NuxtLink
                    :to="`/artworks/${related.id}`"
                    class="block truncate text-base font-medium uppercase text-slate-100 transition hover:text-violet-300"
                  >
                    {{ related.title }}
                  </NuxtLink>
                  <p class="mt-1 text-sm text-slate-400">
                    {{ relatedArtworkPrice(related) }}
                  </p>
                </div>
                <button
                  type="button"
                  class="mt-1 text-sm text-slate-500 transition hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
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
    <div
      v-if="protectedPreviewOpen && artworkImageUrl"
      class="fixed inset-0 z-[60] grid place-items-center bg-black/92 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Protected artwork preview"
      @keydown.esc.prevent.stop="closeProtectedPreview"
    >
      <button
        type="button"
        class="absolute inset-0 cursor-zoom-out"
        aria-label="Close protected preview"
        @click="closeProtectedPreview"
      />
      <div class="relative z-[1] grid w-full max-w-5xl gap-4" @click.stop>
        <div class="flex items-center justify-between gap-4">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Protected preview · AI training prohibited
          </p>
          <button
            ref="protectedPreviewCloseButton"
            type="button"
            class="inline-flex min-h-10 items-center justify-center rounded-[8px] border border-white/15 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-violet-400"
            @click="closeProtectedPreview"
          >
            Close
          </button>
        </div>
        <div
          class="overflow-hidden rounded-[12px] border border-white/10 bg-[#050505]"
          @contextmenu.prevent
          @dragstart.prevent
        >
          <ProtectedArtworkMedia
            :src="artworkImageUrl"
            :alt="artwork?.title || 'Artwork preview'"
            :artwork-id="artwork?.id"
            img-class="max-h-[min(78vh,860px)] w-full object-contain"
            class="block w-full"
          />
        </div>
        <p class="text-center text-xs leading-5 text-slate-500">
          Preview is watermarked and shielded. Saving, scraping and AI training use are prohibited.
        </p>
      </div>
    </div>
  </Teleport>

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

  <Teleport to="body">
    <div
      v-if="archiveDialogOpen"
      class="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
    >
      <section
        class="w-full max-w-lg rounded-[28px] border border-[#43516B] bg-[#090D18] p-6 shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-artwork-title"
        aria-describedby="archive-artwork-description"
        @keydown.esc.prevent.stop="closeArchiveDialog"
        @keydown.tab="trapArchiveDialogFocus"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#AFC0DA]">
          Conservation de l’historique
        </p>
        <h2 id="archive-artwork-title" class="mt-3 text-2xl font-semibold text-white">
          Archiver « {{ artwork?.title }} » ?
        </h2>
        <p id="archive-artwork-description" class="mt-4 text-sm leading-6 text-[#B7C5DD]">
          L’œuvre sera retirée du portfolio actif et des espaces publics. Ses ventes, droits,
          fichiers nécessaires et autres données commerciales seront conservés.
        </p>
        <div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref="archiveCancelButton"
            type="button"
            class="min-h-12 rounded-2xl border border-[#34415A] px-5 text-sm font-semibold text-white transition hover:border-[#61708E] disabled:opacity-50"
            :disabled="archivingArtwork"
            @click="closeArchiveDialog"
          >
            Annuler
          </button>
          <button
            ref="archiveConfirmButton"
            type="button"
            class="min-h-12 rounded-2xl bg-[#687A9B] px-5 text-sm font-semibold text-white transition hover:bg-[#7D91B5] disabled:cursor-wait disabled:opacity-50"
            :disabled="archivingArtwork"
            @click="confirmArtworkArchive"
          >
            {{ archivingArtwork ? "Archivage…" : "Archiver l’œuvre" }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="restoreDialogOpen"
      class="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
    >
      <section
        class="w-full max-w-lg rounded-[28px] border border-[#293A66] bg-[#090D18] p-6 shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-artwork-title"
        aria-describedby="restore-artwork-description"
        @keydown.esc.prevent.stop="closeRestoreDialog"
        @keydown.tab="trapRestoreDialogFocus"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#8AA2FF]">
          Retour dans l’espace de travail
        </p>
        <h2 id="restore-artwork-title" class="mt-3 text-2xl font-semibold text-white">
          Restaurer « {{ artwork?.title }} » ?
        </h2>
        <p id="restore-artwork-description" class="mt-4 text-sm leading-6 text-[#B7C5DD]">
          L’œuvre rejoindra vos œuvres masquées. Elle restera privée et ne reviendra pas dans le
          catalogue tant que vous ne choisirez pas séparément « Republier ».
        </p>
        <div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref="restoreCancelButton"
            type="button"
            class="min-h-12 rounded-2xl border border-[#34415A] px-5 text-sm font-semibold text-white transition hover:border-[#61708E] disabled:opacity-50"
            :disabled="restoringArtwork"
            @click="closeRestoreDialog"
          >
            Annuler
          </button>
          <button
            ref="restoreConfirmButton"
            type="button"
            class="min-h-12 rounded-2xl bg-[#4A6CF7] px-5 text-sm font-semibold text-black transition hover:bg-[#6D8BFF] disabled:cursor-wait disabled:opacity-50"
            :disabled="restoringArtwork"
            @click="confirmArtworkRestore"
          >
            {{ restoringArtwork ? "Restauration…" : "Restaurer comme masquée" }}
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
import { useScreenshotGuard } from "~/composables/useScreenshotGuard";
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

useScreenshotGuard();

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
const protectedPreviewOpen = ref(false);
const protectedPreviewCloseButton = ref(null);
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
const publishingArtwork = ref(false);
const archiveDialogOpen = ref(false);
const archivingArtwork = ref(false);
const archiveTrigger = ref(null);
const archiveCancelButton = ref(null);
const archiveConfirmButton = ref(null);
const restoreDialogOpen = ref(false);
const restoringArtwork = ref(false);
const restoreTrigger = ref(null);
const restoreCancelButton = ref(null);
const restoreConfirmButton = ref(null);

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
const blockedManagementActions = computed(() =>
  managementActionSummary.value.filter((item) => !item.available)
);
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
    return "Payment in progress. Try again shortly.";
  }

  if (availability.value.status === "SOLD") {
    return "This artwork has already been sold.";
  }

  return "This artwork is currently unavailable.";
});
const unavailablePurchaseLabel = computed(() => {
  if (availability.value.status === "SOLD") return "Sold";
  if (availability.value.status === "UNAVAILABLE") return "Unavailable";

  return "Add to cart";
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
    value: artwork.value?.isUnlimited
      ? "Unlimited edition"
      : Number(artwork.value?.stockQuantity || 0) > 1
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

  if (!artwork.value?.management?.lifecycle?.version) {
    await hydrateOwnerManagement();
  }

  if (!artwork.value?.management?.lifecycle?.version) {
    managementMessage.value = "Impossible de préparer la suppression de cette œuvre.";
    return;
  }

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

async function confirmArtworkPublish() {
  const expectedVersion = artwork.value?.management?.lifecycle?.version;
  if (!artwork.value?.id || !expectedVersion || publishingArtwork.value) return;

  publishingArtwork.value = true;
  managementMessage.value = "";

  try {
    const csrf = await $fetch("/api/v1/security/csrf-token", { credentials: "include" });
    const response = await $fetch(`/api/artists/me/artworks/${artwork.value.id}/publish`, {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": csrf.csrfToken },
      body: { expectedVersion }
    });
    data.value = { ...data.value, artwork: response.artwork };
    managementMessageTone.value = "success";
    managementMessage.value = response.message;
  } catch (publishError) {
    managementMessageTone.value = "error";
    managementMessage.value =
      publishError?.data?.message || "Impossible de republier cette œuvre pour le moment.";
    await refresh();
  } finally {
    publishingArtwork.value = false;
  }
}

async function openArchiveDialog() {
  managementMessage.value = "";
  managementMessageTone.value = "error";
  archiveDialogOpen.value = true;
  await nextTick();
  archiveCancelButton.value?.focus();
}

async function closeArchiveDialog() {
  if (archivingArtwork.value) return;
  archiveDialogOpen.value = false;
  await nextTick();
  archiveTrigger.value?.focus();
}

function trapArchiveDialogFocus(event) {
  const firstButton = archiveCancelButton.value;
  const lastButton = archiveConfirmButton.value;
  if (!firstButton || !lastButton) return;

  if (event.shiftKey && document.activeElement === firstButton) {
    event.preventDefault();
    lastButton.focus();
  } else if (!event.shiftKey && document.activeElement === lastButton) {
    event.preventDefault();
    firstButton.focus();
  }
}

async function confirmArtworkArchive() {
  const expectedVersion = artwork.value?.management?.lifecycle?.version;
  if (!artwork.value?.id || !expectedVersion || archivingArtwork.value) return;

  archivingArtwork.value = true;
  managementMessage.value = "";

  try {
    const csrf = await $fetch("/api/v1/security/csrf-token", { credentials: "include" });
    const response = await $fetch(`/api/artists/me/artworks/${artwork.value.id}/archive`, {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": csrf.csrfToken },
      body: { expectedVersion }
    });
    data.value = { ...data.value, artwork: response.artwork };
    cart.removeArtwork(response.artwork.id);
    archiveDialogOpen.value = false;
    managementMessageTone.value = "success";
    managementMessage.value = response.message;
  } catch (archiveError) {
    archiveDialogOpen.value = false;
    managementMessageTone.value = "error";
    managementMessage.value =
      archiveError?.data?.message || "Impossible d’archiver cette œuvre pour le moment.";
    await refresh();
  } finally {
    archivingArtwork.value = false;
  }
}

async function openRestoreDialog() {
  managementMessage.value = "";
  managementMessageTone.value = "error";
  restoreDialogOpen.value = true;
  await nextTick();
  restoreCancelButton.value?.focus();
}

async function closeRestoreDialog() {
  if (restoringArtwork.value) return;
  restoreDialogOpen.value = false;
  await nextTick();
  restoreTrigger.value?.focus();
}

function trapRestoreDialogFocus(event) {
  const firstButton = restoreCancelButton.value;
  const lastButton = restoreConfirmButton.value;
  if (!firstButton || !lastButton) return;

  if (event.shiftKey && document.activeElement === firstButton) {
    event.preventDefault();
    lastButton.focus();
  } else if (!event.shiftKey && document.activeElement === lastButton) {
    event.preventDefault();
    firstButton.focus();
  }
}

async function confirmArtworkRestore() {
  const expectedVersion = artwork.value?.management?.lifecycle?.version;
  if (!artwork.value?.id || !expectedVersion || restoringArtwork.value) return;

  restoringArtwork.value = true;
  managementMessage.value = "";

  try {
    const csrf = await $fetch("/api/v1/security/csrf-token", { credentials: "include" });
    const response = await $fetch(`/api/artists/me/artworks/${artwork.value.id}/restore`, {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": csrf.csrfToken },
      body: { expectedVersion }
    });
    data.value = { ...data.value, artwork: response.artwork };
    restoreDialogOpen.value = false;
    managementMessageTone.value = "success";
    managementMessage.value = response.message;
  } catch (restoreError) {
    restoreDialogOpen.value = false;
    managementMessageTone.value = "error";
    managementMessage.value =
      restoreError?.data?.message || "Impossible de restaurer cette œuvre pour le moment.";
    await refresh();
  } finally {
    restoringArtwork.value = false;
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

async function openProtectedPreview() {
  if (!artworkImageUrl.value) {
    return;
  }

  protectedPreviewOpen.value = true;
  await nextTick();
  protectedPreviewCloseButton.value?.focus();
  trackEvent("open_protected_preview", { artworkId: artwork.value?.id });
}

function closeProtectedPreview() {
  protectedPreviewOpen.value = false;
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

  try {
    if (!auth.user) {
      await auth.fetchCurrentUser();
    }
  } catch {
    // Public page: anonymous visitors are allowed.
  }

  await hydrateOwnerManagement();

  if (auth.user && !auth.isAdmin) {
    try {
      await cart.fetchCart();
    } catch {
      cartMessage.value = cart.error || "Unable to load your cart.";
      cartMessageType.value = "error";
    }
  }
});

async function hydrateOwnerManagement() {
  if (!artwork.value?.id || !auth.user || auth.isAdmin) {
    return;
  }

  const ownsArtwork = isArtworkOwnedByArtist(artwork.value, auth.user);
  if (!ownsArtwork && !auth.isVerifiedArtist && !auth.isArtist) {
    return;
  }

  // Private endpoint is the source of truth for owner capabilities.
  try {
    const response = await $fetch(`/api/artists/me/artworks/${artwork.value.id}`, {
      credentials: "include"
    });

    if (!response?.artwork) {
      return;
    }

    data.value = {
      ...(data.value || { relatedArtworks: [] }),
      artwork: {
        ...artwork.value,
        ...response.artwork
      },
      relatedArtworks: data.value?.relatedArtworks || []
    };
  } catch {
    if (ownsArtwork && !artwork.value.management) {
      try {
        await refresh();
      } catch {
        // Keep public payload.
      }
    }
  }
}
</script>
