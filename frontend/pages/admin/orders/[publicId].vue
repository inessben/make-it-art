<template>
  <AdminShell
    :title="order?.reference || 'Order detail'"
    description="Full order sheet with billing snapshot, items, payments, refunds and operational history."
  >
    <template #actions>
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          to="/admin/orders"
          class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
        >
          Back to orders
        </NuxtLink>
        <NuxtLink
          v-if="order?.customer?.id"
          :to="`/admin/users/${order.customer.id}`"
          class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
        >
          Open customer
        </NuxtLink>
        <NuxtLink
          v-if="order?.publicId"
          :to="`/admin/audit-log?entityType=ORDER&entityId=${order.publicId}`"
          class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
        >
          Open audit log
        </NuxtLink>
      </div>
    </template>

    <div
      v-if="errorMessage"
      class="border border-red-900 bg-red-950 px-5 py-4 text-sm text-red-200"
    >
      {{ errorMessage }}
    </div>

    <div
      v-else-if="loading"
      class="border border-slate-800 bg-black px-5 py-4 text-sm text-slate-400"
    >
      Loading order detail...
    </div>

    <template v-else-if="order">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article
          v-for="summaryCard in summaryCards"
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

      <section class="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Overview</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Order identity</h2>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Status</p>
              <p class="mt-2 text-sm text-slate-100">{{ order.status }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Customer type</p>
              <p class="mt-2 text-sm text-slate-100">{{ order.customerType }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Market</p>
              <p class="mt-2 text-sm text-slate-100">{{ order.marketCountry }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Customer</p>
              <p class="mt-2 text-sm text-slate-100">
                {{ order.customer?.username || "User" }}
              </p>
              <p class="mt-1 text-sm text-slate-400">{{ order.customer?.email }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Created</p>
              <p class="mt-2 text-sm text-slate-100">{{ formatDateTime(order.createdAt) }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Paid at</p>
              <p class="mt-2 text-sm text-slate-100">
                {{ order.paidAt ? formatDateTime(order.paidAt) : "Not paid yet" }}
              </p>
            </div>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Amounts</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Pricing snapshot</h2>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <div
              v-for="item in moneyBreakdown"
              :key="item.label"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">{{ item.label }}</p>
              <p class="mt-2 text-sm text-slate-100">{{ item.value }}</p>
            </div>
          </div>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Catalog</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Ordered items</h2>

          <div v-if="items.length === 0" class="mt-6 text-sm text-slate-400">
            No order item found.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="item in items"
              :key="item.id"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="font-semibold text-slate-100">{{ item.artworkTitle }}</p>
                <span class="text-sm text-slate-100">{{
                  formatMoney(item.subtotalAmount, item.currency)
                }}</span>
              </div>
              <p class="mt-2 text-sm text-slate-400">
                {{ item.artistName }} - {{ item.artwork?.category || "No category" }}
              </p>
              <p class="mt-2 text-sm text-slate-400">
                Qty {{ item.quantity }} - Unit {{ formatMoney(item.unitAmount, item.currency) }}
              </p>
            </article>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Billing</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Billing snapshot</h2>

          <div v-if="billingEntries.length === 0" class="mt-6 text-sm text-slate-400">
            No billing snapshot stored.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <div
              v-for="entry in billingEntries"
              :key="entry.label"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">{{ entry.label }}</p>
              <p class="mt-2 text-sm text-slate-100">{{ entry.value }}</p>
            </div>
          </div>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Payments</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Linked payments</h2>

          <div v-if="payments.length === 0" class="mt-6 text-sm text-slate-400">
            No payment linked to this order yet.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <NuxtLink
              v-for="payment in payments"
              :key="payment.id"
              :to="`/admin/payments/${payment.id}`"
              class="border border-slate-800 bg-black/30 p-4 transition hover:border-violet-600"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="font-semibold text-slate-100">{{ payment.reference }}</p>
                <span class="text-sm text-slate-100">{{
                  formatMoney(payment.amount, payment.currency)
                }}</span>
              </div>
              <p class="mt-2 text-sm text-slate-400">{{ payment.status }} - {{ payment.method }}</p>
              <p class="mt-2 text-sm text-slate-400">
                Refunded {{ formatMoney(payment.refundedAmount, payment.currency) }}
              </p>
            </NuxtLink>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Refunds</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Refund timeline</h2>

          <div v-if="refunds.length === 0" class="mt-6 text-sm text-slate-400">
            No refund requested for this order.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="refund in refunds"
              :key="refund.publicId"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="font-semibold text-slate-100">{{ refund.publicId }}</p>
                <span class="text-sm text-slate-100">{{
                  formatMoney(refund.amount, refund.currency)
                }}</span>
              </div>
              <p class="mt-2 text-sm text-slate-400">
                {{ refund.status }} - {{ refund.reasonCode }}
              </p>
              <p class="mt-2 text-sm text-slate-400">
                {{ refund.requestedBy?.username || "System" }} -
                {{ formatDateTime(refund.createdAt) }}
              </p>
            </article>
          </div>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Operations</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Transitions and fulfillment</h2>

          <div class="mt-6 grid gap-3">
            <article
              v-for="transition in transitions"
              :key="transition.id"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="font-semibold text-slate-100">
                {{ transition.entityType }}: {{ transition.previousStatus }} ->
                {{ transition.nextStatus }}
              </p>
              <p class="mt-2 text-sm text-slate-400">
                {{ transition.reasonCode }} - {{ formatDateTime(transition.createdAt) }}
              </p>
            </article>
            <article
              v-for="task in fulfillmentTasks"
              :key="`task-${task.id}`"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="font-semibold text-slate-100">{{ task.taskType }} - {{ task.status }}</p>
              <p class="mt-2 text-sm text-slate-400">
                {{ task.taskKey }}
              </p>
              <p class="mt-2 text-sm text-slate-400">
                Attempts {{ task.attemptCount }} - {{ formatDateTime(task.createdAt) }}
              </p>
            </article>
            <p
              v-if="transitions.length === 0 && fulfillmentTasks.length === 0"
              class="text-sm text-slate-400"
            >
              No operational history stored yet.
            </p>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Compliance</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Alerts and disputes</h2>

          <div class="mt-6 grid gap-3">
            <article
              v-for="alert in alerts"
              :key="alert.id"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="font-semibold text-slate-100">{{ alert.code }}</p>
              <p class="mt-2 text-sm text-slate-400">
                {{ alert.status }} - {{ formatDateTime(alert.createdAt) }}
              </p>
            </article>
            <article
              v-for="dispute in disputes"
              :key="dispute.providerDisputeId"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="font-semibold text-slate-100">{{ dispute.providerDisputeId }}</p>
              <p class="mt-2 text-sm text-slate-400">{{ dispute.status }} - {{ dispute.reason }}</p>
              <p class="mt-2 text-sm text-slate-400">
                {{ formatMoney(dispute.amount, dispute.currency) }} -
                {{ formatDateTime(dispute.createdAt) }}
              </p>
            </article>
            <p v-if="alerts.length === 0 && disputes.length === 0" class="text-sm text-slate-400">
              No active alert or dispute on this order.
            </p>
          </div>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Invoices</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Issued documents</h2>

          <div v-if="invoices.length === 0" class="mt-6 text-sm text-slate-400">
            No invoice issued yet.
          </div>
          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="invoice in invoices"
              :key="invoice.publicId"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="font-semibold text-slate-100">{{ invoice.number }}</p>
              <p class="mt-2 text-sm text-slate-400">
                {{ invoice.type }} - {{ formatMoney(invoice.totalAmount, invoice.currency) }}
              </p>
            </article>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Entitlements</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Download rights</h2>

          <div v-if="entitlements.length === 0" class="mt-6 text-sm text-slate-400">
            No entitlement generated yet.
          </div>
          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="entitlement in entitlements"
              :key="entitlement.id"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="font-semibold text-slate-100">{{ entitlement.orderItem?.artworkTitle }}</p>
              <p class="mt-2 text-sm text-slate-400">
                {{ entitlement.status }} - {{ entitlement.owner?.username || "Owner" }}
              </p>
            </article>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Certificates</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Ownership certificates</h2>

          <div v-if="ownershipCertificates.length === 0" class="mt-6 text-sm text-slate-400">
            No certificate issued yet.
          </div>
          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="certificate in ownershipCertificates"
              :key="certificate.publicId"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="font-semibold text-slate-100">{{ certificate.certificateNumber }}</p>
              <p class="mt-2 text-sm text-slate-400">
                {{ certificate.status }} - {{ certificate.owner?.username || "Owner" }}
              </p>
            </article>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Inventory</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Reservations</h2>

          <div v-if="reservations.length === 0" class="mt-6 text-sm text-slate-400">
            No reservation stored for this order.
          </div>
          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="reservation in reservations"
              :key="reservation.id"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="font-semibold text-slate-100">
                {{ reservation.artwork?.title || "Artwork" }}
              </p>
              <p class="mt-2 text-sm text-slate-400">
                {{ reservation.status }} - Qty {{ reservation.quantity }}
              </p>
              <p class="mt-2 text-sm text-slate-400">
                Expires {{ formatDateTime(reservation.expiresAt) }}
              </p>
            </article>
          </div>
        </article>
      </section>

      <section class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
        <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Audit</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-100">Operational audit log</h2>

        <div v-if="auditLog.length === 0" class="mt-6 text-sm text-slate-400">
          No audit entry recorded for this order scope.
        </div>

        <div v-else class="mt-6 grid gap-3">
          <article
            v-for="entry in auditLog"
            :key="entry.id"
            class="border border-slate-800 bg-black/30 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="font-semibold text-slate-100">{{ entry.action }}</p>
              <span class="text-xs uppercase tracking-[0.12em] text-slate-500">
                {{ formatDateTime(entry.createdAt) }}
              </span>
            </div>
            <p class="mt-2 text-sm text-slate-400">
              {{ entry.actor?.username || "System" }} - {{ entry.entityType }} /
              {{ entry.entityId }}
            </p>
          </article>
        </div>
      </section>
    </template>
  </AdminShell>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo, useRoute } from "#app";
import { formatAdminDateTime, formatAdminMoney } from "~/utils/admin-format";

definePageMeta({
  middleware: "admin"
});

const route = useRoute();
const loading = ref(true);
const errorMessage = ref("");
const order = ref(null);
const items = ref([]);
const payments = ref([]);
const refunds = ref([]);
const transitions = ref([]);
const fulfillmentTasks = ref([]);
const alerts = ref([]);
const disputes = ref([]);
const invoices = ref([]);
const entitlements = ref([]);
const ownershipCertificates = ref([]);
const reservations = ref([]);
const auditLog = ref([]);

const summaryCards = computed(() => [
  {
    label: "Status",
    value: order.value?.status || "-",
    description: "Current order state."
  },
  {
    label: "Total",
    value: order.value ? formatMoney(order.value.totalAmount, order.value.currency) : "-",
    description: "Final order amount."
  },
  {
    label: "Payments",
    value: payments.value.length,
    description: "Linked payment records."
  },
  {
    label: "Refunds",
    value: refunds.value.length,
    description: "Refund requests stored on this order."
  },
  {
    label: "Tasks",
    value: fulfillmentTasks.value.length,
    description: "Fulfillment steps created for this order."
  }
]);

const moneyBreakdown = computed(() => {
  if (!order.value) {
    return [];
  }

  return [
    { label: "Subtotal", value: formatMoney(order.value.subtotalAmount, order.value.currency) },
    { label: "Discount", value: formatMoney(order.value.discountAmount, order.value.currency) },
    {
      label: "Net before tax",
      value: formatMoney(order.value.subtotalExcludingTaxAmount, order.value.currency)
    },
    { label: "Tax", value: formatMoney(order.value.taxAmount, order.value.currency) },
    { label: "Commission", value: formatMoney(order.value.commissionAmount, order.value.currency) },
    { label: "Total", value: formatMoney(order.value.totalAmount, order.value.currency) }
  ];
});

const billingEntries = computed(() => {
  const snapshot = order.value?.billingSnapshot;

  if (!snapshot || typeof snapshot !== "object") {
    return [];
  }

  return Object.entries(snapshot).map(([key, value]) => ({
    label: key.replace(/_/g, " "),
    value: Array.isArray(value) ? value.join(", ") : String(value)
  }));
});

onMounted(async () => {
  await loadOrderDetail();
});

async function loadOrderDetail() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch(`/api/admin/orders/${route.params.publicId}`, {
      credentials: "include"
    });

    order.value = response.order;
    items.value = response.items || [];
    payments.value = response.payments || [];
    refunds.value = response.refunds || [];
    transitions.value = response.transitions || [];
    fulfillmentTasks.value = response.fulfillmentTasks || [];
    alerts.value = response.alerts || [];
    disputes.value = response.disputes || [];
    invoices.value = response.invoices || [];
    entitlements.value = response.entitlements || [];
    ownershipCertificates.value = response.ownershipCertificates || [];
    reservations.value = response.reservations || [];
    auditLog.value = response.auditLog || [];
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    if (error?.statusCode === 404) {
      errorMessage.value = error?.data?.message || "Order not found.";
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to load this order.";
  } finally {
    loading.value = false;
  }
}

function formatDateTime(value) {
  return formatAdminDateTime(value, "en-US");
}

function formatMoney(amount, currency) {
  return formatAdminMoney(amount, currency, "fr-FR");
}
</script>
