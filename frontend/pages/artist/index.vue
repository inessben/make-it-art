<template>
  <ArtistShell
    title="Dashboard artiste"
    description="Vue metier de vos ventes, revenus, performances et analytics sur les 6 derniers mois."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20"
        :disabled="loading"
        @click="loadDashboard"
      >
        {{ loading ? "Actualisation..." : "Actualiser" }}
      </button>
    </template>

    <section class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <article
        v-for="statCard in stats"
        :key="statCard.label"
        class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6"
      >
        <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
          {{ statCard.label }}
        </p>
        <p class="mt-4 text-3xl font-semibold text-white">
          {{ statCard.value }}
        </p>
        <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">
          {{ statCard.description }}
        </p>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Analytics</p>
            <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Ventes sur 6 mois</h2>
          </div>
          <span class="rounded-full bg-[#4A6CF7]/10 px-4 py-2 text-sm font-semibold text-[#4A6CF7]">
            Live data
          </span>
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
          Chargement du dashboard...
        </div>

        <div v-else class="mt-8 grid gap-6">
          <div class="grid grid-cols-6 items-end gap-3">
            <div
              v-for="month in analytics.salesByMonth"
              :key="month.label"
              class="flex flex-col items-center gap-3"
            >
              <div class="flex h-40 w-full items-end rounded-2xl bg-[#01050E] px-2 pb-2">
                <div
                  class="w-full rounded-xl bg-[#4A6CF7] transition-all"
                  :style="{ height: `${barHeight(month.grossRevenueValue)}%` }"
                />
              </div>
              <div class="text-center">
                <p class="text-xs font-semibold text-[#E6EDF7]">
                  {{ month.salesCount }}
                </p>
                <p class="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#7F8A99]">
                  {{ month.label }}
                </p>
              </div>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div
              v-for="metric in performanceCards"
              :key="metric.label"
              class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-4"
            >
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
                {{ metric.label }}
              </p>
              <p class="mt-3 text-2xl font-semibold text-white">
                {{ metric.value }}
              </p>
              <p class="mt-2 text-sm text-[#A0ADB4]">{{ metric.description }}</p>
            </div>
          </div>
        </div>
      </article>

      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Top oeuvres</p>
        <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Meilleures performances</h2>

        <div
          v-if="!loading && analytics.topArtworks.length === 0"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
        >
          Aucune vente enregistree pour le moment.
        </div>

        <div v-else class="mt-6 grid gap-3">
          <div
            v-for="artwork in analytics.topArtworks"
            :key="artwork.artworkId"
            class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-4"
          >
            <p class="text-sm font-semibold text-[#E6EDF7]">{{ artwork.title }}</p>
            <p class="mt-2 text-sm text-[#A0ADB4]">
              {{ artwork.salesCount }} vente(s) · {{ artwork.grossRevenue }}
            </p>
          </div>
        </div>
      </article>
    </section>

    <section class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Activite recente</p>
          <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Dernieres ventes</h2>
        </div>
        <NuxtLink
          to="/artist/sales"
          class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        >
          Voir toutes les ventes
        </NuxtLink>
      </div>

      <div
        v-if="!loading && recentSales.length === 0"
        class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
      >
        Les ventes apparaitront ici des qu'un collectionneur finalisera un achat.
      </div>

      <div v-else class="mt-6 overflow-hidden rounded-[22px] border border-[#1A1F2A]">
        <table class="min-w-full divide-y divide-[#1A1F2A] text-left text-sm">
          <thead class="bg-[#01050E] text-xs uppercase tracking-[0.16em] text-[#7F8A99]">
            <tr>
              <th class="px-5 py-4 font-semibold">Commande</th>
              <th class="px-5 py-4 font-semibold">Oeuvre</th>
              <th class="px-5 py-4 font-semibold">Acheteur</th>
              <th class="px-5 py-4 font-semibold">Montant net</th>
              <th class="px-5 py-4 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#1A1F2A] bg-[#050916]">
            <tr v-for="sale in recentSales" :key="sale.id">
              <td class="px-5 py-4 font-semibold text-[#E6EDF7]">{{ sale.reference }}</td>
              <td class="px-5 py-4 text-[#D8E1F0]">{{ sale.artworkTitle }}</td>
              <td class="px-5 py-4 text-[#A0ADB4]">{{ sale.buyer }}</td>
              <td class="px-5 py-4 font-semibold text-[#9DB2FF]">{{ sale.netAmount }}</td>
              <td class="px-5 py-4 text-[#7F8A99]">{{ formatDate(sale.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </ArtistShell>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo } from "#app";

definePageMeta({
  middleware: "artist"
});

const loading = ref(true);
const errorMessage = ref("");
const stats = ref([]);
const performance = ref({});
const analytics = ref({
  salesByMonth: [],
  topArtworks: []
});
const recentSales = ref([]);

const performanceCards = computed(() => {
  const data = performance.value || {};

  return [
    {
      label: "Croissance",
      value: `${data.revenueGrowthPercent ?? 0}%`,
      description: "Evolution du CA vs mois precedent."
    },
    {
      label: "Panier moyen",
      value: data.avgSaleValue || "EUR 0.00",
      description: "Montant moyen par vente confirmee."
    },
    {
      label: "Conversion",
      value: `${data.conversionRate ?? 0}%`,
      description: "Ratio ventes / favoris sur votre catalogue."
    }
  ];
});

const maxMonthlyRevenue = computed(() =>
  Math.max(...(analytics.value.salesByMonth || []).map((month) => month.grossRevenueValue || 0), 1)
);

onMounted(async () => {
  await loadDashboard();
});

function barHeight(value) {
  const normalized = ((value || 0) / maxMonthlyRevenue.value) * 100;
  return Math.max(normalized, value > 0 ? 8 : 0);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

async function loadDashboard() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/artists/me/dashboard", {
      credentials: "include"
    });

    stats.value = response.stats || [];
    performance.value = response.performance || {};
    analytics.value = response.analytics || {
      salesByMonth: [],
      topArtworks: []
    };
    recentSales.value = response.recentSales || [];
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/artist-profile");
      return;
    }

    errorMessage.value = error?.data?.message || "Impossible de charger le dashboard artiste.";
  } finally {
    loading.value = false;
  }
}
</script>
