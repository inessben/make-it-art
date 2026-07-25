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

    <section class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Orders list</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Order tracking</h2>
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
              <option value="Partially refunded">Partially refunded</option>
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
        <p class="border-b border-slate-800 px-4 py-3 text-subtitle-3 text-slate-500 sm:hidden">
          Swipe horizontally to view every column.
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-[1080px] divide-y divide-slate-800 sm:min-w-full">
            <thead class="bg-slate-950">
              <tr class="text-left text-xs uppercase tracking-widest text-slate-500">
                <th class="px-5 py-4 font-medium">Order</th>
                <th class="px-5 py-4 font-medium">Customer</th>
                <th class="px-5 py-4 font-medium">Status</th>
                <th class="px-5 py-4 font-medium">Amount</th>
                <th class="px-5 py-4 font-medium">Refunds</th>
                <th class="px-5 py-4 font-medium">Created</th>
                <th class="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800 bg-black/20">
              <tr v-for="order in filteredOrders" :key="order.id">
                <td class="px-5 py-4">
                  <p class="font-semibold text-slate-100">
                    {{ order.reference }}
                  </p>
                  <p class="mt-1 text-sm text-slate-400">{{ order.itemsCount }} items</p>
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
                <td class="px-5 py-4 text-sm">
                  <p class="text-slate-100">
                    {{ formatMoney(order.refundedAmount, order.currency) }} remboursé
                  </p>
                  <p v-if="order.pendingRefundAmount > 0" class="mt-1 text-amber-300">
                    {{ formatMoney(order.pendingRefundAmount, order.currency) }} en attente
                  </p>
                  <p class="mt-1 text-slate-400">
                    {{ formatMoney(order.refundableAmount, order.currency) }} disponible
                  </p>
                </td>
                <td class="px-5 py-4 text-sm text-slate-400">
                  {{ formatDate(order.createdAt) }}
                </td>
                <td class="px-5 py-4">
                  <button
                    v-if="canRequestRefund(order)"
                    type="button"
                    class="inline-flex min-h-10 items-center justify-center border border-violet-700 bg-violet-950/40 px-4 text-sm font-semibold text-violet-200 transition hover:bg-violet-900/50"
                    @click="openRefundDialog(order, $event)"
                  >
                    Rembourser
                  </button>
                  <button
                    v-else-if="order.refunds.length > 0"
                    type="button"
                    class="inline-flex min-h-10 items-center justify-center border border-slate-700 bg-slate-950 px-4 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
                    @click="openRefundDialog(order, $event)"
                  >
                    Voir les remboursements
                  </button>
                  <span v-else class="text-sm text-slate-500">Non remboursable</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div
      v-if="selectedOrder"
      class="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      role="presentation"
      @click.self="closeRefundDialog"
      @keydown.esc="closeRefundDialog"
    >
      <section
        class="my-8 w-full max-w-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-dialog-title"
      >
        <header class="flex items-start justify-between gap-5 border-b border-slate-800 pb-5">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-violet-400">
              Action financière sensible
            </p>
            <h2 id="refund-dialog-title" class="mt-3 text-2xl font-semibold text-slate-100">
              Rembourser {{ selectedOrder.reference }}
            </h2>
            <p class="mt-2 break-all text-sm text-slate-400">
              {{ selectedOrder.customer }} · {{ selectedOrder.publicId }}
            </p>
          </div>
          <button
            ref="refundDialogCloseButton"
            type="button"
            class="grid h-11 w-11 shrink-0 place-items-center border border-slate-700 text-xl text-slate-300 transition hover:border-slate-500 hover:text-white"
            aria-label="Fermer la fenêtre de remboursement"
            :disabled="refundSubmitting"
            @click="closeRefundDialog"
          >
            ×
          </button>
        </header>

        <div class="mt-6 grid gap-3 sm:grid-cols-3">
          <div class="border border-slate-800 bg-black/40 p-4">
            <p class="text-xs uppercase tracking-wider text-slate-500">Total payé</p>
            <p class="mt-2 font-semibold text-slate-100">
              {{ formatMoney(selectedOrder.totalAmount, selectedOrder.currency) }}
            </p>
          </div>
          <div class="border border-slate-800 bg-black/40 p-4">
            <p class="text-xs uppercase tracking-wider text-slate-500">Déjà remboursé</p>
            <p class="mt-2 font-semibold text-slate-100">
              {{ formatMoney(selectedOrder.refundedAmount, selectedOrder.currency) }}
            </p>
          </div>
          <div class="border border-slate-800 bg-black/40 p-4">
            <p class="text-xs uppercase tracking-wider text-slate-500">Solde disponible</p>
            <p class="mt-2 font-semibold text-violet-300">
              {{ formatMoney(selectedOrder.refundableAmount, selectedOrder.currency) }}
            </p>
          </div>
        </div>

        <section v-if="selectedOrder.refunds.length > 0" class="mt-6">
          <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Historique des remboursements
          </h3>
          <div class="mt-3 grid gap-3">
            <article
              v-for="refund in selectedOrder.refunds"
              :key="refund.id"
              class="flex flex-col gap-3 border border-slate-800 bg-black/40 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p class="font-semibold text-slate-100">
                  {{ formatMoney(refund.amount, refund.currency) }}
                </p>
                <p class="mt-1 text-sm text-slate-400">
                  {{ refundReasonLabel(refund.reason) }} · {{ formatDateTime(refund.createdAt) }}
                </p>
              </div>
              <span
                class="inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold"
                :class="refundStatusClass(refund.status)"
              >
                {{ refundStatusLabel(refund.status) }}
              </span>
            </article>
          </div>
        </section>

        <div
          v-if="refundFeedback"
          class="mt-5 border px-4 py-4 text-sm"
          :class="
            refundFeedbackType === 'success'
              ? 'border-green-900 bg-green-950/50 text-green-200'
              : 'border-red-900 bg-red-950/50 text-red-200'
          "
          :role="refundFeedbackType === 'error' ? 'alert' : 'status'"
        >
          {{ refundFeedback }}
        </div>

        <form
          v-if="canRequestRefund(selectedOrder)"
          class="mt-6 border-t border-slate-800 pt-6"
          @submit.prevent="submitRefund"
        >
          <fieldset :disabled="refundSubmitting">
            <legend class="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Montant à rembourser
            </legend>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <label
                class="flex cursor-pointer gap-3 border p-4"
                :class="
                  refundMode === 'remaining'
                    ? 'border-violet-600 bg-violet-950/30'
                    : 'border-slate-800 bg-black/40'
                "
              >
                <input v-model="refundMode" type="radio" value="remaining" class="mt-1" />
                <span>
                  <span class="block font-semibold text-slate-100">Tout le solde</span>
                  <span class="mt-1 block text-sm text-slate-400">
                    {{ formatMoney(selectedOrder.refundableAmount, selectedOrder.currency) }}
                  </span>
                </span>
              </label>
              <label
                class="flex cursor-pointer gap-3 border p-4"
                :class="
                  refundMode === 'partial'
                    ? 'border-violet-600 bg-violet-950/30'
                    : 'border-slate-800 bg-black/40'
                "
              >
                <input v-model="refundMode" type="radio" value="partial" class="mt-1" />
                <span>
                  <span class="block font-semibold text-slate-100">Montant partiel</span>
                  <span class="mt-1 block text-sm text-slate-400">
                    Saisir un montant inférieur au solde.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <label v-if="refundMode === 'partial'" class="mt-5 grid gap-2 text-sm">
            <span class="font-semibold text-slate-100">Montant en euros</span>
            <input
              v-model="partialRefundAmount"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              class="min-h-12 border border-slate-700 bg-black px-4 text-slate-100 outline-none focus:border-violet-600"
              placeholder="5,00"
              :aria-invalid="Boolean(displayedRefundAmountError)"
              aria-describedby="refund-amount-help"
              :disabled="refundSubmitting"
            />
            <span
              id="refund-amount-help"
              :class="displayedRefundAmountError ? 'text-red-300' : 'text-slate-400'"
            >
              {{
                displayedRefundAmountError ||
                `Maximum : ${formatMoney(selectedOrder.refundableAmount, selectedOrder.currency)}`
              }}
            </span>
          </label>

          <label class="mt-5 grid gap-2 text-sm">
            <span class="font-semibold text-slate-100">Motif</span>
            <select
              v-model="refundReason"
              class="min-h-12 border border-slate-700 bg-black px-4 text-slate-100 outline-none focus:border-violet-600"
              :disabled="refundSubmitting"
            >
              <option v-for="reason in refundReasons" :key="reason.value" :value="reason.value">
                {{ reason.label }}
              </option>
            </select>
          </label>

          <div
            class="mt-5 border px-4 py-4 text-sm leading-6"
            :class="
              willFullyRefund
                ? 'border-red-900 bg-red-950/50 text-red-200'
                : 'border-amber-900 bg-amber-950/40 text-amber-200'
            "
          >
            <template v-if="willFullyRefund">
              Le remboursement total révoquera les droits de téléchargement et le certificat après
              confirmation par Stripe.
            </template>
            <template v-else>
              Le remboursement partiel conservera les droits actifs. Le montant ne pourra être
              confirmé qu'après traitement des webhooks Stripe.
            </template>
          </div>

          <label
            class="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-300"
          >
            <input
              v-model="refundConfirmed"
              type="checkbox"
              class="mt-1 h-4 w-4"
              :disabled="refundSubmitting"
            />
            <span>
              Je confirme avoir vérifié la commande, le montant et le motif. Cette action envoie une
              demande financière réelle au sandbox Stripe.
            </span>
          </label>

          <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="inline-flex min-h-12 items-center justify-center border border-slate-700 px-5 font-semibold text-slate-200 transition hover:border-slate-500 disabled:opacity-50"
              :disabled="refundSubmitting"
              @click="closeRefundDialog"
            >
              Annuler
            </button>
            <button
              type="submit"
              class="inline-flex min-h-12 items-center justify-center bg-red-700 px-5 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!canSubmitRefund"
            >
              {{ refundSubmitting ? "Demande en cours..." : refundSubmitLabel }}
            </button>
          </div>
        </form>

        <div v-else class="mt-6 flex justify-end border-t border-slate-800 pt-6">
          <button
            type="button"
            class="inline-flex min-h-12 items-center justify-center border border-slate-700 px-5 font-semibold text-slate-200 transition hover:border-slate-500"
            @click="closeRefundDialog"
          >
            Fermer
          </button>
        </div>
      </section>
    </div>
  </AdminShell>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { navigateTo } from "#app";
import { createSecureUuid } from "~/utils/checkout-security.js";
import {
  buildAdminRefundRequest,
  canRequestRefund,
  parseRefundAmountToCents,
  refundOperationErrorMessage
} from "~/utils/refund-operations.js";

definePageMeta({
  middleware: "admin"
});

const loading = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const searchTerm = ref("");
const statusFilter = ref("all");
const orders = ref([]);
const selectedOrder = ref(null);
const refundMode = ref("remaining");
const partialRefundAmount = ref("");
const refundReason = ref("CUSTOMER_REQUEST");
const refundConfirmed = ref(false);
const refundSubmitting = ref(false);
const refundFeedback = ref("");
const refundFeedbackType = ref("");
const refundRequestKey = ref("");
const refundRequestSignature = ref("");
const refundDialogCloseButton = ref(null);
const refundDialogTrigger = ref(null);
const summary = ref({
  totalOrders: 0,
  paidOrders: 0,
  pendingOrders: 0,
  refundedOrders: 0
});
const refundReasons = [
  { value: "CUSTOMER_REQUEST", label: "Demande du client" },
  { value: "DUPLICATE", label: "Paiement en double" },
  { value: "FRAUDULENT", label: "Paiement frauduleux" }
];

const summaries = computed(() => [
  {
    label: "Total orders",
    value: summary.value.totalOrders,
    description: "Total number of orders in the database."
  },
  {
    label: "Paid orders",
    value: summary.value.paidOrders,
    description: "Orders marked as paid."
  },
  {
    label: "Pending orders",
    value: summary.value.pendingOrders,
    description: "Orders still pending."
  },
  {
    label: "Refunded orders",
    value: summary.value.refundedOrders,
    description: "Refunded orders."
  }
]);

const filteredOrders = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return orders.value.filter((order) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      order.reference.toLowerCase().includes(normalizedSearch) ||
      order.customer.toLowerCase().includes(normalizedSearch) ||
      order.customerEmail.toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter.value === "all" || order.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});
const partialRefundAmountCents = computed(() =>
  parseRefundAmountToCents(partialRefundAmount.value)
);
const requestedRefundAmount = computed(() => {
  if (!selectedOrder.value) {
    return null;
  }

  return refundMode.value === "remaining"
    ? selectedOrder.value.refundableAmount
    : partialRefundAmountCents.value;
});
const refundAmountError = computed(() => {
  if (refundMode.value !== "partial" || !selectedOrder.value) {
    return "";
  }
  if (partialRefundAmountCents.value === null) {
    return "Saisissez un montant positif avec deux décimales au maximum.";
  }
  if (partialRefundAmountCents.value >= selectedOrder.value.refundableAmount) {
    return "Pour rembourser tout le solde, sélectionnez « Tout le solde ».";
  }

  return "";
});
const displayedRefundAmountError = computed(() =>
  partialRefundAmount.value.trim() ? refundAmountError.value : ""
);
const willFullyRefund = computed(
  () => selectedOrder.value && requestedRefundAmount.value === selectedOrder.value.refundableAmount
);
const canSubmitRefund = computed(
  () =>
    canRequestRefund(selectedOrder.value) &&
    Number.isSafeInteger(requestedRefundAmount.value) &&
    requestedRefundAmount.value > 0 &&
    requestedRefundAmount.value <= selectedOrder.value.refundableAmount &&
    !refundAmountError.value &&
    refundConfirmed.value &&
    !refundSubmitting.value
);
const refundSubmitLabel = computed(() => {
  if (!selectedOrder.value || !requestedRefundAmount.value) {
    return "Demander le remboursement";
  }

  return `Rembourser ${formatMoney(requestedRefundAmount.value, selectedOrder.value.currency)}`;
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
      credentials: "include"
    });

    orders.value = response.orders || [];
    summary.value = response.summary || summary.value;
    if (selectedOrder.value) {
      selectedOrder.value =
        orders.value.find((order) => order.publicId === selectedOrder.value.publicId) || null;
    }
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

function openRefundDialog(order, event) {
  selectedOrder.value = order;
  refundMode.value = "remaining";
  partialRefundAmount.value = "";
  refundReason.value = "CUSTOMER_REQUEST";
  refundConfirmed.value = false;
  refundFeedback.value = "";
  refundFeedbackType.value = "";
  refundRequestKey.value = "";
  refundRequestSignature.value = "";
  refundDialogTrigger.value = event?.currentTarget || null;
  nextTick(() => refundDialogCloseButton.value?.focus());
}

function closeRefundDialog() {
  if (refundSubmitting.value) {
    return;
  }

  selectedOrder.value = null;
  refundFeedback.value = "";
  refundFeedbackType.value = "";
  nextTick(() => refundDialogTrigger.value?.focus());
}

async function submitRefund() {
  if (!canSubmitRefund.value) {
    return;
  }

  refundSubmitting.value = true;
  refundFeedback.value = "";
  refundFeedbackType.value = "";
  errorMessage.value = "";
  successMessage.value = "";

  const signature = [
    selectedOrder.value.publicId,
    requestedRefundAmount.value,
    refundReason.value
  ].join(":");

  if (!refundRequestKey.value || refundRequestSignature.value !== signature) {
    refundRequestKey.value = createSecureUuid();
    refundRequestSignature.value = signature;
  }

  try {
    const csrfResponse = await $fetch("/api/v1/security/csrf-token", {
      credentials: "include"
    });
    const request = buildAdminRefundRequest({
      orderPublicId: selectedOrder.value.publicId,
      amount: requestedRefundAmount.value,
      reason: refundReason.value,
      idempotencyKey: refundRequestKey.value,
      csrfToken: csrfResponse.csrfToken
    });
    const response = await $fetch(request.url, request.options);
    const requestedAmount = requestedRefundAmount.value;

    refundRequestKey.value = "";
    refundRequestSignature.value = "";
    refundConfirmed.value = false;
    await loadOrders();

    refundFeedbackType.value = "success";
    refundFeedback.value =
      response.refund?.status === "SUCCEEDED"
        ? `Le remboursement de ${formatMoney(requestedAmount, response.refund.currency)} est confirmé.`
        : `La demande de ${formatMoney(requestedAmount, response.refund?.currency || "EUR")} est enregistrée. Actualisez la liste après réception des webhooks Stripe.`;
    successMessage.value = refundFeedback.value;
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    refundFeedbackType.value = "error";
    refundFeedback.value = refundOperationErrorMessage(error);
  } finally {
    refundSubmitting.value = false;
  }
}

function statusClass(status) {
  if (status === "Paid") {
    return "bg-violet-700/10 text-violet-700";
  }

  if (status === "Refunded") {
    return "bg-red-950 text-red-300";
  }

  if (status === "Partially refunded") {
    return "bg-orange-950 text-orange-300";
  }

  return "bg-amber-950 text-amber-300";
}

function refundStatusClass(status) {
  if (status === "SUCCEEDED") {
    return "bg-green-950 text-green-300";
  }
  if (status === "FAILED") {
    return "bg-red-950 text-red-300";
  }

  return "bg-amber-950 text-amber-300";
}

function refundStatusLabel(status) {
  return (
    {
      PENDING: "En attente",
      SUCCEEDED: "Confirmé",
      FAILED: "Échoué"
    }[status] || status
  );
}

function refundReasonLabel(reason) {
  return refundReasons.find((item) => item.value === reason)?.label || reason;
}

function formatMoney(amount, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency
  }).format((amount || 0) / 100);
}

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
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
