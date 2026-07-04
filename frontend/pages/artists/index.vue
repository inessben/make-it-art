<template>
  <main class="min-h-screen bg-[#02040A] px-6 py-10 text-[#E6EDF7]">
    <section class="mx-auto grid w-full max-w-[1240px] gap-8">
      <header
        class="rounded-[32px] border border-[#151E30] bg-[radial-gradient(circle_at_top_left,_rgba(74,108,247,0.16),_transparent_30%),linear-gradient(180deg,_#070B14,_#04070D)] p-8"
      >
        <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">Decouverte d'artistes</p>
        <div class="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[0.98] text-white">
              Explorer les artistes
            </h1>
            <p class="mt-4 max-w-3xl text-sm leading-7 text-[#96A4B8]">
              Parcours les profils verifies, filtre par style ou type d’art et suis les artistes
              qui matchent vraiment avec ton univers.
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

      <section class="grid gap-4 rounded-[28px] border border-[#151E30] bg-[#070B14] p-6 lg:grid-cols-[1.4fr_1fr_1fr_0.9fr]">
        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Recherche</span>
          <input
            v-model.trim="filters.search"
            type="text"
            placeholder="Nom, bio, style..."
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
          />
        </label>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Style</span>
          <input
            v-model.trim="filters.style"
            type="text"
            placeholder="Cyberpunk, motion..."
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
          />
        </label>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Type d'art</span>
          <input
            v-model.trim="filters.artType"
            type="text"
            placeholder="3D, illustration..."
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
          />
        </label>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Tri</span>
          <select
            v-model="filters.sort"
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
          >
            <option value="featured">Mieux suivis</option>
            <option value="latest">Plus recents</option>
          </select>
        </label>
      </section>

      <section v-if="pending" class="rounded-[28px] border border-[#151E30] bg-[#070B14] p-8 text-[#96A4B8]">
        Chargement des artistes...
      </section>
      <section
        v-else-if="errorMessage"
        class="rounded-[28px] border border-[#6C1F2D] bg-[#261018] p-8 text-[#FBC8D0]"
      >
        {{ errorMessage }}
      </section>
      <section
        v-else-if="!artists.length"
        class="rounded-[28px] border border-[#151E30] bg-[#070B14] p-8 text-[#96A4B8]"
      >
        Aucun artiste ne correspond a ces filtres pour le moment.
      </section>
      <section v-else class="grid gap-6 lg:grid-cols-2">
        <ArtistCard
          v-for="artist in artists"
          :key="artist.id"
          :artist="artist"
          :follow-loading="Boolean(followLoading[artist.id])"
          :show-follow-action="true"
          @toggle-follow="toggleFollow"
        />
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive } from "vue";
import { useRequestHeaders } from "#app";
import { useAuthStore } from "~/stores/auth";
import ArtistCard from "~/components/marketplace/ArtistCard.vue";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";

const auth = useAuthStore();
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;

const filters = reactive({
  search: "",
  style: "",
  artType: "",
  sort: "featured"
});

const query = computed(() => ({
  search: filters.search || undefined,
  style: filters.style || undefined,
  artType: filters.artType || undefined,
  sort: filters.sort
}));

const { data, pending, error, refresh } = await useFetch("/api/artists", {
  query,
  headers: requestHeaders,
  credentials: "include",
  default: () => ({
    artists: []
  })
});

const artists = computed(() => data.value?.artists || []);
const errorMessage = computed(() => error.value?.data?.message || "");

const {
  actionMessage,
  followLoading,
  toggleFollow
} = useMarketplaceActions(auth);

onMounted(async () => {
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
