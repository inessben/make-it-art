<template>
  <main class="min-h-screen bg-black px-4 py-8 text-slate-100 sm:px-6 sm:py-10">
    <section
      class="mx-auto grid w-full max-w-[1120px] gap-8 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-[0_32px_90px_rgba(0,0,0,0.22)] sm:rounded-[32px] sm:p-8"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <NuxtLink
          to="/account-settings"
          class="inline-flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-850 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-750"
        >
          Back to account
        </NuxtLink>

        <NuxtLink
          to="/become-artist"
          class="inline-flex items-center justify-center rounded-2xl border border-violet-700 bg-violet-700/10 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-violet-700/20"
        >
          Edit artist profile
        </NuxtLink>
      </div>

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

      <template v-else>
        <header class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div
              class="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-slate-750 ring-1 ring-violet-700/30"
            >
              <span class="text-4xl font-bold text-slate-100">{{ initials }}</span>
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
              Dashboard artiste
            </NuxtLink>
            <NuxtLink
              to="/artworks/new"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-6 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
            >
              Publier une oeuvre
            </NuxtLink>
            <NuxtLink
              v-if="artist.id"
              :to="`/artists/${artist.id}`"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-6 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
            >
              Voir mon profil public
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
          <article class="rounded-[24px] border border-slate-800 bg-slate-800 p-6 text-center">
            <p class="text-sm uppercase tracking-widest text-violet-700">Followers</p>
            <p class="mt-4 text-3xl font-semibold text-white">
              {{ artist.stats.followers }}
            </p>
          </article>
          <article class="rounded-[24px] border border-slate-800 bg-slate-800 p-6 text-center">
            <p class="text-sm uppercase tracking-widest text-violet-700">Collections</p>
            <p class="mt-4 text-3xl font-semibold text-white">
              {{ artist.stats.collections }}
            </p>
          </article>
        </section>

        <section class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-7">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Portfolio</p>
                <h2 class="mt-4 text-2xl font-semibold text-white">Mes oeuvres publiees</h2>
              </div>
              <NuxtLink
                v-if="artist.verified || approvedApplication"
                to="/artworks/new"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-5 text-sm font-semibold text-[#D5E0FF] transition hover:bg-[#4A6CF7]/20"
              >
                Nouvelle oeuvre
              </NuxtLink>
            </div>

            <div v-if="artworksLoading" class="mt-6 text-sm text-[#A0ADB4]">
              Chargement de vos oeuvres...
            </div>
            <div
              v-else-if="!publishedArtworks.length"
              class="mt-6 rounded-[20px] border border-[#1A1F2A] bg-[#050916] p-5 text-sm leading-6 text-[#A0ADB4]"
            >
              <span v-if="artist.verified || approvedApplication">
                Vous n'avez pas encore publie d'oeuvre. Lancez votre premiere publication pour
                apparaitre dans le catalogue.
              </span>
              <span v-else>
                Votre profil artiste doit etre valide avant de publier des oeuvres.
              </span>
            </div>
            <div v-else class="mt-6 grid gap-4">
              <article
                v-for="artwork in publishedArtworks"
                :key="artwork.id"
                class="flex flex-col gap-4 rounded-[20px] border border-[#1A1F2A] bg-[#050916] p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#1A2336] bg-[#03060D]"
                  >
                    <img
                      v-if="artwork.imageUrl"
                      :src="artwork.imageUrl"
                      :alt="artwork.title"
                      class="h-full w-full object-cover"
                    />
                    <div
                      v-else
                      class="flex h-full w-full items-center justify-center text-sm font-semibold text-[#8AA2FF]"
                    >
                      MIA
                    </div>
                  </div>
                  <div>
                    <p class="text-lg font-semibold text-white">
                      {{ artwork.title }}
                    </p>
                    <p class="mt-2 text-sm text-[#A0ADB4]">
                      {{ artwork.category?.name || "Sans categorie" }} ·
                      {{ formatArtworkPrice(artwork) }}
                    </p>
                  </div>
                </div>
                <NuxtLink
                  :to="`/artworks/${artwork.id}`"
                  class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#24314F] bg-[#10151E] px-5 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
                >
                  Voir la fiche
                </NuxtLink>
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
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useAuthStore } from "~/stores/auth";

definePageMeta({
  middleware: "auth"
});

const artist = ref(null);
const application = ref(null);
const loading = ref(true);
const artworksLoading = ref(false);
const publishedArtworks = ref([]);
const missingArtist = ref(false);
const errorMessage = ref("");

const pendingApplication = computed(() => {
  // A verified artist profile always wins over a stale "pending" application view.
  if (artist.value?.verified) {
    return null;
  }

  return application.value?.status === "pending" ? application.value : null;
});
const rejectedApplication = computed(() => {
  if (artist.value?.verified) {
    return null;
  }

  return application.value?.status === "rejected" ? application.value : null;
});
const approvedApplication = computed(() =>
  application.value?.status === "approved" ? application.value : null
);
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

async function loadPublishedArtworks() {
  if (!artist.value?.verified && application.value?.status !== "approved") {
    publishedArtworks.value = [];
    return;
  }

  artworksLoading.value = true;

  try {
    const response = await $fetch("/api/artists/me/artworks", {
      credentials: "include"
    });

    publishedArtworks.value = Array.isArray(response?.artworks) ? response.artworks : [];
  } catch {
    publishedArtworks.value = [];
  } finally {
    artworksLoading.value = false;
  }
}

onMounted(async () => {
  try {
    const auth = useAuthStore();
    try {
      await auth.fetchCurrentUser();
    } catch {
      // The page middleware already enforces auth; keep loading the profile payload.
    }

    const response = await $fetch("/api/artists/me", {
      credentials: "include"
    });

    artist.value = response.artist;
    application.value = response.application;

    if (!response.artist && !response.application) {
      missingArtist.value = true;
    } else if (response.artist) {
      await loadPublishedArtworks();
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

  return "Prix non renseigne";
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
