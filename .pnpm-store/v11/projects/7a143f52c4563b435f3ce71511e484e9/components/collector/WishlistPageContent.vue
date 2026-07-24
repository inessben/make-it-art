<template>
  <main class="min-h-screen bg-black text-slate-100">
    <div
      class="mx-auto grid w-full max-w-[1440px] gap-8 px-5 py-8 lg:grid-cols-[258px_minmax(0,1fr)] lg:py-0"
    >
      <AccountSettingsSidebar compact />

      <section class="min-w-0 px-0 pb-20 pt-7 lg:px-0 lg:pt-8">
        <header class="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-violet-400">Wishlist</p>
            <h1 class="mt-4 text-title-2 text-slate-100">
              {{ activeTab === "favorites" ? "Your favorite artworks" : "Your collections" }}
            </h1>
            <p class="mt-3 max-w-[510px] text-body-1 leading-6 text-slate-400">
              {{
                activeTab === "favorites"
                  ? "Review saved artworks and manage your default Favorites collection."
                  : "Create personal collections and organize artworks for future acquisitions."
              }}
            </p>
            <p
              v-if="activeTab === 'favorites' && !pending && artworks.length"
              class="mt-3 text-sm font-medium text-violet-200"
            >
              {{ artworks.length }} saved artwork{{ artworks.length === 1 ? "" : "s" }}
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <NuxtLink
              to="/artworks"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-violet-700 px-6 text-sm font-semibold text-black transition hover:bg-violet-600"
            >
              Browse catalogue
            </NuxtLink>
            <NuxtLink
              to="/account-settings"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-750 bg-transparent px-6 text-sm font-semibold text-violet-200 transition hover:border-violet-700"
            >
              Back to profile
            </NuxtLink>
          </div>
        </header>

        <div class="mt-8 inline-flex rounded-2xl border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            class="rounded-[14px] px-5 py-2.5 text-sm font-semibold transition"
            :class="
              activeTab === 'favorites'
                ? 'bg-violet-700 text-black'
                : 'text-violet-200 hover:bg-slate-900'
            "
            @click="setActiveTab('favorites')"
          >
            Favorites
          </button>
          <button
            type="button"
            class="rounded-[14px] px-5 py-2.5 text-sm font-semibold transition"
            :class="
              activeTab === 'collections'
                ? 'bg-violet-700 text-black'
                : 'text-violet-200 hover:bg-slate-900'
            "
            @click="setActiveTab('collections')"
          >
            Collections
          </button>
        </div>

        <div
          v-if="pageMessage"
          class="mt-6 border border-slate-800 bg-slate-950 px-5 py-3 text-footer text-violet-200"
        >
          {{ pageMessage }}
        </div>
        <div
          v-else-if="actionMessage"
          class="mt-6 border border-slate-800 bg-slate-950 px-5 py-3 text-footer text-violet-200"
        >
          {{ actionMessage }}
        </div>

        <section v-if="activeTab === 'favorites'" class="mt-8">
          <AppStatePanel v-if="pending" type="loading" message="Loading your favorites..." />
          <AppStatePanel
            v-else-if="errorMessage"
            type="error"
            title="Unable to load your wishlist"
            :message="errorMessage"
            action-label="Try again"
            @action="refresh"
          />
          <AppStatePanel
            v-else-if="!artworks.length"
            title="Your wishlist is empty"
            message="Explore the marketplace to start saving digital artworks."
          />
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

        <CollectionsPanelContent v-else v-model:page-message="pageMessage" class="mt-8" />
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRequestHeaders, useRoute, useRouter } from "#app";
import AccountSettingsSidebar from "~/components/account/AccountSettingsSidebar.vue";
import ArtworkCard from "~/components/marketplace/ArtworkCard.vue";
import CollectionsPanelContent from "~/components/collector/CollectionsPanelContent.vue";
import { useAuthStore } from "~/stores/auth";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const pageMessage = ref("");

const activeTab = computed(() => (route.query.tab === "collections" ? "collections" : "favorites"));

function setActiveTab(tab) {
  if (tab === "collections") {
    router.replace({ path: "/wishlist", query: { tab: "collections" } });
    return;
  }

  router.replace({ path: "/wishlist" });
}

watch(
  () => route.query.tab,
  () => {
    pageMessage.value = "";
  }
);

const { data, pending, error, refresh } = await useFetch("/api/favorites/me", {
  headers: requestHeaders,
  credentials: "include",
  default: () => ({ artworks: [] })
});

const artworks = computed(() => data.value?.artworks || []);
const errorMessage = computed(() => error.value?.data?.message || "");

const { actionMessage, favoriteLoading, toggleFavorite } = useMarketplaceActions(auth);

async function handleFavoriteToggle(artwork) {
  const success = await toggleFavorite(artwork);

  if (success && !artwork.isFavorite) {
    data.value = {
      artworks: artworks.value.filter((item) => item.id !== artwork.id)
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
      // Auth middleware redirects invalid sessions to /login.
    }
  }
});
</script>
