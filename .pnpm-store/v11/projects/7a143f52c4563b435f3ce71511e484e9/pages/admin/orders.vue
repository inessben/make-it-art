<template>
  <AdminShell
    title="Orders"
    description="Track orders using live backend data, search and status filters."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300 disabled:opacity-50"
        :disabled="loading"
        @click="loadOrders(true)"
      >
        {{ loading ? "Refreshing..." : "Refresh orders" }}
      </button>
    </template>

    <section class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <article
        v-for="summaryCard in summaries"
        :key="summaryCard.label"
        class="min-h-[128px] border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6"
      >
        <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">
          {{ summaryCard.label }}
        </p>
        <p class="mt-5 text-title-3 text-slate-100">
          {{ summaryCard.value }}
        </p>
        <p class="mt-2 text-subtitle-3 text-slate-500">
          {{ summaryCard.description }}
        </p>
      </article>
    </section>

    <section
      class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6"
    >
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">
            Orders list
          </p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">
            Order tracking
          </h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="border border-slate-800 bg-black px-4 py-3">
            <span class="sr-only">Search orders</span>
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search by order or customer"
              class="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>
          <label class="border border-slate-800 bg-black px-4 py-3">
            <span class="sr-only">Filter orders</span>
            <select
              v-model="statusFilter"
              class="w-full bg-transparent text-sm text-slate-100 outline-none"
            >
              <option value="all">All statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
            </select>
          </label>
        </div>
      </div>

      <AppStatePanel
        v-if="successMessage"
        class="mt-6"
        compact
        type="success"
        :message="successMessage"
      />
      <div
        v-if="errorMessage"
        class="mt-6 border border-red-900 bg-red-950 px-5 py-4 text-sm text-red-200"
      >
        {{ errorMessage }}
      </div>

      <div
        v-else-if="loading"
        class="mt-6 border border-slate-800 bg-black px-5 py-4 text-sm text-slate-400"
      >
        Loading orders...
      </div>

      <div
        v-else-if="filteredOrders.length === 0"
        class="mt-6 border border-slate-800 bg-black px-5 py-4 text-sm text-slate-400"
      >
        No orders match the current filters.
      </div>

      <div v-else class="mt-6 overflow-hidden border border-slate-800">
        <p
          class="border-b border-slate-800 px-4 py-3 text-subtitle-3 text-slate-500 sm:hidden"
        >
          Swipe horizontally to view every column.
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-[760px] divide-y divide-slate-800 sm:min-w-full">
            <thead class="bg-slate-950">
              <tr
                class="text-left text-xs uppercase tracking-widest text-slate-500"
              >
                <th class="px-5 py-4 font-medium">Order</th>
                <th class="px-5 py-4 font-medium">Customer</th>
                <th class="px-5 py-4 font-medium">Status</th>
                <th class="px-5 py-4 font-medium">Amount</th>
                <th class="px-5 py-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800 bg-black/20">
              <tr v-for="order in filteredOrders" :key="order.id">
                <td class="px-5 py-4">
                  <p class="font-semibold text-slate-100">
                    {{ order.reference }}
                  </p>
                  <p class="mt-1 text-sm text-slate-400">
                    {{ order.itemsCount }} items
                  </p>
                </td>
                <td class="px-5 py-4">
                  <p class="text-sm text-slate-100">{{ order.customer }}</p>
                  <p class="mt-1 text-sm text-slate-400">
                    {{ order.customerEmail }}
                  </p>
                </td>
                <td class="px-5 py-4">
                  <span
                    class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                    :class="statusClass(order.status)"
                  >
                    {{ order.status }}
                  </span>
                </td>
                <td class="px-5 py-4 text-sm text-slate-100">
                  {{ order.amount }}
                </td>
                <td class="px-5 py-4 text-sm text-slate-400">
                  {{ formatDate(order.createdAt) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </AdminShell>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo } from "#app";

definePageMeta({
  middleware: "admin",
});

const loading = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const searchTerm = ref("");
const statusFilter = ref("all");
const orders = ref([]);
const summary = ref({
  totalOrders: 0,
  paidOrders: 0,
  pendingOrders: 0,
  refundedOrders: 0,
});

const summaries = computed(() => [
  {
    label: "Total orders",
    value: summary.value.totalOrders,
    description: "Total number of orders in the database.",
  },
  {
    label: "Paid orders",
    value: summary.value.paidOrders,
    description: "Orders marked as paid.",
  },
  {
    label: "Pending orders",
    value: summary.value.pendingOrders,
    description: "Orders still pending.",
  },
  {
    label: "Refunded orders",
    value: summary.value.refundedOrders,
    description: "Refunded orders.",
  },
]);

const filteredOrders = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return orders.value.filter((order) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      order.reference.toLowerCase().includes(normalizedSearch) ||
      order.customer.toLowerCase().includes(normalizedSearch) ||
      order.customerEmail.toLowerCase().includes(normalizedSearch);

    const matchesStatus =
      statusFilter.value === "all" || order.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});

onMounted(async () => {
  await loadOrders();
});

async function loadOrders(showSuccess = false) {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await $fetch("/api/admin/orders", {
      credentials: "include",
    });

    orders.value = response.orders || [];
    summary.value = response.summary || summary.value;
    if (showSuccess) {
      successMessage.value = "Order data refreshed successfully.";
    }
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to load admin orders.";
  } finally {
    loading.value = false;
  }
}

function statusClass(status) {
  if (status === "Paid") {
    return "bg-violet-700/10 text-violet-700";
  }

  if (status === "Refunded") {
    return "bg-red-950 text-red-300";
  }

  return "bg-amber-950 text-amber-300";
}

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}
</script>
