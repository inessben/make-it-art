<template>
  <ArtistShell
    title="Ventes"
    description="Historique metier de toutes vos transactions avec statut, acheteur et montants bruts/nets."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        :disabled="loading"
        @click="loadSales"
      >
        {{ loading ? "Actualisation..." : "Actualiser" }}
      </button>
    </template>

    <section class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <article
        v-for="summaryCard in summaryCards"
        :key="summaryCard.label"
        class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6"
      >
        <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
          {{ summaryCard.label }}
        </p>
        <p class="mt-4 text-3xl font-semibold text-white">
          {{ summaryCard.value }}
        </p>
        <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">
          {{ summaryCard.description }}
        </p>
      </article>
    </section>

    <section class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Historique</p>
          <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Toutes vos ventes</h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3">
            <span class="sr-only">Rechercher</span>
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Commande, oeuvre ou acheteur"
              class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none placeholder:text-[#6D7A88]"
            />
          </label>
          <label class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3">
            <span class="sr-only">Filtrer par statut</span>
            <select
              v-model="statusFilter"
              class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="Paid">Payee</option>
              <option value="Pending">En attente</option>
              <option value="Refunded">Remboursee</option>
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
        Chargement des ventes...
      </div>

      <div
        v-else-if="filteredSales.length === 0"
        class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
      >
        Aucune vente ne correspond aux filtres actuels.
      </div>

      <div v-else class="mt-6 overflow-hidden rounded-[22px] border border-[#1A1F2A]">
        <table class="min-w-full divide-y divide-[#1A1F2A] text-left text-sm">
          <thead class="bg-[#01050E] text-xs uppercase tracking-[0.16em] text-[#7F8A99]">
            <tr>
              <th class="px-5 py-4 font-semibold">Commande</th>
              <th class="px-5 py-4 font-semibold">Oeuvre</th>
              <th class="px-5 py-4 font-semibold">Acheteur</th>
              <th class="px-5 py-4 font-semibold">Statut</th>
              <th class="px-5 py-4 font-semibold">Brut</th>
              <th class="px-5 py-4 font-semibold">Net</th>
              <th class="px-5 py-4 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#1A1F2A] bg-[#050916]">
            <tr v-for="sale in filteredSales" :key="sale.id">
              <td class="px-5 py-4 font-semibold text-[#E6EDF7]">{{ sale.reference }}</td>
              <td class="px-5 py-4 text-[#D8E1F0]">{{ sale.artworkTitle }}</td>
              <td class="px-5 py-4 text-[#A0ADB4]">{{ sale.buyer }}</td>
              <td class="px-5 py-4">
                <span
                  class="rounded-full px-3 py-1 text-xs font-semibold"
                  :class="statusClass(sale.status)"
                >
                  {{ sale.status }}
                </span>
              </td>
              <td class="px-5 py-4 text-[#DCE7FF]">{{ sale.amount }}</td>
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
const summary = ref({});
const sales = ref([]);
const searchTerm = ref("");
const statusFilter = ref("all");

const summaryCards = computed(() => [
  {
    label: "Ventes payees",
    value: summary.value.totalSales ?? 0,
    description: "Transactions confirmees sur votre catalogue."
  },
  {
    label: "Revenus bruts",
    value: summary.value.grossRevenue || "EUR 0.00",
    description: "Montant total avant commission plateforme."
  },
  {
    label: "Revenus nets",
    value: summary.value.netRevenue || "EUR 0.00",
    description: `Part artiste apres commission (${summary.value.commissionRate || "7%"}).`
  },
  {
    label: "En attente",
    value: summary.value.pendingSales ?? 0,
    description: "Ventes avec paiement non confirme."
  }
]);

const filteredSales = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();

  return sales.value.filter((sale) => {
    const matchesStatus = statusFilter.value === "all" || sale.status === statusFilter.value;

    if (!matchesStatus) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [sale.reference, sale.artworkTitle, sale.buyer, sale.buyerEmail]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
});

onMounted(async () => {
  await loadSales();
});

function statusClass(status) {
  if (status === "Paid") {
    return "bg-[#12301F] text-[#86EFAC]";
  }

  if (status === "Refunded") {
    return "bg-[#3A1620] text-[#FECACA]";
  }

  return "bg-[#2A2410] text-[#FDE68A]";
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

async function loadSales() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/artists/me/sales", {
      credentials: "include"
    });

    summary.value = response.summary || {};
    sales.value = response.sales || [];
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/artist-profile");
      return;
    }

    errorMessage.value = error?.data?.message || "Impossible de charger vos ventes.";
  } finally {
    loading.value = false;
  }
}
</script>
