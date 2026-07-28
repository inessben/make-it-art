<template>
  <ArtistShell
    eyebrow="Artist workspace"
    title="Artist public profile"
    description="Manage your public identity, visual assets and published portfolio."
  >
    <p
      v-if="deletionSuccessMessage"
      class="rounded-2xl border border-emerald-700/60 bg-emerald-950/40 p-4 text-sm text-emerald-200"
      role="status"
    >
      {{ deletionSuccessMessage }}
    </p>

    <section
      v-if="loading"
      class="rounded-[24px] border border-slate-800 bg-violet-950 p-6 text-slate-400"
    >
      Loading your artist workspace...
    </section>

    <section
      v-else-if="missingArtist"
      class="grid gap-5 rounded-[24px] border border-slate-800 bg-violet-950 p-7"
    >
      <div>
        <p class="text-xs uppercase tracking-widest text-violet-700">Artist profile</p>
        <h1 class="mt-4 text-3xl font-semibold text-white">No artist profile yet</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Create your artist profile to start publishing your portfolio.
        </p>
      </div>
      <NuxtLink
        to="/become-artist"
        class="inline-flex w-fit items-center justify-center rounded-2xl bg-violet-700 px-6 py-3 text-sm font-semibold text-black transition hover:bg-violet-600"
      >
        Become an artist
      </NuxtLink>
    </section>

    <section
      v-else-if="pendingApplication"
      class="grid gap-6 rounded-[24px] border border-slate-800 bg-violet-950 p-7"
    >
      <div>
        <p class="text-xs uppercase tracking-widest text-violet-700">Artist application</p>
        <h1 class="mt-4 text-3xl font-semibold text-white">Your application is under review</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Your agreement has been signed and submitted to the administration. Your artist profile
          will become active once the application is approved.
        </p>
      </div>

      <dl class="grid gap-3 rounded-[24px] border border-slate-800 bg-slate-950 p-5 text-sm">
        <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
          <dt class="text-slate-400">Artist name</dt>
          <dd class="font-semibold text-white">
            {{ pendingApplication.payload?.displayName || userNameFallback }}
          </dd>
        </div>
        <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
          <dt class="text-slate-400">Status</dt>
          <dd class="font-semibold text-amber-300">Awaiting admin approval</dd>
        </div>
        <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
          <dt class="text-slate-400">Submission date</dt>
          <dd class="font-semibold text-white">
            {{ formatDate(pendingApplication.submittedAt) }}
          </dd>
        </div>
      </dl>

      <div class="flex flex-wrap gap-3">
        <a
          href="/api/artists/me/contract.pdf"
          target="_blank"
          rel="noreferrer"
          class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-violet-700 px-6 text-sm font-semibold text-black transition hover:bg-violet-600"
        >
          Open PDF agreement
        </a>
        <NuxtLink
          to="/become-artist"
          class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-850 px-6 text-sm font-semibold text-slate-100 transition hover:bg-slate-750"
        >
          View application
        </NuxtLink>
      </div>
    </section>

    <section
      v-else-if="rejectedApplication"
      class="grid gap-6 rounded-[24px] border border-amber-900 bg-amber-950 p-7"
    >
      <div>
        <p class="text-xs uppercase tracking-widest text-amber-300">Application rejected</p>
        <h1 class="mt-4 text-3xl font-semibold text-white">Your application needs changes</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-amber-200">
          The administration did not activate your artist profile. Update your information, review
          the agreement and submit a new application.
        </p>
        <p v-if="rejectedApplication.reviewNote" class="mt-4 text-sm leading-6 text-amber-100">
          Admin note: {{ rejectedApplication.reviewNote }}
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <NuxtLink
          to="/become-artist"
          class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-violet-700 px-6 text-sm font-semibold text-black transition hover:bg-violet-600"
        >
          Update and resubmit
        </NuxtLink>
        <a
          v-if="rejectedApplication.hasContractPdf"
          href="/api/artists/me/contract.pdf"
          target="_blank"
          rel="noreferrer"
          class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-850 px-6 text-sm font-semibold text-slate-100 transition hover:bg-slate-750"
        >
          Review PDF agreement
        </a>
      </div>
    </section>

    <section
      v-else-if="errorMessage"
      class="rounded-[24px] border border-red-900 bg-red-950 p-6 text-red-200"
    >
      {{ errorMessage }}
    </section>

    <section
      v-else-if="approvedApplication && !artist"
      class="grid gap-6 rounded-[24px] border border-slate-800 bg-violet-950 p-7"
    >
      <div>
        <p class="text-xs uppercase tracking-widest text-violet-700">Artist application</p>
        <h1 class="mt-4 text-3xl font-semibold text-white">Application approved</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Your application was approved. Refresh the page if your artist workspace is not visible
          yet.
        </p>
      </div>
    </section>

    <template v-else>
      <header class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div
            class="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-750 ring-1 ring-violet-700/30"
          >
            <img
              v-if="displayedAvatarUrl"
              :src="displayedAvatarUrl"
              :alt="artist.displayName"
              class="h-full w-full object-cover"
            />
            <span v-else class="text-4xl font-bold text-slate-100">{{ initials }}</span>
          </div>
          <div class="max-w-2xl">
            <p class="text-xs uppercase tracking-widest text-violet-700">Artist profile</p>
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <h1 class="text-title-1 text-white">
                {{ artist.displayName }}
              </h1>
              <span
                class="rounded-full px-4 py-2 text-sm font-semibold"
                :class="
                  artist.verified || approvedApplication
                    ? 'bg-violet-700/10 text-violet-400'
                    : 'bg-amber-950 text-amber-300'
                "
              >
                {{ artist.verified || approvedApplication ? "Verified" : "Pending" }}
              </span>
            </div>
            <p class="mt-4 max-w-2xl text-slate-400 leading-7">
              {{ artist.bio || "Artist bio to be completed." }}
            </p>
            <p class="mt-4 text-sm text-slate-500">{{ artist.email }}</p>
          </div>
        </div>

        <div v-if="artist.verified || approvedApplication" class="flex flex-wrap gap-3">
          <NuxtLink
            to="/artist"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6d8bff]"
          >
            Artist dashboard
          </NuxtLink>
          <NuxtLink
            to="/artworks/new"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-6 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
          >
            Publish artwork
          </NuxtLink>
          <NuxtLink
            v-if="artist.id"
            :to="`/artists/${artist.id}`"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-6 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
          >
            Open public profile
          </NuxtLink>
        </div>
      </header>

      <section class="grid gap-4 sm:grid-cols-3">
        <article class="rounded-[24px] border border-slate-800 bg-slate-800 p-6 text-center">
          <p class="text-sm uppercase tracking-widest text-violet-700">Artworks</p>
          <p class="mt-4 text-3xl font-semibold text-white">
            {{ artist.stats.artworks }}
          </p>
        </article>
        <NuxtLink
          to="/follows?tab=followers"
          class="group rounded-[24px] border border-slate-800 bg-slate-800 p-6 text-center transition hover:border-violet-700/40 hover:bg-slate-750"
        >
          <p class="text-sm uppercase tracking-widest text-violet-700">Followers</p>
          <p class="mt-4 text-3xl font-semibold text-white">
            {{ artist.stats.followers }}
          </p>
          <p
            class="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500 transition group-hover:text-slate-300"
          >
            Open follower list
          </p>
        </NuxtLink>
        <article class="rounded-[24px] border border-slate-800 bg-slate-800 p-6 text-center">
          <p class="text-sm uppercase tracking-widest text-violet-700">Collections</p>
          <p class="mt-4 text-3xl font-semibold text-white">
            {{ artist.stats.collections }}
          </p>
        </article>
      </section>

      <section
        id="artist-profile-settings"
        class="grid gap-6 rounded-[24px] border border-slate-800 bg-slate-950 p-6 lg:grid-cols-[0.8fr_1.2fr]"
      >
        <div class="grid gap-4">
          <div>
            <p class="text-xs uppercase tracking-widest text-violet-700">Public visuals</p>
            <h2 class="mt-3 text-2xl font-semibold text-white">Artist identity</h2>
            <p class="mt-3 text-sm leading-6 text-slate-400">
              Upload both the hero cover and the profile image used on your public artist pages.
            </p>
          </div>

          <div
            class="flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900"
          >
            <img
              v-if="displayedCoverUrl"
              :src="displayedCoverUrl"
              :alt="`${artist.displayName} cover`"
              class="h-full w-full object-cover"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.26),_transparent_54%),linear-gradient(180deg,_rgba(15,23,42,0.92),_rgba(2,6,23,1))] px-6 text-center"
            >
              <span class="text-sm font-medium uppercase tracking-[0.25em] text-slate-300">
                Public hero cover
              </span>
            </div>
          </div>

          <div
            class="rounded-[20px] border border-slate-800 bg-black/30 p-4 text-sm text-slate-400"
          >
            {{ selectedCoverImageName || "No new cover selected." }}
          </div>

          <div
            class="flex h-44 w-44 items-center justify-center overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900"
          >
            <img
              v-if="displayedAvatarUrl"
              :src="displayedAvatarUrl"
              :alt="artist.displayName"
              class="h-full w-full object-cover"
            />
            <span v-else class="text-5xl font-bold text-slate-100">{{ initials }}</span>
          </div>

          <div
            class="rounded-[20px] border border-slate-800 bg-black/30 p-4 text-sm text-slate-400"
          >
            {{ selectedAvatarImageName || "No new profile image selected." }}
          </div>
        </div>

        <form class="grid gap-5" @submit.prevent="saveArtistProfile">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-slate-100">Artist display name</span>
            <input
              v-model.trim="profileForm.displayName"
              type="text"
              maxlength="160"
              class="rounded-2xl border border-slate-800 bg-black px-4 py-3 text-slate-100 outline-none transition focus:border-violet-600"
              placeholder="Your public artist name"
            />
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-slate-100">Artist bio</span>
            <textarea
              v-model.trim="profileForm.bio"
              rows="6"
              maxlength="4000"
              class="rounded-2xl border border-slate-800 bg-black px-4 py-3 text-slate-100 outline-none transition focus:border-violet-600"
              placeholder="Tell collectors about your work, style and creative universe."
            />
          </label>

          <input
            id="artist-cover-image"
            class="hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            @change="onCoverImageSelected"
          />

          <input
            id="artist-profile-image"
            class="hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            @change="onProfileImageSelected"
          />

          <div class="grid gap-4 rounded-[20px] border border-slate-800 bg-black/20 p-4">
            <div>
              <p class="text-sm font-medium text-slate-100">Hero cover</p>
              <p class="mt-1 text-sm leading-6 text-slate-400">
                This wide image is displayed as the banner on your public artist profile.
              </p>
            </div>
            <div class="flex flex-wrap gap-3">
              <label
                for="artist-cover-image"
                class="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-750 bg-slate-850 px-5 text-sm font-semibold text-slate-100 transition hover:border-violet-700 hover:text-violet-200"
              >
                Choose cover
              </label>
              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-900 bg-red-950/40 px-5 text-sm font-semibold text-red-200 transition hover:border-red-700 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!artist.coverUrl && !selectedCoverImage"
                @click="markCoverForRemoval"
              >
                Remove cover
              </button>
            </div>
          </div>

          <div class="grid gap-4 rounded-[20px] border border-slate-800 bg-black/20 p-4">
            <div>
              <p class="text-sm font-medium text-slate-100">Profile image</p>
              <p class="mt-1 text-sm leading-6 text-slate-400">
                This square image is displayed on artist cards and profile avatars.
              </p>
            </div>
            <div class="flex flex-wrap gap-3">
              <label
                for="artist-profile-image"
                class="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-750 bg-slate-850 px-5 text-sm font-semibold text-slate-100 transition hover:border-violet-700 hover:text-violet-200"
              >
                Choose image
              </label>
              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-900 bg-red-950/40 px-5 text-sm font-semibold text-red-200 transition hover:border-red-700 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!artist.avatarUrl && !selectedProfileImage"
                @click="markAvatarForRemoval"
              >
                Remove image
              </button>
            </div>
          </div>

          <AppStatePanel
            v-if="profileSuccessMessage"
            compact
            type="success"
            :message="profileSuccessMessage"
          />
          <AppStatePanel
            v-if="profileErrorMessage"
            compact
            type="error"
            :message="profileErrorMessage"
          />

          <div class="flex flex-wrap gap-3">
            <button
              type="submit"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-violet-700 px-6 text-sm font-semibold text-black transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="savingProfile"
            >
              {{ savingProfile ? "Saving..." : "Save public profile" }}
            </button>
            <button
              type="button"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-850 px-6 text-sm font-semibold text-slate-100 transition hover:bg-slate-750"
              :disabled="savingProfile"
              @click="resetProfileForm"
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-7">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Portfolio</p>
              <h2 class="mt-4 text-2xl font-semibold text-white">My artworks</h2>
              <p class="mt-2 max-w-2xl text-sm leading-6 text-[#A0ADB4]">
                Manage active, hidden and archived artworks from one private workspace.
              </p>
            </div>
            <NuxtLink
              v-if="artist.verified || approvedApplication"
              to="/artworks/new"
              class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-5 text-sm font-semibold text-[#D5E0FF] transition hover:bg-[#4A6CF7]/20"
            >
              New artwork
            </NuxtLink>
          </div>

          <div
            v-if="artist.verified || approvedApplication"
            class="mt-6 flex flex-wrap gap-2"
            role="tablist"
            aria-label="Filter my artworks by status"
          >
            <button
              v-for="filter in artworkFilters"
              :id="`artwork-filter-${filter.value.toLowerCase()}`"
              :key="filter.value"
              type="button"
              role="tab"
              :aria-selected="selectedArtworkVisibility === filter.value"
              :aria-controls="`artwork-panel-${filter.value.toLowerCase()}`"
              class="inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition"
              :class="
                selectedArtworkVisibility === filter.value
                  ? 'border-[#4A6CF7] bg-[#4A6CF7]/20 text-white'
                  : 'border-[#24314F] bg-[#10151E] text-[#A0ADB4] hover:bg-[#1F273A] hover:text-white'
              "
              @click="selectedArtworkVisibility = filter.value"
            >
              {{ filter.label }}
              <span
                class="inline-flex min-w-6 items-center justify-center rounded-full bg-black/30 px-2 py-0.5 text-xs"
                :aria-label="`${filter.count} artwork${filter.count === 1 ? '' : 's'}`"
              >
                {{ filter.count }}
              </span>
            </button>
          </div>

          <div v-if="artworksLoading" class="mt-6 text-sm text-[#A0ADB4]">
            Loading your artworks...
          </div>
          <div
            v-else-if="!filteredArtworks.length"
            :id="`artwork-panel-${selectedArtworkVisibility.toLowerCase()}`"
            role="tabpanel"
            :aria-labelledby="`artwork-filter-${selectedArtworkVisibility.toLowerCase()}`"
            class="mt-6 rounded-[20px] border border-[#1A1F2A] bg-[#050916] p-5 text-sm leading-6 text-[#A0ADB4]"
          >
            <template v-if="artist.verified || approvedApplication">
              <p class="font-semibold text-white">{{ emptyArtworkState.title }}</p>
              <p class="mt-2">{{ emptyArtworkState.description }}</p>
              <NuxtLink
                v-if="emptyArtworkState.showCreateAction"
                to="/artworks/new"
                class="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#4A6CF7] px-5 font-semibold text-black transition hover:bg-[#6d8bff]"
              >
                Publish an artwork
              </NuxtLink>
            </template>
            <span v-else>
              Your artist profile must be approved before you can publish artworks.
            </span>
          </div>
          <div
            v-else
            :id="`artwork-panel-${selectedArtworkVisibility.toLowerCase()}`"
            role="tabpanel"
            :aria-labelledby="`artwork-filter-${selectedArtworkVisibility.toLowerCase()}`"
            class="mt-6 grid gap-4"
          >
            <article
              v-for="artwork in filteredArtworks"
              :key="artwork.id"
              class="grid gap-5 rounded-[20px] border border-[#1A1F2A] bg-[#050916] p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
            >
              <div class="flex items-center gap-4">
                <div
                  class="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#1A2336] bg-[#03060D]"
                >
                  <ProtectedArtworkMedia
                    v-if="artwork.imageUrl"
                    :src="artwork.imageUrl"
                    :alt="artwork.title"
                    :artwork-id="artwork.id"
                    img-class="h-full w-full object-cover"
                    class="h-full w-full"
                  />
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center text-sm font-semibold text-[#8AA2FF]"
                  >
                    MIA
                  </div>
                </div>
                <div class="min-w-0">
                  <p class="text-lg font-semibold text-white">
                    {{ artwork.title }}
                  </p>
                  <p class="mt-2 text-sm text-[#A0ADB4]">
                    {{ artwork.category?.name || "Sans categorie" }} ┬À
                    {{ formatArtworkPrice(artwork) }}
                  </p>
                  <p class="mt-1 text-sm text-[#A0ADB4]">
                    {{ formatArtworkLicenseType(artwork.licenseType) }}
                  </p>
                </div>
              </div>
              <div class="grid gap-3 xl:justify-items-end">
                <div class="flex flex-wrap gap-2 xl:justify-end">
                  <span
                    class="rounded-full border px-3 py-1 text-xs font-semibold"
                    :class="artworkVisibilityClass(artwork.visibility)"
                  >
                    {{ getArtworkVisibilityPresentation(artwork.visibility).label }}
                  </span>
                  <span
                    class="rounded-full border px-3 py-1 text-xs font-semibold"
                    :class="artworkAvailabilityClass(artwork)"
                  >
                    {{ formatCommercialAvailability(artwork) }}
                  </span>
                </div>
                <div class="text-sm leading-6 text-[#A0ADB4] xl:text-right">
                  <p v-if="artwork.management?.lifecycle?.hasConfirmedPurchase">
                    Purchase recorded ÔÇö history preserved
                  </p>
                  <p v-else>No purchase recorded</p>
                  <p
                    v-if="artwork.management?.lifecycle?.hasTransactionInProgress"
                    class="text-amber-300"
                  >
                    Payment or reservation in progress
                  </p>
                </div>
                <NuxtLink
                  :to="`/artworks/${artwork.id}`"
                  class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#24314F] bg-[#10151E] px-5 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
                >
                  View private details
                </NuxtLink>
              </div>
            </article>
          </div>
        </div>
        <div class="rounded-[24px] border border-slate-800 bg-violet-950 p-7">
          <p class="text-xs uppercase tracking-widest text-violet-700">MVP</p>
          <h2 class="mt-4 text-2xl font-semibold text-white">Next steps</h2>
          <ul class="mt-4 grid gap-3 text-sm leading-6 text-slate-400">
            <li>Add your first artworks.</li>
            <li>Connect styles and social links to your public profile content.</li>
            <li>Keep your signed agreement available in the admin workspace.</li>
          </ul>
        </div>
      </section>
    </template>
  </ArtistShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import {
  ARTIST_ARTWORK_VISIBILITY_FILTERS,
  filterArtistArtworksByVisibility,
  formatArtworkLicenseType,
  getArtworkAvailabilityPresentation,
  getArtworkVisibilityPresentation,
  normalizeArtistArtworkCounts
} from "~/utils/marketplace.js";

definePageMeta({
  middleware: "auth"
});

const artist = ref(null);
const route = useRoute();
const application = ref(null);
const loading = ref(true);
const artworksLoading = ref(false);
const artistArtworks = ref([]);
const artworkCounts = ref(normalizeArtistArtworkCounts(null));
const selectedArtworkVisibility = ref("PUBLISHED");
const missingArtist = ref(false);
const errorMessage = ref("");
const savingProfile = ref(false);
const selectedProfileImage = ref(null);
const selectedAvatarPreviewUrl = ref("");
const selectedCoverImage = ref(null);
const selectedCoverPreviewUrl = ref("");
const profileSuccessMessage = ref("");
const profileErrorMessage = ref("");
const deletionSuccessMessage = computed(() =>
  route.query.artworkDeleted === "1" ? "L'œuvre a été supprimée définitivement." : ""
);
const profileForm = reactive({
  displayName: "",
  bio: "",
  removeAvatar: false,
  removeCover: false
});

const pendingApplication = computed(() =>
  application.value?.status === "pending" ? application.value : null
);
const rejectedApplication = computed(() =>
  application.value?.status === "rejected" ? application.value : null
);
const approvedApplication = computed(() =>
  application.value?.status === "approved" ? application.value : null
);
const artworkFilters = computed(() =>
  ARTIST_ARTWORK_VISIBILITY_FILTERS.map((filter) => ({
    ...filter,
    count: artworkCounts.value[filter.value]
  }))
);
const filteredArtworks = computed(() =>
  filterArtistArtworksByVisibility(artistArtworks.value, selectedArtworkVisibility.value)
);
const emptyArtworkState = computed(() => {
  if (selectedArtworkVisibility.value === "HIDDEN") {
    return {
      title: "No hidden artworks",
      description:
        "Artworks temporarily removed from sale will appear here, ready to be republished or archived.",
      showCreateAction: false
    };
  }

  if (selectedArtworkVisibility.value === "ARCHIVED") {
    return {
      title: "No archived artworks",
      description:
        "Artworks kept outside your active catalogue will appear here with their history.",
      showCreateAction: false
    };
  }

  return {
    title: "No active artworks",
    description:
      "Publish your first artwork to offer it in the catalogue after moderation approval.",
    showCreateAction: true
  };
});
const userNameFallback = computed(
  () => artist.value?.username || application.value?.payload?.displayName || "Artist"
);

const initials = computed(() => {
  const name = artist.value?.displayName || artist.value?.username || "Artist";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
});

const displayedAvatarUrl = computed(() => {
  if (selectedAvatarPreviewUrl.value) {
    return selectedAvatarPreviewUrl.value;
  }

  if (profileForm.removeAvatar) {
    return "";
  }

  return artist.value?.avatarUrl || "";
});

const displayedCoverUrl = computed(() => {
  if (selectedCoverPreviewUrl.value) {
    return selectedCoverPreviewUrl.value;
  }

  if (profileForm.removeCover) {
    return "";
  }

  return artist.value?.coverUrl || "";
});

const selectedAvatarImageName = computed(() => {
  if (profileForm.removeAvatar) {
    return "Current image will be removed when you save.";
  }

  return selectedProfileImage.value?.name || "";
});

const selectedCoverImageName = computed(() => {
  if (profileForm.removeCover) {
    return "Current cover will be removed when you save.";
  }

  return selectedCoverImage.value?.name || "";
});

function revokeSelectedAvatarPreview() {
  if (!selectedAvatarPreviewUrl.value) {
    return;
  }

  if (selectedAvatarPreviewUrl.value.startsWith("blob:")) {
    URL.revokeObjectURL(selectedAvatarPreviewUrl.value);
  }
  selectedAvatarPreviewUrl.value = "";
}

function revokeSelectedCoverPreview() {
  if (!selectedCoverPreviewUrl.value) {
    return;
  }

  if (selectedCoverPreviewUrl.value.startsWith("blob:")) {
    URL.revokeObjectURL(selectedCoverPreviewUrl.value);
  }
  selectedCoverPreviewUrl.value = "";
}

function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Preview data is unavailable."));
    };

    reader.onerror = () => {
      reject(reader.error || new Error("Unable to load image preview."));
    };

    reader.readAsDataURL(file);
  });
}

function syncProfileForm(source) {
  revokeSelectedAvatarPreview();
  revokeSelectedCoverPreview();
  profileForm.displayName = source?.displayName || "";
  profileForm.bio = source?.bio || "";
  profileForm.removeAvatar = false;
  profileForm.removeCover = false;
  selectedProfileImage.value = null;
  selectedCoverImage.value = null;
}

async function loadArtistArtworks() {
  if (!artist.value?.verified && application.value?.status !== "approved") {
    artistArtworks.value = [];
    artworkCounts.value = normalizeArtistArtworkCounts(null);
    return;
  }

  artworksLoading.value = true;

  try {
    const response = await $fetch("/api/artists/me/artworks", {
      credentials: "include"
    });

    artistArtworks.value = Array.isArray(response?.artworks) ? response.artworks : [];
    artworkCounts.value = normalizeArtistArtworkCounts(response?.counts);
  } catch {
    artistArtworks.value = [];
    artworkCounts.value = normalizeArtistArtworkCounts(null);
  } finally {
    artworksLoading.value = false;
  }
}

async function fetchCsrfToken() {
  const response = await $fetch("/api/v1/security/csrf-token", {
    credentials: "include"
  });

  return response.csrfToken;
}

async function onProfileImageSelected(event) {
  const input = event?.target;
  const [file] = input?.files || [];
  revokeSelectedAvatarPreview();
  selectedProfileImage.value = file || null;

  if (file) {
    try {
      selectedAvatarPreviewUrl.value = await readImageFileAsDataUrl(file);
    } catch {
      selectedProfileImage.value = null;
      profileErrorMessage.value = "Unable to preview this profile image before upload.";
    }
  }

  if (input) {
    input.value = "";
  }

  profileForm.removeAvatar = false;
  profileSuccessMessage.value = "";
  if (selectedProfileImage.value) {
    profileErrorMessage.value = "";
  }
}

async function onCoverImageSelected(event) {
  const input = event?.target;
  const [file] = input?.files || [];
  revokeSelectedCoverPreview();
  selectedCoverImage.value = file || null;

  if (file) {
    try {
      selectedCoverPreviewUrl.value = await readImageFileAsDataUrl(file);
    } catch {
      selectedCoverImage.value = null;
      profileErrorMessage.value = "Unable to preview this cover image before upload.";
    }
  }

  if (input) {
    input.value = "";
  }

  profileForm.removeCover = false;
  profileSuccessMessage.value = "";
  if (selectedCoverImage.value) {
    profileErrorMessage.value = "";
  }
}

function markAvatarForRemoval() {
  revokeSelectedAvatarPreview();
  selectedProfileImage.value = null;
  profileForm.removeAvatar = true;
  profileSuccessMessage.value = "";
  profileErrorMessage.value = "";
}

function markCoverForRemoval() {
  revokeSelectedCoverPreview();
  selectedCoverImage.value = null;
  profileForm.removeCover = true;
  profileSuccessMessage.value = "";
  profileErrorMessage.value = "";
}

function resetProfileForm() {
  syncProfileForm(artist.value);
  profileSuccessMessage.value = "";
  profileErrorMessage.value = "";
}

async function saveArtistProfile() {
  if (!artist.value) {
    return;
  }

  savingProfile.value = true;
  profileSuccessMessage.value = "";
  profileErrorMessage.value = "";

  try {
    const csrfToken = await fetchCsrfToken();
    const successMessages = [];
    const formData = new FormData();
    formData.append("displayName", profileForm.displayName);
    formData.append("bio", profileForm.bio);

    if (selectedProfileImage.value) {
      formData.append("image", selectedProfileImage.value);
    }

    if (profileForm.removeAvatar) {
      formData.append("removeAvatar", "true");
    }

    const response = await $fetch("/api/artists/me/profile", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "x-csrf-token": csrfToken
      },
      body: formData
    });

    artist.value = {
      ...artist.value,
      ...response.artist,
      stats: response.artist?.stats || artist.value.stats
    };

    successMessages.push(response.message || "Artist profile updated.");

    if (selectedCoverImage.value || profileForm.removeCover) {
      const coverFormData = new FormData();

      if (selectedCoverImage.value) {
        coverFormData.append("image", selectedCoverImage.value);
      }

      if (profileForm.removeCover) {
        coverFormData.append("removeCover", "true");
      }

      const coverResponse = await $fetch("/api/artists/me/cover", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "x-csrf-token": csrfToken
        },
        body: coverFormData
      });

      artist.value = {
        ...artist.value,
        ...coverResponse.artist,
        stats: coverResponse.artist?.stats || artist.value.stats
      };
      successMessages.push(coverResponse.message || "Artist cover updated.");
    }

    syncProfileForm(artist.value);
    profileSuccessMessage.value = successMessages.join(" ");
  } catch (error) {
    profileErrorMessage.value = error?.data?.message || "Unable to update the artist profile.";
  } finally {
    savingProfile.value = false;
  }
}

onMounted(async () => {
  try {
    const response = await $fetch("/api/artists/me", {
      credentials: "include"
    });

    artist.value = response.artist;
    application.value = response.application;

    if (!response.artist && !response.application) {
      missingArtist.value = true;
    } else if (response.artist) {
      syncProfileForm(response.artist);
      await loadArtistArtworks();
    }
  } catch (error) {
    errorMessage.value = error?.data?.message || "Unable to load the artist profile.";
  } finally {
    loading.value = false;
  }
});

function formatArtworkPrice(artwork) {
  if (artwork?.price) {
    return artwork.price;
  }

  return "Price unavailable";
}

function formatCommercialAvailability(artwork) {
  if (artwork?.visibility !== "PUBLISHED") {
    return "Withdrawn from sale";
  }

  if (String(artwork?.moderationStatus || "").toLowerCase() !== "approved") {
    return "Pending moderation";
  }

  return getArtworkAvailabilityPresentation(artwork).label;
}

function artworkVisibilityClass(visibility) {
  const tone = getArtworkVisibilityPresentation(visibility).tone;

  if (tone === "hidden") {
    return "border-amber-700/60 bg-amber-950/40 text-amber-200";
  }

  if (tone === "archived") {
    return "border-slate-700 bg-slate-900 text-slate-300";
  }

  return "border-emerald-700/60 bg-emerald-950/40 text-emerald-200";
}

function artworkAvailabilityClass(artwork) {
  if (artwork?.visibility !== "PUBLISHED") {
    return "border-slate-700 bg-slate-900 text-slate-300";
  }

  if (String(artwork?.moderationStatus || "").toLowerCase() !== "approved") {
    return "border-amber-700/60 bg-amber-950/40 text-amber-200";
  }

  const tone = getArtworkAvailabilityPresentation(artwork).tone;

  if (tone === "available") {
    return "border-emerald-700/60 bg-emerald-950/40 text-emerald-200";
  }

  if (tone === "reserved") {
    return "border-amber-700/60 bg-amber-950/40 text-amber-200";
  }

  return "border-red-900/60 bg-red-950/40 text-red-200";
}

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(new Date(value));
}
</script>
