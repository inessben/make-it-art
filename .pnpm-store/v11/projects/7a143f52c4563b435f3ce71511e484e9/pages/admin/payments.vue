<template>
  <AdminShell
    title="Payments"
    description="Monitor transactions and revenue using live backend data."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300 disabled:opacity-50"
        :disabled="loading"
        @click="loadPayments(true)"
      >
        {{ loading ? "Refreshing..." : "Refresh payments" }}
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

    <AppStatePanel
      v-if="successMessage"
      compact
      type="success"
      :message="successMessage"
    />
    <section
      class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6"
    >
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">
            Transactions
          </p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">
            Recent payments
          </h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="border border-slate-800 bg-black px-4 py-3">
            <span class="sr-only">Search payments</span>
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search by payment or customer"
              class="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>
          <label class="border border-slate-800 bg-black px-4 py-3">
            <span class="sr-only">Filter payments</span>
            <select
              v-model="statusFilter"
              class="w-full bg-transparent text-sm text-slate-100 outline-none"
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
        class="mt-6 border border-red-900 bg-red-950 px-5 py-4 text-sm text-red-200"
      >
        {{ errorMessage }}
      </div>

      <div
        v-else-if="loading"
        class="mt-6 border border-slate-800 bg-black px-5 py-4 text-sm text-slate-400"
      >
        Loading payments...
      </div>

      <div
        v-else-if="filteredPayments.length === 0"
        class="mt-6 border border-slate-800 bg-black px-5 py-4 text-sm text-slate-400"
      >
        No payments match the current filters.
      </div>

      <div v-else class="mt-6 grid gap-4">
        <div
          v-for="payment in filteredPayments"
          :key="payment.id"
          class="border border-slate-800 bg-black/30 p-5"
        >
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <p class="font-semibold text-slate-100">
                {{ payment.reference }}
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-400">
                {{ payment.method }} payment linked to
                {{ payment.orderReference }}
              </p>
              <p class="mt-2 text-sm text-slate-400">{{ payment.customer }}</p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <span class="text-sm font-semibold text-slate-100">{{
                payment.amount
              }}</span>
              <span
                class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                :class="statusClass(payment.status)"
              >
                {{ payment.status }}
              </span>
              <span class="text-sm text-slate-400">{{
                formatDate(payment.createdAt)
              }}</span>
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
  middleware: "admin",
});

const loading = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const searchTerm = ref("");
const statusFilter = ref("all");
const payments = ref([]);
const summary = ref({
  totalPayments: 0,
  succeededPayments: 0,
  pendingPayments: 0,
  grossRevenue: "EUR 0.00",
});

const summaries = computed(() => [
  {
    label: "Total payments",
    value: summary.value.totalPayments,
    description: "Total number of payments in the database.",
  },
  {
    label: "Succeeded",
    value: summary.value.succeededPayments,
    description: "Payments marked as successful.",
  },
  {
    label: "Pending",
    value: summary.value.pendingPayments,
    description: "Payments still pending.",
  },
  {
    label: "Gross revenue",
    value: summary.value.grossRevenue,
    description: "Current total of successful payments.",
  },
]);

const filteredPayments = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return payments.value.filter((payment) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      payment.reference.toLowerCase().includes(normalizedSearch) ||
      payment.orderReference.toLowerCase().includes(normalizedSearch) ||
      payment.customer.toLowerCase().includes(normalizedSearch);

    const matchesStatus =
      statusFilter.value === "all" || payment.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});

onMounted(async () => {
  await loadPayments();
});

async function loadPayments(showSuccess = false) {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await $fetch("/api/admin/payments", {
      credentials: "include",
    });

    payments.value = response.payments || [];
    summary.value = response.summary || summary.value;
    if (showSuccess) {
      successMessage.value = "Payment data refreshed successfully.";
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

    errorMessage.value =
      error?.data?.message || "Unable to load admin payments.";
  } finally {
    loading.value = false;
  }
}

function statusClass(status) {
  if (status === "Succeeded") {
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
