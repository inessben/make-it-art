<template>
  <main class="min-h-screen bg-[#02040A] px-6 py-10 text-[#E6EDF7]">
    <section class="mx-auto grid w-full max-w-[1240px] gap-8">
      <header
        class="rounded-[32px] border border-[#151E30] bg-[radial-gradient(circle_at_top_left,_rgba(74,108,247,0.16),_transparent_30%),linear-gradient(180deg,_#070B14,_#04070D)] p-8"
      >
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">
              Liste de souhaits
            </p>
            <h1
              class="mt-4 text-[clamp(2.2rem,5vw,3.8rem)] font-semibold leading-[0.98] text-white"
            >
              Vos oeuvres favorites
            </h1>
            <p class="mt-4 max-w-3xl text-sm leading-7 text-[#96A4B8]">
              Retrouve ici les oeuvres que tu as sauvegardees depuis le
              catalogue. Clique sur « En favori » pour retirer une oeuvre de
              cette liste.
            </p>
            <p
              v-if="!pending && artworks.length"
              class="mt-3 text-sm font-medium text-[#C9D6FF]"
            >
              {{ artworks.length }} oeuvre{{ artworks.length > 1 ? "s" : "" }}
              sauvegardee{{ artworks.length > 1 ? "s" : "" }}
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <NuxtLink
              to="/artworks"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6D8BFF]"
            >
              Explorer le catalogue
            </NuxtLink>
            <NuxtLink
              to="/collections"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] bg-[#0C111D] px-6 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#141C2E]"
            >
              Mes collections
            </NuxtLink>
            <NuxtLink
              to="/profile"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] bg-transparent px-6 text-sm font-semibold text-[#C9D6FF] transition hover:border-[#4A6CF7]"
            >
              Retour au profil
            </NuxtLink>
          </div>
        </div>

        <div
          v-if="actionMessage"
          class="mt-8 inline-flex rounded-2xl border border-[#203357] bg-[#091121] px-5 py-3 text-sm text-[#BFD0FF]"
        >
          {{ actionMessage }}
        </div>
      </header>

      <section
        v-if="pending"
        class="rounded-[28px] border border-[#151E30] bg-[#070B14] p-8 text-[#96A4B8]"
      >
        Chargement de vos favoris...
      </section>
      <section
        v-else-if="errorMessage"
        class="rounded-[28px] border border-[#6C1F2D] bg-[#261018] p-8 text-[#FBC8D0]"
      >
        {{ errorMessage }}
      </section>
      <section
        v-else-if="!artworks.length"
        class="grid gap-6 rounded-[28px] border border-[#151E30] bg-[#070B14] p-8 text-[#96A4B8]"
      >
        <p>
          Aucun favori pour le moment. Explore le catalogue et clique sur
          « Favori » sur une oeuvre pour la sauvegarder ici.
        </p>
        <div>
          <NuxtLink
            to="/artworks"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6D8BFF]"
          >
            Decouvrir les oeuvres
          </NuxtLink>
        </div>
      </section>
      <section v-else class="grid gap-6 lg:grid-cols-3">
        <ArtworkCard
          v-for="artwork in artworks"
          :key="artwork.id"
          :artwork="artwork"
          :favorite-loading="Boolean(favoriteLoading[artwork.id])"
          :show-favorite-action="true"
          @toggle-favorite="handleFavoriteToggle"
        />
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useRequestHeaders } from "#app";
import { useAuthStore } from "~/stores/auth";
import ArtworkCard from "~/components/marketplace/ArtworkCard.vue";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";

const auth = useAuthStore();
const requestHeaders = import.meta.server
  ? useRequestHeaders(["cookie"])
  : undefined;

const { data, pending, error, refresh } = await useFetch("/api/favorites/me", {
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

async function handleFavoriteToggle(artwork) {
  const success = await toggleFavorite(artwork);

  if (success && !artwork.isFavorite) {
    data.value = {
      artworks: artworks.value.filter((item) => item.id !== artwork.id),
    };
    return;
  }

  if (!success) {
    await refresh();
  }
}

onMounted(async () => {
  if (!auth.user) {
    try {
      await auth.fetchCurrentUser();
      await refresh();
    } catch {
      // Le middleware auth redirige vers /login si la session est invalide.
    }
  }
});
</script>
