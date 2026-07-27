<template>
  <AccountSectionShell
    eyebrow="Payments"
    title="Saved cards"
    description="Stripe securely stores your billing details. Make It Art only displays the brand, last four digits and expiration date."
  >
    <p
      v-if="feedbackMessage"
      class="rounded-2xl border px-5 py-4 text-sm"
      :class="
        feedbackType === 'success'
          ? 'border-green-900 bg-green-950/60 text-green-200'
          : 'border-red-900 bg-red-950/70 text-red-200'
      "
      :role="feedbackType === 'error' ? 'alert' : 'status'"
    >
      {{ feedbackMessage }}
    </p>

    <AppStatePanel
      v-if="loading"
      type="loading"
      title="Loading saved cards"
      message="Stripe is checking your stored payment methods."
    />

    <AppStatePanel
      v-else-if="loadError"
      type="error"
      title="Cards temporarily unavailable"
      message="The saved payment methods list could not be loaded. No payment method was changed."
      action-label="Try again"
      @action="loadPaymentMethods"
    />

    <AppStatePanel
      v-else-if="paymentMethods.length === 0"
      type="empty"
      title="No saved cards yet"
      message="During your next checkout, use Stripe's save-card option to store your payment method for future purchases."
    />

    <div v-else class="grid gap-4" aria-live="polite">
      <article
        v-for="paymentMethod in paymentMethods"
        :key="paymentMethod.id"
        class="flex flex-col gap-5 rounded-2xl border border-slate-800 bg-black/40 p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-4">
          <span
            class="grid h-12 w-16 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-xs font-semibold uppercase text-slate-200"
            aria-hidden="true"
          >
            {{ formatBrand(paymentMethod.brand) }}
          </span>
          <div>
            <p class="font-semibold text-white">
              {{ formatBrand(paymentMethod.brand) }} **** {{ paymentMethod.last4 }}
            </p>
            <p class="mt-1 text-sm text-slate-400">
              Expires {{ formatExpiry(paymentMethod.expMonth, paymentMethod.expYear) }}
            </p>
          </div>
        </div>

        <div v-if="pendingRemovalId === paymentMethod.id" class="flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
            :disabled="Boolean(removingId)"
            @click="pendingRemovalId = ''"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-xl border border-red-800 bg-red-950/70 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-900/70 disabled:opacity-50"
            :disabled="Boolean(removingId)"
            @click="removePaymentMethod(paymentMethod.id)"
          >
            {{ removingId === paymentMethod.id ? "Removing..." : "Confirm removal" }}
          </button>
        </div>
        <button
          v-else
          type="button"
          class="rounded-xl border border-red-900 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/60"
          :disabled="Boolean(removingId)"
          @click="pendingRemovalId = paymentMethod.id"
        >
          Remove
        </button>
      </article>
    </div>

    <p class="text-sm leading-6 text-slate-500">
      Removing a card detaches it from your Make It Art Stripe customer profile. This action does
      not cancel or refund any previous order. Review our
      <NuxtLink to="/privacy" class="text-violet-400 underline">privacy policy</NuxtLink>.
    </p>
  </AccountSectionShell>
</template>

<script setup>
import { onMounted, ref } from "vue";

definePageMeta({
  middleware: "auth"
});

const paymentMethods = ref([]);
const loading = ref(true);
const loadError = ref(false);
const pendingRemovalId = ref("");
const removingId = ref("");
const feedbackMessage = ref("");
const feedbackType = ref("success");

onMounted(loadPaymentMethods);

async function loadPaymentMethods() {
  loading.value = true;
  loadError.value = false;

  try {
    const response = await $fetch("/api/v1/payment-methods", {
      credentials: "include"
    });
    paymentMethods.value = Array.isArray(response.paymentMethods) ? response.paymentMethods : [];
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

async function getCsrfToken() {
  return $fetch("/api/v1/security/csrf-token", {
    credentials: "include"
  });
}

async function removePaymentMethod(paymentMethodId) {
  if (removingId.value) {
    return;
  }

  removingId.value = paymentMethodId;
  feedbackMessage.value = "";

  try {
    const csrf = await getCsrfToken();
    await $fetch(`/api/v1/payment-methods/${encodeURIComponent(paymentMethodId)}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "x-csrf-token": csrf.csrfToken }
    });
    paymentMethods.value = paymentMethods.value.filter(
      (paymentMethod) => paymentMethod.id !== paymentMethodId
    );
    pendingRemovalId.value = "";
    feedbackType.value = "success";
    feedbackMessage.value = "The card was removed from your saved payment methods.";
  } catch {
    feedbackType.value = "error";
    feedbackMessage.value = "The card could not be removed. No other payment method was changed.";
  } finally {
    removingId.value = "";
  }
}

function formatBrand(value) {
  const labels = {
    amex: "American Express",
    mastercard: "Mastercard",
    visa: "Visa"
  };

  return labels[value] || "Card";
}

function formatExpiry(month, year) {
  if (!Number.isSafeInteger(month) || !Number.isSafeInteger(year)) {
    return "-";
  }

  return `${String(month).padStart(2, "0")}/${year}`;
}
</script>
