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
        @click="loadPaymentDashboard"
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
        <p class="mt-4 text-3xl font-semibold text-white">
          {{ summaryCard.value }}
        </p>
        <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">
          {{ summaryCard.description }}
        </p>
      </article>
    </section>

    <section class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#F2C97D]">Supervision</p>
          <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">Anomalies de paiement</h2>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-[#A0ADB4]">
            Les actions relisent Stripe ou rejouent un traitement idempotent. Aucun paiement ne peut
            etre force manuellement en succes.
          </p>
        </div>
        <span
          class="inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold"
          :class="
            anomalySummary.total > 0
              ? 'bg-[#3F2A11] text-[#F2C97D]'
              : 'bg-[#4A6CF7]/10 text-[#4A6CF7]'
          "
        >
          {{ anomalySummary.total }} anomalie(s)
        </span>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div
          v-for="item in anomalyCounters"
          :key="item.label"
          class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3"
        >
          <p class="text-xs uppercase tracking-[0.14em] text-[#8E9AA7]">
            {{ item.label }}
          </p>
          <p class="mt-2 text-xl font-semibold text-[#E6EDF7]">
            {{ item.value }}
          </p>
        </div>
      </div>

      <div
        v-if="operationMessage"
        class="mt-5 rounded-2xl border px-5 py-4 text-sm"
        :class="
          operationFailed
            ? 'border-[#7f1d1d] bg-[#2b1014] text-[#FECACA]'
            : 'border-[#24467A] bg-[#07152D] text-[#BFDBFE]'
        "
      >
        {{ operationMessage }}
      </div>

      <div
        v-if="!loading && anomalyRows.length === 0"
        class="mt-5 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
      >
        Aucune anomalie ouverte.
      </div>

      <div v-else-if="anomalyRows.length > 0" class="mt-5 grid gap-3">
        <article
          v-for="row in anomalyRows"
          :key="row.key"
          class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-5"
        >
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div class="min-w-0">
              <p class="text-xs uppercase tracking-[0.14em] text-[#F2C97D]">
                {{ row.category }} · {{ row.status }}
              </p>
              <p class="mt-2 break-all font-semibold text-[#E6EDF7]">
                {{ row.title }}
              </p>
              <p class="mt-2 break-all text-sm text-[#A0ADB4]">
                {{ row.reference }}
                <template v-if="row.orderId"> · Commande {{ row.orderId }}</template>
              </p>
              <p class="mt-1 text-sm text-[#8E9AA7]">
                {{ row.detail }} · {{ formatDateTime(row.occurredAt) }}
              </p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-3">
              <NuxtLink
                v-if="row.link"
                :to="row.link.route"
                class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] px-4 py-2 text-sm font-semibold text-[#E6EDF7] transition hover:border-[#4A6CF7] hover:text-[#9DB4FF]"
              >
                {{ row.link.label }}
              </NuxtLink>
              <button
                v-if="row.action"
                type="button"
                class="inline-flex items-center justify-center rounded-2xl border border-[#F2C97D]/50 bg-[#F2C97D]/10 px-4 py-2 text-sm font-semibold text-[#F2C97D] transition hover:bg-[#F2C97D]/20 disabled:cursor-wait disabled:opacity-60"
                :disabled="Boolean(activeOperation)"
                @click="runPaymentOperation(row.action)"
              >
                {{ activeOperation === row.key ? "Traitement..." : row.action.label }}
              </button>
            </div>
          </div>
        </article>
      </div>
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
              <p class="font-semibold text-[#E6EDF7]">
                {{ payment.reference }}
              </p>
              <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">
                {{ payment.method }} payment linked to
                {{ payment.orderReference }}
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
              <NuxtLink
                :to="`/admin/payments/${payment.id}`"
                class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#E6EDF7] transition hover:border-[#4A6CF7] hover:text-[#9DB4FF]"
              >
                Details
              </NuxtLink>
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
import {
  buildPaymentAnomalyRows,
  buildPaymentOperationRequest,
  paymentOperationErrorMessage
} from "~/utils/payment-operations.js";

definePageMeta({
  middleware: "admin"
});

const loading = ref(true);
const errorMessage = ref("");
const searchTerm = ref("");
const statusFilter = ref("all");
const payments = ref([]);
const anomalies = ref({});
const activeOperation = ref("");
const operationMessage = ref("");
const operationFailed = ref(false);
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

const anomalySummary = computed(() => ({
  webhooks: anomalies.value.summary?.webhooks || 0,
  tasks: anomalies.value.summary?.tasks || 0,
  orders: anomalies.value.summary?.orders || 0,
  refunds: anomalies.value.summary?.refunds || 0,
  alerts: anomalies.value.summary?.alerts || 0,
  disputes: anomalies.value.summary?.disputes || 0,
  total: anomalies.value.summary?.total || 0
}));

const anomalyCounters = computed(() => [
  { label: "Webhooks", value: anomalySummary.value.webhooks },
  { label: "Finalisations", value: anomalySummary.value.tasks },
  { label: "Commandes", value: anomalySummary.value.orders },
  { label: "Remboursements", value: anomalySummary.value.refunds },
  { label: "Litiges", value: anomalySummary.value.disputes },
  { label: "Alertes", value: anomalySummary.value.alerts }
]);
const anomalyRows = computed(() => buildPaymentAnomalyRows(anomalies.value));

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
  await loadPaymentDashboard();
});

async function loadPaymentDashboard() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [response, anomalyResponse] = await Promise.all([
      $fetch("/api/admin/payments", { credentials: "include" }),
      $fetch("/api/v1/admin/payments/anomalies", {
        credentials: "include"
      })
    ]);

    payments.value = response.payments || [];
    summary.value = response.summary || summary.value;
    anomalies.value = anomalyResponse || {};
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

async function runPaymentOperation(operation) {
  const row = anomalyRows.value.find((item) => item.action === operation);
  activeOperation.value = row?.key || `${operation.type}:${operation.id}`;
  operationMessage.value = "";
  operationFailed.value = false;

  try {
    const csrfResponse = await $fetch("/api/v1/security/csrf-token", {
      credentials: "include"
    });
    const request = buildPaymentOperationRequest(operation);
    await $fetch(request.url, {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": csrfResponse.csrfToken },
      body: request.body
    });
    operationMessage.value =
      "Action acceptee. La supervision a ete actualisee depuis l'etat serveur.";
    await loadPaymentDashboard();
  } catch (error) {
    operationFailed.value = true;
    operationMessage.value = paymentOperationErrorMessage(error);
  } finally {
    activeOperation.value = "";
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

function formatDateTime(value) {
  if (!value) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
</script>
