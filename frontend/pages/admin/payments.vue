<template>
  <AdminShell
    title="Payments"
    description="Vue finance branchee au backend pour suivre les transactions et le revenu observe en base."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20"
        :disabled="loading"
        @click="loadPayments"
      >
        {{ loading ? "Refreshing..." : "Refresh payments" }}
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
        <p class="mt-4 text-3xl font-semibold text-white">{{ summaryCard.value }}</p>
        <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">{{ summaryCard.description }}</p>
      </article>
    </section>

    <section class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Transactions</p>
          <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Paiements recents</h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3">
            <span class="sr-only">Search payments</span>
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search by payment or customer"
              class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none placeholder:text-[#6D7A88]"
            />
          </label>
          <label class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3">
            <span class="sr-only">Filter payments</span>
            <select
              v-model="statusFilter"
              class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none"
            >
              <option value="all">All statuses</option>
              <option value="Succeeded">Succeeded</option>
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
        Chargement des paiements...
      </div>

      <div
        v-else-if="filteredPayments.length === 0"
        class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
      >
        Aucun paiement ne correspond aux filtres actuels.
      </div>

      <div v-else class="mt-6 grid gap-4">
        <div
          v-for="payment in filteredPayments"
          :key="payment.id"
          class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-5"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p class="font-semibold text-[#E6EDF7]">{{ payment.reference }}</p>
              <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">
                {{ payment.method }} payment linked to {{ payment.orderReference }}
              </p>
              <p class="mt-2 text-sm text-[#8E9AA7]">{{ payment.customer }}</p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <span class="text-sm font-semibold text-[#D8E1F0]">{{ payment.amount }}</span>
              <span
                class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                :class="statusClass(payment.status)"
              >
                {{ payment.status }}
              </span>
              <span class="text-sm text-[#8E9AA7]">{{ formatDate(payment.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </AdminShell>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo } from "#app";

definePageMeta({
  middleware: "admin"
});

const loading = ref(true);
const errorMessage = ref("");
const searchTerm = ref("");
const statusFilter = ref("all");
const payments = ref([]);
const summary = ref({
  totalPayments: 0,
  succeededPayments: 0,
  pendingPayments: 0,
  grossRevenue: "EUR 0.00"
});

const summaries = computed(() => [
  {
    label: "Total payments",
    value: summary.value.totalPayments,
    description: "Nombre total de paiements en base."
  },
  {
    label: "Succeeded",
    value: summary.value.succeededPayments,
    description: "Paiements marques comme reussis."
  },
  {
    label: "Pending",
    value: summary.value.pendingPayments,
    description: "Paiements encore en attente."
  },
  {
    label: "Gross revenue",
    value: summary.value.grossRevenue,
    description: "Somme actuelle des paiements reussis."
  }
]);

const filteredPayments = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return payments.value.filter((payment) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      payment.reference.toLowerCase().includes(normalizedSearch) ||
      payment.orderReference.toLowerCase().includes(normalizedSearch) ||
      payment.customer.toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter.value === "all" || payment.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});

onMounted(async () => {
  await loadPayments();
});

async function loadPayments() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/admin/payments", {
      credentials: "include"
    });

    payments.value = response.payments || [];
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

    errorMessage.value = error?.data?.message || "Unable to load admin payments.";
  } finally {
    loading.value = false;
  }
}

function statusClass(status) {
  if (status === "Succeeded") {
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
    dateStyle: "medium"
  }).format(new Date(value));
}
</script>
