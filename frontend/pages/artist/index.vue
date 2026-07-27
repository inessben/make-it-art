<template>
  <ArtistShell
    title="Dashboard artiste"
    description="Vue metier de vos ventes, gains, commissions et signaux business sur les 6 derniers mois."
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

    <div
      v-if="errorMessage"
      class="rounded-2xl border border-[#7f1d1d] bg-[#2b1014] px-5 py-4 text-sm text-[#FECACA]"
    >
      {{ errorMessage }}
    </div>

    <section class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
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

    <section class="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Analytics</p>
            <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Evolution des ventes</h2>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-[#A0ADB4]">
              Lecture rapide de votre activite commerciale avec gains confirmes, progression et
              rythme de conversion.
            </p>
          </div>
          <span class="rounded-full bg-[#4A6CF7]/10 px-4 py-2 text-sm font-semibold text-[#4A6CF7]">
            6 derniers mois
          </span>
        </div>

        <div
          v-if="loading"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
        >
          Chargement du dashboard...
        </div>

        <div v-else class="mt-8 grid gap-8">
          <div class="grid grid-cols-6 gap-3">
            <div
              v-for="month in analytics.salesByMonth"
              :key="month.label"
              class="flex min-w-0 flex-col gap-3"
            >
              <div class="flex h-44 items-end rounded-2xl bg-[#01050E] p-2">
                <div
                  class="w-full rounded-xl bg-gradient-to-t from-[#4A6CF7] to-[#7C8FFF] transition-all"
                  :style="{ height: `${barHeight(month.availableEarningsValue)}%` }"
                />
              </div>
              <div class="space-y-1 text-center">
                <p class="text-xs font-semibold text-[#E6EDF7]">{{ month.salesCount }} vente(s)</p>
                <p class="text-[11px] uppercase tracking-[0.16em] text-[#7F8A99]">
                  {{ month.label }}
                </p>
                <p class="text-xs text-[#9DB2FF]">
                  {{ month.availableEarnings }}
                </p>
              </div>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">
                {{ metric.description }}
              </p>
            </div>
          </div>

          <div class="rounded-[22px] border border-[#1A1F2A] bg-[#01050E] p-5">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Pipeline</p>
                <h3 class="mt-2 text-lg font-semibold text-[#E6EDF7]">Etat de vos gains</h3>
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="status in statusBreakdown"
                  :key="status.status"
                  class="rounded-full px-3 py-1 text-xs font-semibold"
                  :class="settlementClass(status.status)"
                >
                  {{ status.status }} - {{ status.count }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>

      <div class="grid gap-4">
        <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Cash flow</p>
          <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Gains et retraits</h2>
          <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">
            Lecture operationnelle de ce qui est disponible, encore en attente ou impacte par des
            remboursements.
          </p>

          <div class="mt-6 grid gap-3">
            <div
              v-for="card in financeCards"
              :key="card.label"
              class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-4"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
                    {{ card.label }}
                  </p>
                  <p class="mt-3 text-2xl font-semibold text-white">
                    {{ card.value }}
                  </p>
                </div>
                <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="card.badgeClass">
                  {{ card.badge }}
                </span>
              </div>
              <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">
                {{ card.description }}
              </p>
            </div>
          </div>

          <div class="mt-6 rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-4">
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Retraits</p>
            <p class="mt-3 text-lg font-semibold text-[#E6EDF7]">
              {{ finance.withdrawalMode || "Manual settlement" }}
            </p>
            <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">
              {{ finance.withdrawalNote || defaultWithdrawalNote }}
            </p>
          </div>
        </article>

        <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Top oeuvres</p>
              <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Performances catalogue</h2>
            </div>
            <NuxtLink
              to="/artist/sales"
              class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-4 py-2 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
            >
              Voir les ventes
            </NuxtLink>
          </div>

          <div
            v-if="!loading && analytics.topArtworks.length === 0"
            class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
          >
            Aucune oeuvre vendue pour le moment.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <div
              v-for="artwork in analytics.topArtworks"
              :key="artwork.artworkId"
              class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-4"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-[#E6EDF7]">
                    {{ artwork.title }}
                  </p>
                  <p class="mt-2 text-sm text-[#A0ADB4]">{{ artwork.salesCount }} vente(s)</p>
                </div>
                <div class="text-right text-sm">
                  <p class="font-semibold text-[#9DB2FF]">{{ artwork.artistEarnings }}</p>
                  <p class="mt-1 text-[#7F8A99]">{{ artwork.grossRevenue }}</p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Activite recente</p>
            <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Dernieres ventes</h2>
          </div>
          <NuxtLink
            to="/artist/sales"
            class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
          >
            Ouvrir le journal complet
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
                <th class="px-5 py-4 font-semibold">Brut</th>
                <th class="px-5 py-4 font-semibold">Commission</th>
                <th class="px-5 py-4 font-semibold">Gain</th>
                <th class="px-5 py-4 font-semibold">Etat</th>
                <th class="px-5 py-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1A1F2A] bg-[#050916]">
              <tr v-for="sale in recentSales" :key="sale.id">
                <td class="px-5 py-4 font-semibold text-[#E6EDF7]">{{ sale.reference }}</td>
                <td class="px-5 py-4 text-[#D8E1F0]">{{ sale.artworkTitle }}</td>
                <td class="px-5 py-4 text-[#A0ADB4]">{{ sale.buyer }}</td>
                <td class="px-5 py-4 text-[#DCE7FF]">{{ sale.amount }}</td>
                <td class="px-5 py-4 text-[#A0ADB4]">{{ sale.commissionAmount }}</td>
                <td class="px-5 py-4 font-semibold text-[#9DB2FF]">
                  {{ sale.availableEarnings }}
                </td>
                <td class="px-5 py-4">
                  <span
                    class="rounded-full px-3 py-1 text-xs font-semibold"
                    :class="settlementClass(sale.settlementStatus)"
                  >
                    {{ sale.settlementStatus }}
                  </span>
                </td>
                <td class="px-5 py-4 text-[#7F8A99]">{{ formatDate(sale.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Notifications</p>
            <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Centre d'alertes</h2>
          </div>
          <NuxtLink
            to="/notifications"
            class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-4 py-2 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
          >
            {{ notifications.unreadCount || 0 }} non lue(s)
          </NuxtLink>
        </div>

        <div
          v-if="!loading && notificationItems.length === 0"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
        >
          Aucune notification recente pour le moment.
        </div>

        <div v-else class="mt-6 grid gap-3">
          <div
            v-for="notification in notificationItems"
            :key="notification.id"
            class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]"
                    :class="notificationClass(notification.type)"
                  >
                    {{ notificationLabel(notification.type) }}
                  </span>
                  <span v-if="!notification.read" class="text-xs font-semibold text-[#4A6CF7]">
                    Nouveau
                  </span>
                </div>
                <h3 class="mt-4 text-sm font-semibold text-[#E6EDF7]">
                  {{ notification.title }}
                </h3>
                <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">
                  {{ notification.message }}
                </p>
              </div>
              <span class="shrink-0 text-xs uppercase tracking-[0.12em] text-[#7F8A99]">
                {{ formatDate(notification.createdAt) }}
              </span>
            </div>
          </div>
        </div>
      </article>
    </section>
  </ArtistShell>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo } from "#app";

definePageMeta({
  middleware: "artist"
});

const defaultWithdrawalNote =
  "Les retraits automatiques ne sont pas encore connectes. Utilisez ce solde pour piloter vos versements manuels.";

const loading = ref(true);
const errorMessage = ref("");
const stats = ref([]);
const performance = ref({});
const finance = ref({});
const analytics = ref({
  salesByMonth: [],
  topArtworks: [],
  statusBreakdown: []
});
const notifications = ref({
  unreadCount: 0,
  items: []
});
const recentSales = ref([]);

const performanceCards = computed(() => {
  const data = performance.value || {};

  return [
    {
      label: "Croissance",
      value: `${data.revenueGrowthPercent ?? 0}%`,
      description: "Evolution des gains disponibles vs mois precedent."
    },
    {
      label: "Panier moyen",
      value: data.avgSaleValue || "EUR 0.00",
      description: "Montant brut moyen par vente confirmee."
    },
    {
      label: "Conversion",
      value: `${data.conversionRate ?? 0}%`,
      description: "Ratio ventes / favoris sur votre catalogue."
    },
    {
      label: "Audience",
      value: `${data.followersTotal ?? 0} followers`,
      description: `${data.artworksTotal ?? 0} oeuvre(s) publiee(s) dans votre studio.`
    }
  ];
});

const financeCards = computed(() => {
  const data = finance.value || {};

  return [
    {
      label: "Disponible",
      value: data.availableBalance || "EUR 0.00",
      description: "Gains confirmes actuellement disponibles pour votre suivi de retrait.",
      badge: "Ready",
      badgeClass: "bg-[#12301F] text-[#86EFAC]"
    },
    {
      label: "En attente",
      value: data.pendingBalance || "EUR 0.00",
      description: "Montant encore bloque tant que le paiement n'est pas totalement securise.",
      badge: "Pending",
      badgeClass: "bg-[#2A2410] text-[#FDE68A]"
    },
    {
      label: "Remboursements",
      value: data.refundedAmount || "EUR 0.00",
      description: "Part brute deja remboursee ou retiree de votre activite.",
      badge: `${data.refundCount ?? 0} dossier(s)`,
      badgeClass: "bg-[#3A1620] text-[#FECACA]"
    },
    {
      label: "Commission",
      value: data.totalCommission || "EUR 0.00",
      description: `Commission plateforme cumulee (${data.commissionRate || "7% HT"}).`,
      badge: "Platform",
      badgeClass: "bg-[#1E2540] text-[#9DB2FF]"
    }
  ];
});

const statusBreakdown = computed(() => analytics.value.statusBreakdown || []);
const notificationItems = computed(() => notifications.value.items || []);

const maxMonthlyRevenue = computed(() =>
  Math.max(
    ...(analytics.value.salesByMonth || []).map((month) => month.availableEarningsValue || 0),
    1
  )
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
    return "-";
  }

  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function settlementClass(status) {
  if (status === "Available" || status === "Paid") {
    return "bg-[#12301F] text-[#86EFAC]";
  }

  if (status === "Refunded" || status === "Partially refunded") {
    return "bg-[#3A1620] text-[#FECACA]";
  }

  if (status === "Under review") {
    return "bg-[#1E2540] text-[#9DB2FF]";
  }

  if (status === "Failed" || status === "Canceled") {
    return "bg-[#30111A] text-[#FCA5A5]";
  }

  return "bg-[#2A2410] text-[#FDE68A]";
}

function notificationLabel(type) {
  return type === "sale" ? "Vente" : "Systeme";
}

function notificationClass(type) {
  return type === "sale" ? "bg-[#12301F] text-[#86EFAC]" : "bg-[#1E2540] text-[#9DB2FF]";
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
    finance.value = response.finance || {};
    analytics.value = response.analytics || {
      salesByMonth: [],
      topArtworks: [],
      statusBreakdown: []
    };
    notifications.value = response.notifications || {
      unreadCount: 0,
      items: []
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
