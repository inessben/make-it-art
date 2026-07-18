<template>
  <main class="return-page">
    <section class="return-panel" aria-labelledby="return-title">
      <p class="eyebrow">Payment submitted</p>
      <h1 id="return-title">We are verifying your payment</h1>
      <p>
        Your bank may still be processing the transaction. Access to the artwork will only be
        granted after Make It Art receives a valid confirmation directly from Stripe.
      </p>
      <p v-if="orderId" class="order-reference">Order reference: {{ orderId }}</p>
      <p class="security-note">
        Returning to this page is not proof that the payment succeeded. You can safely close it
        while verification continues.
      </p>
      <div class="actions">
        <NuxtLink to="/profile" class="primary-link">View my account</NuxtLink>
        <NuxtLink to="/cart">Return to cart</NuxtLink>
      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { CHECKOUT_ORDER_STORAGE_KEY } from "~/utils/checkout-security";

definePageMeta({
  middleware: ["payment-return", "auth"]
});

const orderId = ref("");

onMounted(() => {
  orderId.value = window.sessionStorage.getItem(CHECKOUT_ORDER_STORAGE_KEY) || "";
});
</script>

<style scoped>
.return-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 20px;
  background: #f4f7fb;
  color: #172033;
}

.return-panel {
  width: min(620px, 100%);
  padding: 36px;
  border: 1px solid #dfe5ef;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 18px 45px rgba(23, 32, 51, 0.1);
}

.eyebrow {
  margin: 0;
  color: #3273dc;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 8px 0 20px;
}

p {
  line-height: 1.6;
}

.order-reference,
.security-note {
  padding: 14px;
  border-radius: 8px;
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
  color: #ffffff !important;
  text-decoration: none;
}

@media (max-width: 520px) {
  .return-panel {
    padding: 24px;
  }

  .actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
