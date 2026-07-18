<template>
  <main class="history-page">
    <section class="history-panel">
      <header>
        <div>
          <p class="eyebrow">Private account</p>
          <h1>Order history</h1>
        </div>
        <NuxtLink to="/profile">Back to profile</NuxtLink>
      </header>

      <p v-if="loading" role="status">Loading your orders…</p>
      <p v-else-if="errorMessage" role="alert">{{ errorMessage }}</p>
      <p v-else-if="orders.length === 0">You do not have any orders yet.</p>

      <ul v-else class="order-list">
        <li v-for="order in orders" :key="order.id">
          <div>
            <strong>{{ getOrderStatusPresentation(order.status).title }}</strong>
            <span>{{ formatMoney(order.amount, order.currency) }}</span>
            <small>{{ new Date(order.createdAt).toLocaleString() }}</small>
          </div>
          <NuxtLink :to="`/orders/${order.id}`">View order</NuxtLink>
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { getOrderStatusPresentation } from "~/utils/order-status";

definePageMeta({ middleware: "auth" });

const loading = ref(true);
const errorMessage = ref("");
const orders = ref([]);

onMounted(async () => {
  try {
    const response = await $fetch("/api/v1/orders", { credentials: "include" });
    orders.value = response.orders;
  } catch {
    errorMessage.value = "Your private order history is temporarily unavailable.";
  } finally {
    loading.value = false;
  }
});

function formatMoney(amount, currency) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount / 100);
}
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  padding: 48px 20px;
  background: #f4f7fb;
  color: #172033;
}

.history-panel {
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 32px;
  border-radius: 16px;
  background: #fff;
}

header,
.order-list li,
.order-list li div {
  display: flex;
}

header,
.order-list li {
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.eyebrow {
  margin: 0;
  color: #3273dc;
  font-weight: 800;
  text-transform: uppercase;
}

h1 {
  margin: 6px 0 24px;
}

.order-list {
  display: grid;
  gap: 12px;
  padding: 0;
  list-style: none;
}

.order-list li {
  padding: 18px;
  border: 1px solid #dfe5ef;
  border-radius: 10px;
}

.order-list li div {
  flex-direction: column;
  gap: 4px;
}

a {
  color: #245fb8;
  font-weight: 700;
}
</style>
