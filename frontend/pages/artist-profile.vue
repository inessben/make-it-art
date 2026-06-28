<template>
  <main class="min-h-screen bg-black px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto grid w-full max-w-[1120px] gap-8 rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <NuxtLink
          to="/profile"
          class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        >
          Retour au profil
        </NuxtLink>

        <NuxtLink
          to="/become-artist"
          class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20"
        >
          Modifier le profil artiste
        </NuxtLink>
      </div>

      <section
        v-if="loading"
        class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 text-[#A0ADB4]"
      >
        Chargement du profil artiste...
      </section>

      <section
        v-else-if="missingArtist"
        class="grid gap-5 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-7"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Profil artiste</p>
          <h1 class="mt-4 text-3xl font-semibold text-white">
            Aucun profil artiste pour le moment
          </h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-[#A0ADB4]">
            Creez votre profil artiste MVP pour commencer a publier votre portfolio.
          </p>
        </div>
        <NuxtLink
          to="/become-artist"
          class="inline-flex w-fit items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#6d8bff]"
        >
          Become an artist
        </NuxtLink>
      </section>

      <section
        v-else-if="errorMessage"
        class="rounded-[24px] border border-[#7f1d1d] bg-[#2b1014] p-6 text-[#FECACA]"
      >
        {{ errorMessage }}
      </section>

      <template v-else>
        <header class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div
              class="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-[#1E2540] ring-1 ring-[#4A6CF7]/30"
            >
              <span class="text-4xl font-bold text-[#E6EDF7]">{{ initials }}</span>
            </div>
            <div class="max-w-2xl">
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Profil artiste</p>
              <div class="mt-4 flex flex-wrap items-center gap-3">
                <h1
                  class="text-[clamp(2.25rem,3vw,3.8rem)] font-semibold leading-[1.02] text-white"
                >
                  {{ artist.displayName }}
                </h1>
                <span
                  class="rounded-full px-4 py-2 text-sm font-semibold"
                  :class="
                    artist.verified
                      ? 'bg-[#4A6CF7]/10 text-[#9DB2FF]'
                      : 'bg-[#3F2A11] text-[#F2C97D]'
                  "
                >
                  {{ artist.verified ? "Verified" : "En attente" }}
                </span>
              </div>
              <p class="mt-4 max-w-2xl text-[#A0ADB4] leading-7">
                {{ artist.bio || "Bio artiste a completer." }}
              </p>
              <p class="mt-4 text-sm text-[#7F8A99]">{{ artist.email }}</p>
            </div>
          </div>
        </header>

        <section class="grid gap-4 sm:grid-cols-3">
          <article class="rounded-[24px] border border-[#1A1F2A] bg-[#12172D] p-6 text-center">
            <p class="text-sm uppercase tracking-[0.18em] text-[#4A6CF7]">Artworks</p>
            <p class="mt-4 text-3xl font-semibold text-white">{{ artist.stats.artworks }}</p>
          </article>
          <article class="rounded-[24px] border border-[#1A1F2A] bg-[#12172D] p-6 text-center">
            <p class="text-sm uppercase tracking-[0.18em] text-[#4A6CF7]">Followers</p>
            <p class="mt-4 text-3xl font-semibold text-white">{{ artist.stats.followers }}</p>
          </article>
          <article class="rounded-[24px] border border-[#1A1F2A] bg-[#12172D] p-6 text-center">
            <p class="text-sm uppercase tracking-[0.18em] text-[#4A6CF7]">Collections</p>
            <p class="mt-4 text-3xl font-semibold text-white">{{ artist.stats.collections }}</p>
          </article>
        </section>

        <section class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-7">
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">A propos</p>
            <h2 class="mt-4 text-2xl font-semibold text-white">Presentation artiste</h2>
            <p class="mt-4 text-[#A0ADB4] leading-7">
              {{ artist.bio || "Ajoutez une bio depuis le formulaire artiste." }}
            </p>
          </div>

          <div class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-7">
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">MVP</p>
            <h2 class="mt-4 text-2xl font-semibold text-white">Prochaines etapes</h2>
            <ul class="mt-4 grid gap-3 text-sm leading-6 text-[#A0ADB4]">
              <li>Ajouter les premieres oeuvres.</li>
              <li>Relier les styles et liens sociaux au schema DB.</li>
              <li>Faire valider le profil artiste par un admin.</li>
            </ul>
          </div>
        </section>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";

definePageMeta({
  middleware: "auth"
});

const artist = ref(null);
const loading = ref(true);
const missingArtist = ref(false);
const errorMessage = ref("");

const initials = computed(() => {
  const name = artist.value?.displayName || artist.value?.username || "Artist";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
});

onMounted(async () => {
  try {
    const response = await $fetch("/api/artists/me", {
      credentials: "include"
    });

    artist.value = response.artist;
  } catch (error) {
    if (error?.statusCode === 404) {
      missingArtist.value = true;
      return;
    }

    errorMessage.value = error?.data?.message || "Impossible de charger le profil artiste.";
  } finally {
    loading.value = false;
  }
});
</script>
