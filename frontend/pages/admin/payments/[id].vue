<template>
  <AdminShell
    :title="payment?.reference || 'Payment detail'"
    description="Payment operations sheet with Stripe identifiers, linked order context and audit history."
  >
    <template #actions>
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          to="/admin/payments"
          class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
        >
          Back to payments
        </NuxtLink>
        <NuxtLink
          v-if="payment?.order?.publicId"
          :to="`/admin/orders/${payment.order.publicId}`"
          class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
        >
          Open order
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
      Loading payment detail...
    </div>

    <template v-else-if="payment">
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

      <section class="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Overview</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Payment identity</h2>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Status</p>
              <p class="mt-2 text-sm text-slate-100">{{ payment.status }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Method</p>
              <p class="mt-2 text-sm text-slate-100">{{ payment.method }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Provider</p>
              <p class="mt-2 text-sm text-slate-100">{{ payment.provider }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Created</p>
              <p class="mt-2 text-sm text-slate-100">{{ formatDateTime(payment.createdAt) }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Provider payment ID</p>
              <p class="mt-2 break-all text-sm text-slate-100">
                {{ payment.providerPaymentId || "-" }}
              </p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Provider charge ID</p>
              <p class="mt-2 break-all text-sm text-slate-100">
                {{ payment.providerChargeId || "-" }}
              </p>
            </div>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Linked order</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Commercial context</h2>

          <div v-if="payment.order" class="mt-6 grid gap-3">
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Order</p>
              <p class="mt-2 text-sm text-slate-100">{{ payment.order.reference }}</p>
              <p class="mt-1 text-sm text-slate-400">{{ payment.order.status }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Customer</p>
              <p class="mt-2 text-sm text-slate-100">
                {{ payment.order.customer?.username || "User" }}
              </p>
              <p class="mt-1 text-sm text-slate-400">{{ payment.order.customer?.email }}</p>
            </div>
            <div class="border border-slate-800 bg-black/30 p-4">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Order total</p>
              <p class="mt-2 text-sm text-slate-100">
                {{ formatMoney(payment.order.totalAmount, payment.order.currency) }}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Order items</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Items covered by this payment</h2>

          <div v-if="orderItems.length === 0" class="mt-6 text-sm text-slate-400">
            No order item linked to this payment.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="item in orderItems"
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
                {{ item.artistName }} - Qty {{ item.quantity }}
              </p>
            </article>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Refunds</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Refund requests</h2>

          <div v-if="refunds.length === 0" class="mt-6 text-sm text-slate-400">
            No refund linked to this payment.
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
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Stripe feed</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Webhook history</h2>

          <div v-if="webhookEvents.length === 0" class="mt-6 text-sm text-slate-400">
            No webhook stored for this payment.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="event in webhookEvents"
              :key="event.eventId"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="font-semibold text-slate-100">{{ event.eventType }}</p>
              <p class="mt-2 break-all text-sm text-slate-400">{{ event.eventId }}</p>
              <p class="mt-2 text-sm text-slate-400">
                {{ event.status }} - {{ formatDateTime(event.createdAt) }}
              </p>
            </article>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Transitions</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Financial transitions</h2>

          <div v-if="transitions.length === 0" class="mt-6 text-sm text-slate-400">
            No transition recorded for this payment.
          </div>

          <div v-else class="mt-6 grid gap-3">
            <article
              v-for="transition in transitions"
              :key="transition.id"
              class="border border-slate-800 bg-black/30 p-4"
            >
              <p class="font-semibold text-slate-100">
                {{ transition.previousStatus }} -> {{ transition.nextStatus }}
              </p>
              <p class="mt-2 text-sm text-slate-400">
                {{ transition.reasonCode }} - {{ formatDateTime(transition.createdAt) }}
              </p>
            </article>
          </div>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Operations</p>
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
                {{ formatMoney(dispute.amount, dispute.currency) }}
              </p>
            </article>
            <p v-if="alerts.length === 0 && disputes.length === 0" class="text-sm text-slate-400">
              No alert or dispute linked to this payment.
            </p>
          </div>
        </article>

        <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Audit</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Operational audit log</h2>

          <div v-if="auditLog.length === 0" class="mt-6 text-sm text-slate-400">
            No audit entry recorded for this payment scope.
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
        </article>
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
const payment = ref(null);
const refunds = ref([]);
const webhookEvents = ref([]);
const transitions = ref([]);
const alerts = ref([]);
const disputes = ref([]);
const auditLog = ref([]);

const summaryCards = computed(() => [
  {
    label: "Status",
    value: payment.value?.status || "-",
    description: "Current payment state."
  },
  {
    label: "Amount",
    value: payment.value ? formatMoney(payment.value.amount, payment.value.currency) : "-",
    description: "Recorded payment amount."
  },
  {
    label: "Refunded",
    value: payment.value ? formatMoney(payment.value.refundedAmount, payment.value.currency) : "-",
    description: "Amount already refunded."
  },
  {
    label: "Webhooks",
    value: webhookEvents.value.length,
    description: "Stored Stripe events for this payment."
  },
  {
    label: "Refunds",
    value: refunds.value.length,
    description: "Refund requests linked to this payment."
  }
]);

const orderItems = computed(() => payment.value?.order?.items || []);

onMounted(async () => {
  await loadPaymentDetail();
});

async function loadPaymentDetail() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch(`/api/admin/payments/${route.params.id}`, {
      credentials: "include"
    });

    payment.value = response.payment;
    refunds.value = response.refunds || [];
    webhookEvents.value = response.webhookEvents || [];
    transitions.value = response.transitions || [];
    alerts.value = response.alerts || [];
    disputes.value = response.disputes || [];
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
      errorMessage.value = error?.data?.message || "Payment not found.";
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to load this payment.";
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
