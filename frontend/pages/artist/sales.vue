<template>
  <ArtistShell
    title="Sales"
    description="Business history of your transactions with statuses, commissions, earnings and refunds."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        :disabled="loading"
        @click="loadSales"
      >
        {{ loading ? "Refreshing..." : "Refresh" }}
      </button>
    </template>

    <section class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
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
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">History</p>
            <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Sales journal</h2>
            <p class="mt-3 max-w-3xl text-sm leading-6 text-[#A0ADB4]">
              Filter your sales by order status, earnings availability or free-text search.
            </p>
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

        <div class="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,0.75fr))]">
          <label class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3">
            <span class="sr-only">Search</span>
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Order, artwork or buyer"
              class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none placeholder:text-[#6D7A88]"
            />
          </label>

          <label class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3">
            <span class="sr-only">Filter by order status</span>
            <select
              v-model="statusFilter"
              class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none"
            >
              <option value="all">All order statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Under review">Under review</option>
              <option value="Refunded">Refunded</option>
              <option value="Partially refunded">Partially refunded</option>
              <option value="Failed">Failed</option>
              <option value="Canceled">Canceled</option>
            </select>
          </label>

          <label class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3">
            <span class="sr-only">Filter by earnings status</span>
            <select
              v-model="settlementFilter"
              class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none"
            >
              <option value="all">All earnings states</option>
              <option value="Available">Available</option>
              <option value="Pending">Pending</option>
              <option value="Refund pending">Refund pending</option>
              <option value="Partially refunded">Partially refunded</option>
              <option value="Refunded">Refunded</option>
              <option value="Under review">Under review</option>
              <option value="Failed">Failed</option>
              <option value="Canceled">Canceled</option>
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
        Loading sales...
      </div>

      <div
        v-else-if="filteredSales.length === 0"
        class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
      >
        No sale matches the current filters.
      </div>

      <div v-else class="mt-6 overflow-hidden rounded-[22px] border border-[#1A1F2A]">
        <table class="min-w-full divide-y divide-[#1A1F2A] text-left text-sm">
          <thead class="bg-[#01050E] text-xs uppercase tracking-[0.16em] text-[#7F8A99]">
            <tr>
              <th class="px-5 py-4 font-semibold">Order status</th>
              <th class="px-5 py-4 font-semibold">Artwork</th>
              <th class="px-5 py-4 font-semibold">Buyer</th>
              <th class="px-5 py-4 font-semibold">Order</th>
              <th class="px-5 py-4 font-semibold">Earnings state</th>
              <th class="px-5 py-4 font-semibold">Gross</th>
              <th class="px-5 py-4 font-semibold">Commission</th>
              <th class="px-5 py-4 font-semibold">Available</th>
              <th class="px-5 py-4 font-semibold">Refunded</th>
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
                  :class="orderStatusClass(sale.status)"
                >
                  {{ sale.status }}
                </span>
              </td>
              <td class="px-5 py-4">
                <span
                  class="rounded-full px-3 py-1 text-xs font-semibold"
                  :class="settlementClass(sale.settlementStatus)"
                >
                  {{ sale.settlementStatus }}
                </span>
              </td>
              <td class="px-5 py-4 text-[#DCE7FF]">{{ sale.amount }}</td>
              <td class="px-5 py-4 text-[#A0ADB4]">{{ sale.commissionAmount }}</td>
              <td class="px-5 py-4 font-semibold text-[#9DB2FF]">
                {{ sale.availableEarnings }}
              </td>
              <td class="px-5 py-4 text-[#FECACA]">{{ sale.refundedAmount }}</td>
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
const settlementFilter = ref("all");

const summaryCards = computed(() => [
  {
    label: "Confirmed sales",
    value: summary.value.totalSales ?? 0,
    description: "Transactions that were effectively confirmed on your catalogue."
  },
  {
    label: "Gross revenue",
    value: summary.value.grossRevenue || "EUR 0.00",
    description: "Gross volume collected before commission."
  },
  {
    label: "Artist earnings",
    value: summary.value.artistEarnings || "EUR 0.00",
    description: "Estimated earnings generated by your confirmed sales."
  },
  {
    label: "Available balance",
    value: summary.value.availableBalance || "EUR 0.00",
    description: "Amount currently available for withdrawal tracking."
  },
  {
    label: "Pending balance",
    value: summary.value.pendingBalance || "EUR 0.00",
    description: "Amount still being confirmed."
  },
  {
    label: "Commission",
    value: summary.value.totalCommission || "EUR 0.00",
    description: `Cumulative platform commission (${summary.value.commissionRate || "7% ex VAT"}).`
  }
]);

const filteredSales = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();

  return sales.value.filter((sale) => {
    const matchesOrderStatus = statusFilter.value === "all" || sale.status === statusFilter.value;
    const matchesSettlement =
      settlementFilter.value === "all" || sale.settlementStatus === settlementFilter.value;

    if (!matchesOrderStatus || !matchesSettlement) {
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

const statusBreakdown = computed(() => summary.value.statusBreakdown || []);

onMounted(async () => {
  await loadSales();
});

function orderStatusClass(status) {
  if (status === "Paid") {
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

function settlementClass(status) {
  if (status === "Available") {
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

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
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

    errorMessage.value = error?.data?.message || "Unable to load your sales.";
  } finally {
    loading.value = false;
  }
}
</script>
