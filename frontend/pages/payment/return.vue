<template>
  <main class="order-page">
    <section class="order-panel" aria-labelledby="return-title">
      <p class="eyebrow">Secure payment status</p>

      <div v-if="loading" role="status">
        <h1 id="return-title">Checking your order…</h1>
        <p>We are reading the latest status from the Make It Art server.</p>
      </div>

      <div v-else-if="order" :class="['status-card', `status-${presentation.tone}`]">
        <h1 id="return-title">{{ presentation.title }}</h1>
        <p>{{ presentation.message }}</p>
        <p class="order-reference">Order reference: {{ order.id }}</p>
        <p v-if="presentation.poll && polling" role="status">
          Verification continues automatically. You can also safely close this page.
        </p>
      </div>

      <div v-else class="status-card status-warning" role="alert">
        <h1 id="return-title">Order status unavailable</h1>
        <p>{{ errorMessage }}</p>
      </div>

      <p class="security-note">
        This page never trusts Stripe return parameters as proof of payment. Access is granted only
        after a signed server confirmation.
      </p>

      <div class="actions">
        <NuxtLink
          v-if="order && presentation.action"
          :to="presentation.action.to || `/orders/${order.id}`"
          class="primary-link"
        >
          {{ presentation.action.label }}
        </NuxtLink>
        <NuxtLink to="/orders">View order history</NuxtLink>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { CHECKOUT_ORDER_STORAGE_KEY } from "~/utils/checkout-security";
import {
  getOrderPollingDelay,
  getOrderStatusPresentation,
  MAX_ORDER_POLL_ATTEMPTS
} from "~/utils/order-status";

definePageMeta({
  middleware: ["payment-return", "auth"]
});

const loading = ref(true);
const polling = ref(false);
const errorMessage = ref("Open your order history to find the latest server status.");
const order = ref(null);
const presentation = computed(() => getOrderStatusPresentation(order.value?.status));
let pollingTimer = null;
let pollingAttempt = 0;

onMounted(async () => {
  const orderId = window.sessionStorage.getItem(CHECKOUT_ORDER_STORAGE_KEY);

  if (!orderId) {
    loading.value = false;
    return;
  }

  await loadOrder(orderId);
});

onBeforeUnmount(() => {
  if (pollingTimer) window.clearTimeout(pollingTimer);
});

async function loadOrder(orderId) {
  try {
    const response = await $fetch(`/api/v1/orders/${encodeURIComponent(orderId)}`, {
      credentials: "include"
    });
    order.value = response.order;

    if (presentation.value.poll && pollingAttempt < MAX_ORDER_POLL_ATTEMPTS) {
      schedulePoll(orderId);
    } else {
      polling.value = false;
    }
  } catch {
    errorMessage.value = "The order could not be retrieved. Please use your private order history.";
  } finally {
    loading.value = false;
  }
}

function schedulePoll(orderId) {
  polling.value = true;
  const delay = getOrderPollingDelay(pollingAttempt);
  pollingAttempt += 1;
  pollingTimer = window.setTimeout(() => loadOrder(orderId), delay);
}
</script>

<style scoped>
.order-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 20px;
  background: #f4f7fb;
  color: #172033;
}

.order-panel {
  width: min(660px, 100%);
  padding: 36px;
  border: 1px solid #dfe5ef;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 45px rgba(23, 32, 51, 0.1);
}

.eyebrow {
  margin: 0 0 8px;
  color: #3273dc;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 18px;
}

p {
  line-height: 1.6;
}

.status-card,
.order-reference,
.security-note {
  padding: 14px;
  border-radius: 8px;
}

.status-success {
  background: #e9f7ef;
}

.status-error {
  background: #fbe9ec;
}

.status-warning,
.status-pending,
.order-reference,
.security-note {
  background: #f4f7fb;
}

.order-reference {
  overflow-wrap: anywhere;
  font-weight: 700;
}

.security-note {
  color: #526078;
}

.actions {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 24px;
}

.actions a {
  color: #245fb8;
  font-weight: 700;
}

.primary-link {
  padding: 12px 18px;
  border-radius: 8px;
  background: #172033;
  color: #fff !important;
  text-decoration: none;
}

@media (max-width: 520px) {
  .order-panel {
    padding: 24px;
  }

  .actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
