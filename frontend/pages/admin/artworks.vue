<template>
  <AdminShell
    title="Artworks"
    description="Vue admin des oeuvres avec vraies donnees backend et statuts derives des champs actuellement disponibles."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20"
        :disabled="loading"
        @click="loadArtworks"
      >
        {{ loading ? "Refreshing..." : "Refresh artworks" }}
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

    <section class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Artwork catalog</p>
            <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Oeuvres en base</h2>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3">
              <span class="sr-only">Search artworks</span>
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Search by title or artist"
                class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none placeholder:text-[#6D7A88]"
              />
            </label>
            <label class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3">
              <span class="sr-only">Filter artworks</span>
              <select
                v-model="statusFilter"
                class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none"
              >
                <option value="all">All statuses</option>
                <option value="Published">Published</option>
                <option value="Protected">Protected</option>
                <option value="Needs category">Needs category</option>
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
          v-else-if="loading"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
        >
          Chargement des oeuvres...
        </div>

        <div
          v-else-if="filteredArtworks.length === 0"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
        >
          Aucune oeuvre ne correspond aux filtres actuels.
        </div>

        <div v-else class="mt-6 grid gap-4">
          <div
            v-for="artwork in filteredArtworks"
            :key="artwork.id"
            class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-5"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p class="font-semibold text-[#E6EDF7]">{{ artwork.title }}</p>
                <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">By {{ artwork.artistName }}</p>
                <div class="mt-4 flex flex-wrap gap-3 text-sm text-[#8E9AA7]">
                  <span>{{ artwork.category }}</span>
                  <span>{{ artwork.price }}</span>
                  <span>{{ artwork.favoriteCount }} favorites</span>
                  <span>{{ formatDate(artwork.createdAt) }}</span>
                </div>
              </div>

              <span
                class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                :class="statusClass(artwork.status)"
              >
                {{ artwork.status }}
              </span>
            </div>
          </div>
        </div>
      </article>

      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Action blocks</p>
        <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Futur panneau de decision</h2>

        <div class="mt-6 grid gap-4">
          <div class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-5">
            <p class="font-semibold text-[#E6EDF7]">Approve</p>
            <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">
              Bloc visuel pret pour de futures actions de moderation quand le schema les gerera.
            </p>
          </div>
          <div class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-5">
            <p class="font-semibold text-[#E6EDF7]">Reject</p>
            <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">
              Pour l'instant, cette page s'appuie sur les champs reels disponibles en base.
            </p>
          </div>
          <div class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-5">
            <p class="font-semibold text-[#E6EDF7]">Delete</p>
            <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">
              On branchera les vraies actions quand les endpoints d'administration existeront.
            </p>
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
const searchTerm = ref("");
const statusFilter = ref("all");
const artworks = ref([]);
const summary = ref({
  totalArtworks: 0,
  protectedArtworks: 0,
  needsCategoryArtworks: 0,
  totalFavorites: 0
});

const summaries = computed(() => [
  {
    label: "Total artworks",
    value: summary.value.totalArtworks,
    description: "Nombre total d'oeuvres presentes en base."
  },
  {
    label: "Protected artworks",
    value: summary.value.protectedArtworks,
    description: "Oeuvres marquees comme protegees."
  },
  {
    label: "Needs category",
    value: summary.value.needsCategoryArtworks,
    description: "Oeuvres sans categorie renseignee."
  },
  {
    label: "Total favorites",
    value: summary.value.totalFavorites,
    description: "Volume global des favoris sur les oeuvres."
  }
]);

const filteredArtworks = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return artworks.value.filter((artwork) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      artwork.title.toLowerCase().includes(normalizedSearch) ||
      artwork.artistName.toLowerCase().includes(normalizedSearch);

    const matchesStatus =
      statusFilter.value === "all" || artwork.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});

onMounted(async () => {
  await loadArtworks();
});

async function loadArtworks() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/admin/artworks", {
      credentials: "include"
    });

    artworks.value = response.artworks || [];
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

    errorMessage.value = error?.data?.message || "Unable to load admin artworks.";
  } finally {
    loading.value = false;
  }
}

function statusClass(status) {
  if (status === "Published") {
    return "bg-[#4A6CF7]/10 text-[#4A6CF7]";
  }

  if (status === "Protected") {
    return "bg-[#1F2937] text-[#D8E1F0]";
  }

  return "bg-[#3F2A11] text-[#F2C97D]";
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
