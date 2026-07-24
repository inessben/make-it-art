<template>
  <main class="min-h-screen bg-[#02040A] px-6 py-10 text-[#E6EDF7]">
    <section class="mx-auto grid w-full max-w-[1240px] gap-8">
      <header
        class="rounded-[32px] border border-[#151E30] bg-[radial-gradient(circle_at_top_left,_rgba(74,108,247,0.16),_transparent_30%),linear-gradient(180deg,_#070B14,_#04070D)] p-8"
      >
        <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">
          Catalogue public
        </p>
        <div
          class="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <h1
              class="text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[0.98] text-white"
            >
              Catalogue des oeuvres
            </h1>
            <p class="mt-4 max-w-3xl text-sm leading-7 text-[#96A4B8]">
              Cherche par univers, style ou type d’art, puis plonge dans chaque
              fiche pour suivre l’artiste, sauvegarder tes favoris et organiser
              ta veille.
            </p>
          </div>

          <div
            v-if="actionMessage"
            class="rounded-2xl border border-[#203357] bg-[#091121] px-5 py-3 text-sm text-[#BFD0FF]"
          >
            {{ actionMessage }}
          </div>
        </div>
      </header>

      <section
        class="grid gap-4 rounded-[28px] border border-[#151E30] bg-[#070B14] p-6 lg:grid-cols-[1.2fr_1fr_1fr_1fr_0.9fr]"
      >
        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Recherche</span>
          <input
            v-model.trim="filters.search"
            type="text"
            placeholder="Titre, artiste, categorie..."
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
          />
        </label>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Categorie</span>
          <select
            v-model="filters.categoryId"
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
          >
            <option value="">Toutes les categories</option>
            <option
              v-for="category in categories"
              :key="category.id"
              :value="String(category.id)"
            >
              {{ category.name }}
            </option>
          </select>
        </label>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Style</span>
          <input
            v-model.trim="filters.style"
            type="text"
            placeholder="Cyberpunk, 3D..."
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
          />
        </label>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Type d'art</span>
          <input
            v-model.trim="filters.artType"
            type="text"
            placeholder="Illustration, animation..."
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
          />
        </label>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Tri</span>
          <select
            v-model="filters.sort"
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
          >
            <option value="latest">Plus recentes</option>
            <option value="popular">Plus populaires</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix decroissant</option>
          </select>
        </label>
      </section>

      <section
        v-if="categories.length"
        class="flex flex-wrap gap-3 rounded-[28px] border border-[#151E30] bg-[#070B14] p-5"
      >
        <button
          type="button"
          class="inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition"
          :class="
            !filters.categoryId
              ? 'border-[#4A6CF7] bg-[#4A6CF7]/12 text-[#D5E0FF]'
              : 'border-[#24314F] bg-[#0C111D] text-[#C9D6FF] hover:border-[#4A6CF7]'
          "
          @click="filters.categoryId = ''"
        >
          Toutes
        </button>
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition"
          :class="
            filters.categoryId === String(category.id)
              ? 'border-[#4A6CF7] bg-[#4A6CF7]/12 text-[#D5E0FF]'
              : 'border-[#24314F] bg-[#0C111D] text-[#C9D6FF] hover:border-[#4A6CF7]'
          "
          @click="filters.categoryId = String(category.id)"
        >
          {{ category.name }}
        </button>
      </section>

      <section
        v-if="pending"
        class="rounded-[28px] border border-[#151E30] bg-[#070B14] p-8 text-[#96A4B8]"
      >
        Chargement du catalogue...
      </section>
      <section
        v-else-if="errorMessage"
        class="rounded-[28px] border border-[#6C1F2D] bg-[#261018] p-8 text-[#FBC8D0]"
      >
        {{ errorMessage }}
      </section>
      <section
        v-else-if="!artworks.length"
        class="rounded-[28px] border border-[#151E30] bg-[#070B14] p-8 text-[#96A4B8]"
      >
        Aucune oeuvre ne correspond a ces filtres pour le moment.
      </section>
      <section v-else class="grid gap-6 lg:grid-cols-3">
        <ArtworkCard
          v-for="artwork in artworks"
          :key="artwork.id"
          :artwork="artwork"
          :favorite-loading="Boolean(favoriteLoading[artwork.id])"
          :show-favorite-action="true"
          @toggle-favorite="toggleFavorite"
        />
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRequestHeaders, useRoute } from "#app";
import { useAuthStore } from "~/stores/auth";
import ArtworkCard from "~/components/marketplace/ArtworkCard.vue";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";

const route = useRoute();
const auth = useAuthStore();
const requestHeaders = import.meta.server
  ? useRequestHeaders(["cookie"])
  : undefined;

const categories = ref([]);

const filters = reactive({
  search: "",
  categoryId: String(route.query.category || ""),
  style: "",
  artType: "",
  sort: "latest",
});

const query = computed(() => ({
  search: filters.search || undefined,
  category: filters.categoryId || undefined,
  style: filters.style || undefined,
  artType: filters.artType || undefined,
  sort: filters.sort,
}));

const { data, pending, error, refresh } = await useFetch("/api/artworks", {
  query,
  headers: requestHeaders,
  credentials: "include",
  default: () => ({
    artworks: [],
  }),
});

const artworks = computed(() => data.value?.artworks || []);
const errorMessage = computed(() => error.value?.data?.message || "");

const { actionMessage, favoriteLoading, toggleFavorite } =
  useMarketplaceActions(auth);

onMounted(async () => {
  try {
    const response = await $fetch("/api/categories", {
      credentials: "include",
    });

    categories.value = response.categories || [];
  } catch {
    categories.value = [];
  }

  if (!auth.user) {
    try {
      await auth.fetchCurrentUser();
      await refresh();
    } catch {
      // Public page: anonymous visitors are allowed.
    }
  }
});
</script>
