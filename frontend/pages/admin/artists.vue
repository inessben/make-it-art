<template>
  <AdminShell
    title="Artists"
    description="Liste admin des artistes avec vraies donnees backend, verification et vue d'ensemble rapide."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        :disabled="loading"
        @click="loadArtists"
      >
        {{ loading ? "Refreshing..." : "Refresh artists" }}
      </button>
    </template>

    <section class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <article
        v-for="summaryCard in summaries"
        :key="summaryCard.label"
        class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6"
      >
        <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
          {{ summaryCard.label }}
        </p>
        <p class="mt-4 text-3xl font-semibold text-white">{{ summaryCard.value }}</p>
        <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">{{ summaryCard.description }}</p>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Artist queue</p>
            <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Profils artistes</h2>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3">
              <span class="sr-only">Search artists</span>
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Search by name or email"
                class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none placeholder:text-[#6D7A88]"
              />
            </label>
            <label class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3">
              <span class="sr-only">Filter artists</span>
              <select
                v-model="verificationFilter"
                class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none"
              >
                <option value="all">All artists</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
              </select>
            </label>
          </div>
        </div>

        <div
          v-if="errorMessage"
          class="mt-6 rounded-2xl border border-[#7f1d1d] bg-[#2b1014] px-5 py-4 text-sm text-[#FECACA]"
        >
          {{ errorMessage }}
        </div>
        <div
          v-if="successMessage"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#11243a] px-5 py-4 text-sm text-[#B9E3FF]"
        >
          {{ successMessage }}
        </div>

        <div
          v-else-if="loading"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
        >
          Chargement des artistes...
        </div>

        <div
          v-else-if="filteredArtists.length === 0"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
        >
          Aucun artiste ne correspond aux filtres actuels.
        </div>

        <div v-else class="mt-6 grid gap-4">
          <div
            v-for="artist in filteredArtists"
            :key="artist.id"
            class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-5"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="font-semibold text-[#E6EDF7]">{{ artist.name }}</p>
                <p class="mt-1 text-sm text-[#8E9AA7]">{{ artist.email }}</p>
                <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">{{ artist.bio }}</p>
              </div>
              <span
                class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                :class="
                  artist.verified ? 'bg-[#4A6CF7]/10 text-[#4A6CF7]' : 'bg-[#3F2A11] text-[#F2C97D]'
                "
              >
                {{ artist.verified ? "Verified" : "Pending" }}
              </span>
            </div>

            <div class="mt-5 flex flex-wrap gap-3 text-sm text-[#8E9AA7]">
              <span>{{ artist.artworksCount }} artworks</span>
              <span>{{ artist.followersCount }} followers</span>
              <span>{{ artist.collectionsCount }} collections</span>
              <span>{{ formatDate(artist.createdAt) }}</span>
            </div>

            <div class="mt-5 flex flex-wrap gap-3">
              <button
                v-if="!artist.verified"
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#4A6CF7] px-5 text-sm font-semibold text-black transition hover:bg-[#6d8bff] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="verificationLoadingId === artist.id"
                @click="updateArtistVerification(artist, true)"
              >
                {{ verificationLoadingId === artist.id ? "Validation..." : "Valider le profil" }}
              </button>
              <button
                v-else
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="verificationLoadingId === artist.id"
                @click="updateArtistVerification(artist, false)"
              >
                {{ verificationLoadingId === artist.id ? "Mise a jour..." : "Remettre en attente" }}
              </button>
            </div>
          </div>
        </div>
      </article>

      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Verification</p>
        <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Gestion des profils</h2>

        <div class="mt-6 grid gap-4">
          <div
            v-for="action in actions"
            :key="action.title"
            class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-5"
          >
            <p class="font-semibold text-[#E6EDF7]">{{ action.title }}</p>
            <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">{{ action.description }}</p>
          </div>
        </div>
      </article>
    </section>
  </AdminShell>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo } from "#app";

definePageMeta({
  middleware: "admin"
});

const loading = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const searchTerm = ref("");
const verificationFilter = ref("all");
const artists = ref([]);
const verificationLoadingId = ref(null);
const summary = ref({
  totalArtists: 0,
  verifiedArtists: 0,
  pendingArtists: 0,
  totalArtworks: 0
});

const summaries = computed(() => [
  {
    label: "Total artists",
    value: summary.value.totalArtists,
    description: "Nombre total de profils artistes en base."
  },
  {
    label: "Verified artists",
    value: summary.value.verifiedArtists,
    description: "Artistes deja verifies par la plateforme."
  },
  {
    label: "Pending artists",
    value: summary.value.pendingArtists,
    description: "Profils artistes encore en attente."
  },
  {
    label: "Total artworks",
    value: summary.value.totalArtworks,
    description: "Volume d'oeuvres rattachees aux profils artistes."
  }
]);

const filteredArtists = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return artists.value.filter((artist) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      artist.name.toLowerCase().includes(normalizedSearch) ||
      artist.email.toLowerCase().includes(normalizedSearch);

    const matchesVerification =
      verificationFilter.value === "all" ||
      (verificationFilter.value === "verified" && artist.verified) ||
      (verificationFilter.value === "pending" && !artist.verified);

    return matchesSearch && matchesVerification;
  });
});

onMounted(async () => {
  await loadArtists();
});

async function loadArtists() {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await $fetch("/api/admin/artists", {
      credentials: "include"
    });

    artists.value = response.artists || [];
    summary.value = response.summary || summary.value;
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to load admin artists.";
  } finally {
    loading.value = false;
  }
}

const actions = [
  {
    title: "Verification artiste",
    description: "Validez un profil quand ses informations publiques sont suffisantes."
  },
  {
    title: "Retour en attente",
    description: "Repassez un profil en attente si une correction est necessaire."
  },
  {
    title: "Effet visible",
    description: "Le badge du profil artiste passe de Pending a Verified."
  }
];

function replaceArtist(updatedArtist) {
  artists.value = artists.value.map((artist) =>
    artist.id === updatedArtist.id ? updatedArtist : artist
  );
  summary.value = {
    totalArtists: artists.value.length,
    verifiedArtists: artists.value.filter((artist) => artist.verified).length,
    pendingArtists: artists.value.filter((artist) => !artist.verified).length,
    totalArtworks: artists.value.reduce((sum, artist) => sum + artist.artworksCount, 0)
  };
}

async function updateArtistVerification(artist, verified) {
  errorMessage.value = "";
  successMessage.value = "";
  verificationLoadingId.value = artist.id;

  try {
    const response = await $fetch(`/api/admin/artists/${artist.id}/verification`, {
      method: "PATCH",
      credentials: "include",
      body: {
        verified
      }
    });

    replaceArtist(response.artist);
    successMessage.value = verified
      ? `${response.artist.name} est maintenant verifie.`
      : `${response.artist.name} est repasse en attente.`;
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to update artist verification.";
  } finally {
    verificationLoadingId.value = null;
  }
}

function formatDate(value) {
  if (!value) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium"
  }).format(new Date(value));
}
</script>
