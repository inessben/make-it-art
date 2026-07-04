<template>
  <AdminShell
    title="Orders"
    description="Suivi admin des commandes avec vraies donnees backend, recherche et filtres de statut."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        :disabled="loading"
        @click="loadOrders"
      >
        {{ loading ? "Refreshing..." : "Refresh orders" }}
      </button>
    </template>

    <section class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <article
        v-for="summaryCard in summaries"
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
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
            Orders list
          </p>
          <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">
            Suivi des commandes
          </h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label
            class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3"
          >
            <span class="sr-only">Search orders</span>
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search by order or customer"
              class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none placeholder:text-[#6D7A88]"
            />
          </label>
          <label
            class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3"
          >
            <span class="sr-only">Filter orders</span>
            <select
              v-model="statusFilter"
              class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none"
            >
              <option value="all">All statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
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
        Chargement des commandes...
      </div>

      <div
        v-else-if="filteredOrders.length === 0"
        class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
      >
        Aucune commande ne correspond aux filtres actuels.
      </div>

      <div
        v-else
        class="mt-6 overflow-hidden rounded-[22px] border border-[#1A1F2A]"
      >
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[#1A1F2A]">
            <thead class="bg-[#01050E]">
              <tr
                class="text-left text-xs uppercase tracking-[0.18em] text-[#6D7A88]"
              >
                <th class="px-5 py-4 font-medium">Order</th>
                <th class="px-5 py-4 font-medium">Customer</th>
                <th class="px-5 py-4 font-medium">Status</th>
                <th class="px-5 py-4 font-medium">Amount</th>
                <th class="px-5 py-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1A1F2A] bg-[#090017]">
              <tr v-for="order in filteredOrders" :key="order.id">
                <td class="px-5 py-4">
                  <p class="font-semibold text-[#E6EDF7]">
                    {{ order.reference }}
                  </p>
                  <p class="mt-1 text-sm text-[#8E9AA7]">
                    {{ order.itemsCount }} items
                  </p>
                </td>
                <td class="px-5 py-4">
                  <p class="text-sm text-[#D8E1F0]">{{ order.customer }}</p>
                  <p class="mt-1 text-sm text-[#8E9AA7]">
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
                <td class="px-5 py-4 text-sm text-[#D8E1F0]">
                  {{ order.amount }}
                </td>
                <td class="px-5 py-4 text-sm text-[#8E9AA7]">
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
    description: "Nombre total de commandes en base.",
  },
  {
    label: "Paid orders",
    value: summary.value.paidOrders,
    description: "Commandes marquees comme payees.",
  },
  {
    label: "Pending orders",
    value: summary.value.pendingOrders,
    description: "Commandes encore en attente.",
  },
  {
    label: "Refunded orders",
    value: summary.value.refundedOrders,
    description: "Commandes remboursees.",
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

async function loadOrders() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/admin/orders", {
      credentials: "include",
    });

    orders.value = response.orders || [];
    summary.value = response.summary || summary.value;
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
    return "bg-[#4A6CF7]/10 text-[#4A6CF7]";
  }

  if (status === "Refunded") {
    return "bg-[#3A1016] text-[#FCA5A5]";
  }

  return "bg-[#3F2A11] text-[#F2C97D]";
}

function formatDate(value) {
  if (!value) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(value));
}
</script>
