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
            <div class="grid gap-4 px-4 py-4 sm:px-6 sm:py-6">
              <article
                v-for="transaction in visibleTransactions"
                :key="transaction.key"
                class="rounded-[24px] border border-[#182033] bg-[linear-gradient(180deg,rgba(8,12,20,0.96)_0%,rgba(5,8,14,0.98)_100%)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
              >
                <div
                  class="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.95fr)_minmax(320px,1fr)]"
                >
                  <div class="min-w-0">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Artwork
                    </p>
                    <div class="mt-4 flex items-start gap-4">
                      <div
                        class="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-[#20283B] bg-[radial-gradient(circle_at_30%_20%,rgba(123,58,237,0.28),transparent_55%),linear-gradient(180deg,#090C13_0%,#04060B_100%)] text-lg font-semibold uppercase text-violet-200"
                        aria-label="Artwork media placeholder"
                      >
                        {{ artworkMonogram(transaction.title) }}
                      </div>
                      <div class="min-w-0">
                        <NuxtLink
                          v-if="transaction.publicDetailAvailable"
                          :to="`/artworks/${transaction.artworkId}`"
                          class="block truncate text-lg font-semibold uppercase tracking-[0.03em] text-white transition-colors hover:text-violet-300"
                        >
                          {{ transaction.title }}
                        </NuxtLink>
                        <p
                          v-else
                          class="truncate text-lg font-semibold uppercase tracking-[0.03em] text-white"
                        >
                          {{ transaction.title }}
                        </p>
                        <span
                          class="mt-2 inline-flex rounded-full border border-violet-500/20 bg-violet-500/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-200"
                        >
                          {{ transaction.licenseLabel }}
                        </span>
                        <p
                          v-if="!transaction.publicDetailAvailable"
                          class="mt-3 text-xs leading-5 text-slate-400"
                        >
                          Removed from the public catalogue. Your purchase proof remains available.
                        </p>
                        <NuxtLink
                          v-if="transaction.publicDetailAvailable"
                          :to="`/artworks/${transaction.artworkId}`"
                          class="mt-3 inline-flex text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:text-violet-300"
                        >
                          Open artwork
                        </NuxtLink>
                      </div>
                    </div>
                  </div>

                  <NuxtLink
                    :to="`/orders/${transaction.orderId}`"
                    class="group flex min-h-[156px] flex-col justify-between rounded-[22px] border border-[#20283B] bg-[linear-gradient(180deg,rgba(12,17,26,0.92)_0%,rgba(9,12,19,0.98)_100%)] p-5 transition duration-200 hover:border-violet-500 hover:bg-[linear-gradient(180deg,rgba(39,21,77,0.32)_0%,rgba(9,12,19,0.98)_100%)]"
                  >
                    <div>
                      <p
                        class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
                      >
                        Order details
                      </p>
                      <p
                        class="mt-3 break-all text-base font-semibold text-white transition-colors group-hover:text-violet-300"
                      >
                        {{ transaction.orderNumber }}
                      </p>
                      <p class="mt-3 text-sm leading-6 text-slate-400">
                        Open the private order page to access invoices, download rights and delivery
                        information.
                      </p>
                    </div>
                    <span
                      class="mt-4 inline-flex text-xs font-semibold uppercase tracking-[0.16em] text-violet-300"
                    >
                      View private order page
                    </span>
                  </NuxtLink>

                  <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <div class="rounded-[18px] border border-[#20283B] bg-black/30 px-4 py-4">
                      <p
                        class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                      >
                        Status
                      </p>
                      <span
                        class="mt-3 inline-flex rounded-full border border-slate-600 bg-slate-800/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200"
                      >
                        {{ transaction.status }}
                      </span>
                    </div>

                    <div class="rounded-[18px] border border-[#20283B] bg-black/30 px-4 py-4">
                      <p
                        class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                      >
                        Purchase date
                      </p>
                      <p class="mt-3 text-sm font-medium uppercase leading-6 text-slate-100">
                        {{ formatOrderDate(transaction.date) }}
                      </p>
                    </div>

                    <div class="rounded-[18px] border border-[#20283B] bg-black/30 px-4 py-4">
                      <p
                        class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                      >
                        Value
                      </p>
                      <p class="mt-3 text-lg font-semibold text-slate-100">
                        {{ formatMoney(transaction.value, transaction.currency) }}
                      </p>
                      <NuxtLink
                        v-if="transaction.publicDetailAvailable"
                        :to="`/artworks/${transaction.artworkId}`"
                        class="mt-3 inline-flex text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:text-violet-300"
                      >
                        Provenance
                      </NuxtLink>
                      <NuxtLink
                        v-else
                        :to="`/orders/${transaction.orderId}`"
                        class="mt-3 inline-flex text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:text-violet-300"
                      >
                        Private details
                      </NuxtLink>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <footer
              class="flex min-h-20 flex-col gap-5 border-t border-slate-800 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="text-subtitle-2 uppercase">
                Showing {{ rangeStart }}-{{ rangeEnd }} of {{ filteredTransactions.length }}
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
                  &lt;
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
                  >
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
      orderItemId: item.id,
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
  if (!value) return "-";
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

function artworkMonogram(title) {
  return String(title || "A")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}
</script>
