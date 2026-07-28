<!-- Keep the history route beside /orders/[id] so Nuxt renders the detail page directly. -->
<template>
  <main class="min-h-screen bg-black text-slate-100">
    <div
      class="mx-auto grid w-full max-w-[1440px] gap-8 px-5 py-8 lg:grid-cols-[258px_minmax(0,1fr)] lg:py-0"
    >
      <AccountSettingsSidebar compact />

      <section class="min-w-0 pb-20 pt-7 lg:pt-12">
        <header class="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 class="text-title-2 uppercase">Order History</h1>
            <p class="mt-3 max-w-[620px] text-body-1 leading-6 text-slate-100">
              A cryptographic record of your acquisitions. All assets are verified through their
              marketplace provenance.
            </p>
          </div>

          <div class="flex flex-wrap gap-1">
            <label class="relative">
              <span class="sr-only">Filter orders by status</span>
              <select
                v-model="selectedStatus"
                class="h-9 appearance-none border border-slate-800 bg-slate-950 px-7 text-subtitle-2 uppercase text-slate-100 outline-none focus:border-violet-600"
              >
                <option value="all">Filter</option>
                <option v-for="status in availableStatuses" :key="status" :value="status">
                  {{ status }}
                </option>
              </select>
            </label>
            <button
              type="button"
              class="h-9 border border-slate-800 bg-slate-950 px-7 text-subtitle-2 uppercase tracking-[0.08em] transition-colors hover:border-violet-600"
              :disabled="!transactions.length"
              @click="exportCsv"
            >
              Export CSV
            </button>
          </div>
        </header>

        <section class="mt-12 grid gap-6 md:grid-cols-2" aria-label="Order summary">
          <article class="min-h-[106px] rounded border border-slate-800 bg-slate-950/70 px-6 py-6">
            <p class="text-subtitle-2 uppercase text-slate-100">Total collected</p>
            <p class="mt-3 text-title-3 text-slate-400">
              {{ transactions.length }} {{ transactions.length === 1 ? "Artwork" : "Artworks" }}
            </p>
          </article>
          <article class="min-h-[106px] rounded border border-slate-800 bg-slate-950/70 px-6 py-6">
            <p class="text-subtitle-2 uppercase text-slate-100">Portfolio value</p>
            <p class="mt-3 text-title-3 text-slate-400">{{ formattedPortfolioValue }}</p>
          </article>
        </section>

        <section class="mt-12 overflow-hidden rounded border border-slate-800 bg-slate-950/70">
          <AppStatePanel v-if="loading" type="loading" message="Loading your order history..." />
          <AppStatePanel
            v-else-if="error"
            type="error"
            title="Unable to load your orders"
            :message="error"
          />
          <AppStatePanel
            v-else-if="!filteredTransactions.length"
            title="No matching acquisitions"
            message="No purchase matches the selected filter."
          />

          <template v-else>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[920px] table-fixed border-collapse text-left">
                <thead>
                  <tr
                    class="h-16 border-b border-slate-800 text-subtitle-2 uppercase text-slate-100"
                  >
                    <th class="w-[35%] px-6 font-normal">Artwork</th>
                    <th class="w-[15%] px-4 font-normal">Status</th>
                    <th class="w-[24%] px-4 font-normal">Purchase date</th>
                    <th class="w-[12%] px-4 text-right font-normal">Value</th>
                    <th class="w-[14%] px-6 text-right font-normal">Blockchain</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="transaction in visibleTransactions"
                    :key="transaction.key"
                    class="h-[112px] border-b border-slate-800 last:border-b-0"
                  >
                    <td class="px-0">
                      <div class="flex items-center gap-6">
                        <div
                          class="h-16 w-16 shrink-0 border border-slate-800 bg-black"
                          aria-label="Artwork media placeholder"
                        />
                        <div class="min-w-0">
                          <NuxtLink
                            v-if="transaction.publicDetailAvailable"
                            :to="`/artworks/${transaction.artworkId}`"
                            class="block truncate text-body-1 uppercase transition-colors hover:text-violet-400"
                          >
                            {{ transaction.title }}
                          </NuxtLink>
                          <p v-else class="truncate text-body-1 uppercase">
                            {{ transaction.title }}
                          </p>
                          <NuxtLink
                            :to="`/orders/${transaction.orderId}`"
                            class="mt-1 block text-subtitle-2 text-slate-100 transition-colors hover:text-violet-400"
                          >
                            {{ transaction.orderNumber }}
                          </NuxtLink>
                          <span class="mt-1 block text-xs uppercase text-violet-300">
                            {{ transaction.licenseLabel }}
                          </span>
                          <span
                            v-if="!transaction.publicDetailAvailable"
                            class="mt-1 block text-xs text-slate-400"
                          >
                            Retirée du catalogue · preuve d’achat conservée
                          </span>
                        </div>
                      </div>
                    </td>
                    <td class="px-4">
                      <span
                        class="inline-flex border border-slate-500 bg-slate-800 px-3 py-1 text-subtitle-2 uppercase text-slate-400"
                      >
                        {{ transaction.status }}
                      </span>
                    </td>
                    <td class="px-4 text-body-1 uppercase">
                      {{ formatOrderDate(transaction.date) }}
                    </td>
                    <td class="px-4 text-right text-body-1 text-slate-400">
                      {{ formatMoney(transaction.value, transaction.currency) }}
                    </td>
                    <td class="px-6 text-right">
                      <NuxtLink
                        v-if="transaction.publicDetailAvailable"
                        :to="`/artworks/${transaction.artworkId}`"
                        class="text-subtitle-2 uppercase tracking-[0.06em] text-slate-400 transition-colors hover:text-violet-400"
                      >
                        Provenance ↗
                      </NuxtLink>
                      <NuxtLink
                        v-else
                        :to="`/orders/${transaction.orderId}`"
                        class="text-subtitle-2 uppercase tracking-[0.06em] text-slate-400 transition-colors hover:text-violet-400"
                      >
                        Détails privés ↗
                      </NuxtLink>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <footer
              class="flex min-h-20 flex-col gap-5 border-t border-slate-800 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="text-subtitle-2 uppercase">
                Showing {{ rangeStart }}–{{ rangeEnd }} of {{ filteredTransactions.length }}
                transactions
              </p>
              <nav class="flex items-center gap-1" aria-label="Order history pagination">
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center border border-slate-800 text-body-1 disabled:opacity-30"
                  :disabled="currentPage === 1"
                  aria-label="Previous page"
                  @click="goToPage(currentPage - 1)"
                >
                  ‹
                </button>
                <button
                  v-for="page in totalPages"
                  :key="page"
                  type="button"
                  class="flex h-8 min-w-8 items-center justify-center border px-2 text-body-1"
                  :class="
                    page === currentPage
                      ? 'border-slate-500 bg-slate-800 text-slate-400'
                      : 'border-slate-800 text-slate-100'
                  "
                  :aria-current="page === currentPage ? 'page' : undefined"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </button>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center border border-slate-800 text-body-1 disabled:opacity-30"
                  :disabled="currentPage === totalPages"
                  aria-label="Next page"
                  @click="goToPage(currentPage + 1)"
                >
                  ›
                </button>
              </nav>
            </footer>
          </template>
        </section>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "#app";
import AccountSettingsSidebar from "~/components/account/AccountSettingsSidebar.vue";
import { getOrderStatusPresentation } from "~/utils/order-status";
import { formatArtworkLicenseType } from "~/utils/marketplace";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const router = useRouter();
const orders = ref([]);
const loading = ref(true);
const error = ref("");
const selectedStatus = ref("all");
const pageSize = 4;

const transactions = computed(() =>
  orders.value.flatMap((order) =>
    (order.items || []).map((item, index) => ({
      key: `${order.id}-${item.id || item.artworkId}-${index}`,
      orderId: order.id,
      orderNumber: order.reference || order.number || `#${order.id}`,
      artworkId: item.artworkId,
      title: item.title || "Untitled artwork",
      publicDetailAvailable: Boolean(item.publicAccess?.publicDetailAvailable),
      licenseLabel: formatArtworkLicenseType(item.licenseType),
      status: getOrderStatusPresentation(order.status).title,
      date: order.createdAt,
      value:
        Number(item.subtotalAmount) ||
        (Number(item.unitAmount) || 0) * Math.max(Number(item.quantity) || 1, 1),
      currency: item.currency || order.currency || "EUR"
    }))
  )
);

const availableStatuses = computed(() => [
  ...new Set(transactions.value.map((transaction) => transaction.status).filter(Boolean))
]);
const filteredTransactions = computed(() =>
  selectedStatus.value === "all"
    ? transactions.value
    : transactions.value.filter((transaction) => transaction.status === selectedStatus.value)
);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredTransactions.value.length / pageSize))
);
const currentPage = computed(() => {
  const parsedPage = Number.parseInt(String(route.query.page || "1"), 10);
  return Math.min(Math.max(Number.isInteger(parsedPage) ? parsedPage : 1, 1), totalPages.value);
});
const visibleTransactions = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredTransactions.value.slice(start, start + pageSize);
});
const rangeStart = computed(() =>
  filteredTransactions.value.length ? (currentPage.value - 1) * pageSize + 1 : 0
);
const rangeEnd = computed(() =>
  Math.min(currentPage.value * pageSize, filteredTransactions.value.length)
);
const portfolioValue = computed(() =>
  orders.value.reduce((total, order) => total + (Number(order.amount) || 0), 0)
);
const portfolioCurrency = computed(() => orders.value[0]?.currency || "EUR");
const formattedPortfolioValue = computed(() =>
  formatMoney(portfolioValue.value, portfolioCurrency.value)
);

watch(selectedStatus, () => goToPage(1));

onMounted(async () => {
  try {
    const response = await $fetch("/api/v1/orders", {
      method: "GET",
      credentials: "include"
    });
    orders.value = Array.isArray(response?.orders) ? response.orders : [];
  } catch (fetchError) {
    error.value = fetchError?.data?.message || "Unable to load your order history.";
  } finally {
    loading.value = false;
  }
});

function formatMoney(value, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "EUR").toUpperCase()
  }).format((Number(value) || 0) / 100);
}

function formatOrderDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
    timeZoneName: "short"
  }).format(new Date(value));
}

async function goToPage(page) {
  const nextPage = Math.min(Math.max(Number(page) || 1, 1), totalPages.value);
  const query = { ...route.query };
  if (nextPage === 1) delete query.page;
  else query.page = String(nextPage);
  await router.push({ path: route.path, query });
}

function exportCsv() {
  if (!import.meta.client || !transactions.value.length) return;
  const rows = [
    ["Artwork", "Order", "Status", "Purchase date", "Value"],
    ...transactions.value.map((transaction) => [
      transaction.title,
      transaction.orderNumber,
      transaction.status,
      formatOrderDate(transaction.date),
      formatMoney(transaction.value, transaction.currency)
    ])
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "make-it-art-order-history.csv";
  link.click();
  URL.revokeObjectURL(url);
}
</script>
