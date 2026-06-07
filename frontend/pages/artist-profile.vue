<template>
  <main class="min-h-screen bg-[#000000] px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto w-full max-w-[1140px] rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <div class="flex flex-col gap-6">
        <button
          type="button"
          class="inline-flex items-center gap-2 self-start rounded-2xl border border-[#1A1F2A] bg-[#090017] px-4 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#12172d]"
          @click="navigateBack"
        >
          ← Retour au profil
        </button>

        <div
          v-if="loading"
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8 text-[#A0ADB4]"
        >
          Chargement du profil artiste...
        </div>

        <div
          v-else-if="error"
          class="rounded-[24px] border border-[#7f1d1d] bg-[#2b1014] p-8 text-[#FECACA]"
        >
          {{ error }}
        </div>

        <div v-else class="space-y-10">
          <div class="grid gap-8 lg:grid-cols-[1.6fr_0.9fr]">
            <div class="rounded-[32px] border border-[#1A1F2A] bg-[#090017] p-8">
              <div class="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div class="flex items-center gap-6">
                  <div
                    class="flex h-28 w-28 items-center justify-center rounded-full bg-[#1E2540] ring-1 ring-[#4A6CF7]/30"
                  >
                    <span class="text-4xl font-bold text-[#E6EDF7]">{{ initials }}</span>
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Profil artiste</p>
                    <h1 class="mt-4 text-[clamp(2.5rem,3vw,3.8rem)] font-semibold leading-[1.02] text-white">
                      {{ artist.displayName || user?.username || "Artiste" }}
                    </h1>
                    <p class="mt-4 max-w-2xl text-[#A0ADB4] leading-7">
                      {{ artist.about || user?.bio || defaultAbout }}
                    </p>
                    <div class="mt-6 flex flex-wrap items-center gap-3">
                      <span
                        class="inline-flex items-center rounded-full bg-[#4A6CF7]/10 px-4 py-2 text-sm font-semibold text-[#4A6CF7]"
                      >
                        {{ website }}
                      </span>
                      <span
                        class="inline-flex items-center rounded-full bg-[#ffffff]/5 px-4 py-2 text-sm text-[#A0ADB4]"
                      >
                        {{ handle }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-[32px] border border-[#1A1F2A] bg-[#090017] p-8">
              <div class="grid gap-4">
                <div class="rounded-[28px] bg-[#0F1220] p-6 text-center">
                  <p class="text-sm uppercase tracking-[0.18em] text-[#4A6CF7]">Artworks</p>
                  <p class="mt-4 text-[2.5rem] font-semibold text-white">{{ artist.artworkCount }}</p>
                </div>
                <div class="rounded-[28px] bg-[#0F1220] p-6 text-center">
                  <p class="text-sm uppercase tracking-[0.18em] text-[#4A6CF7]">Followers</p>
                  <p class="mt-4 text-[2.5rem] font-semibold text-white">{{ artist.followerCount }}</p>
                </div>
                <div class="rounded-[28px] bg-[#0F1220] p-6 text-center">
                  <p class="text-sm uppercase tracking-[0.18em] text-[#4A6CF7]">Artworks sold</p>
                  <p class="mt-4 text-[2.5rem] font-semibold text-white">{{ soldCount }}</p>
                </div>
              </div>
              <button
                type="button"
                class="mt-6 w-full rounded-2xl bg-[#4A6CF7] px-6 py-4 text-sm font-semibold text-[#000000] transition hover:bg-[#3b70f0]"
                @click="toggleFollow"
              >
                {{ isFollowing ? "Suivi" : "Suivre l'artiste" }}
              </button>
            </div>
          </div>

          <div class="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
            <div class="rounded-[32px] border border-[#1A1F2A] bg-[#090017] p-8">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">� propos</p>
                  <h2 class="mt-3 text-2xl font-semibold text-white">About</h2>
                </div>
                <div class="hidden sm:flex items-center gap-3">
                  <button
                    type="button"
                    class="inline-flex h-10 items-center justify-center rounded-full border border-[#2B3A64] bg-[#121C37] px-5 text-sm font-semibold text-[#4A6CF7] transition hover:bg-[#1E2B56]"
                  >
                    in
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-10 items-center justify-center rounded-full border border-[#2B3A64] bg-[#121C37] px-5 text-sm font-semibold text-[#4A6CF7] transition hover:bg-[#1E2B56]"
                  >
                    in
                  </button>
                </div>
              </div>
              <p class="mt-6 text-[#A0ADB4] leading-7">
                {{ artist.about || user?.bio || defaultAbout }}
              </p>
            </div>

            <div class="rounded-[32px] border border-[#1A1F2A] bg-[#090017] p-8">
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Résumé</p>
              <h2 class="mt-3 text-2xl font-semibold text-white">Données rapides</h2>
              <div class="mt-6 grid gap-4">
                <div class="rounded-[24px] bg-[#12172D] p-4">
                  <p class="text-sm uppercase tracking-[0.18em] text-[#A0ADB4]">Artworks</p>
                  <p class="mt-3 text-xl font-semibold text-white">{{ artist.artworkCount }}</p>
                </div>
                <div class="rounded-[24px] bg-[#12172D] p-4">
                  <p class="text-sm uppercase tracking-[0.18em] text-[#A0ADB4]">Followers</p>
                  <p class="mt-3 text-xl font-semibold text-white">{{ artist.followerCount }}</p>
                </div>
                <div class="rounded-[24px] bg-[#12172D] p-4">
                  <p class="text-sm uppercase tracking-[0.18em] text-[#A0ADB4]">Artworks sold</p>
                  <p class="mt-3 text-xl font-semibold text-white">{{ soldCount }}</p>
                </div>
              </div>
            </div>
          </div>

          <section>
            <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Artworks</p>
                <h2 class="mt-3 text-2xl font-semibold text-white">Artworks</h2>
              </div>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
                @click="showAllArtworks = !showAllArtworks"
              >
                {{ showAllArtworks ? "Voir moins" : "Voir tout" }}
              </button>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <article
                v-for="artwork in visibleArtworks"
                :key="artwork.id"
                class="overflow-hidden rounded-[28px] border border-[#1A1F2A] bg-[#12172D]"
              >
                <div class="aspect-[4/5] bg-[#1E253A]" />
                <div class="p-4">
                  <p class="text-sm text-[#A0ADB4]">Oeuvre</p>
                  <h3 class="mt-2 text-lg font-semibold text-[#E6EDF7]">{{ artwork.title || "Untitled" }}</h3>
                </div>
              </article>
              <article
                v-if="!artist.artworks.length"
                class="col-span-full rounded-[28px] border border-[#1A1F2A] bg-[#12172D] p-8 text-center text-[#A0ADB4]"
              >
                Aucun artwork disponible pour le moment.
              </article>
            </div>
          </section>

          <section>
            <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Collections</p>
                <h2 class="mt-3 text-2xl font-semibold text-white">Collections</h2>
              </div>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
              >
                D�couvrir
              </button>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div
                v-for="index in 5"
                :key="index"
                class="aspect-[4/5] rounded-[28px] bg-[#12172D]"
              />
            </div>
          </section>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, reactive } from "vue";
import { navigateTo } from "#app";
import { storeToRefs } from "pinia";
import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();
const { user } = storeToRefs(auth);
const loading = ref(true);
const error = ref(null);
const artist = reactive({
  displayName: "",
  about: "",
  artworkCount: 0,
  collectionCount: 0,
  followerCount: 0,
  verified: false,
  salesCount: 0,
  artworks: []
});
const isFollowing = ref(false);
const showAllArtworks = ref(false);

const initials = computed(() => {
  const name = artist.displayName || user.value?.username || "Artiste";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join("");
});

const website = computed(() => {
  const slug = (artist.displayName || user.value?.username || "artiste")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `www.${slug || "artiste"}.art`;
});

const handle = computed(() => {
  const slug = (artist.displayName || user.value?.username || "artiste")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `@${slug || "artiste"}`;
});

const soldCount = computed(() => artist.salesCount || artist.collectionCount || 0);

const visibleArtworks = computed(() => {
  return showAllArtworks.value ? artist.artworks : artist.artworks.slice(0, 5);
});

const defaultAbout =
  "Digital artist based in New York, specializing in abstract and contemporary art. With over 10 years of experience, I create pieces that challenge perception and evoke emotion.";

definePageMeta({
  middleware: "auth"
});

async function loadArtistProfile() {
  loading.value = true;
  error.value = null;
  try {
    if (!user.value) {
      await auth.fetchCurrentUser();
    }

    const response = await $fetch("/api/artist/me", {
      credentials: "include"
    });

    Object.assign(artist, response.artist);
  } catch (loadError) {
    error.value = loadError?.data?.message || "Impossible de charger le profil artiste.";
  } finally {
    loading.value = false;
  }
}

function toggleFollow() {
  isFollowing.value = !isFollowing.value;
}

function navigateBack() {
  return navigateTo("/profile");
}

onMounted(loadArtistProfile);
</script>
