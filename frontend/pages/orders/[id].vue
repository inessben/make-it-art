<template>
  <main class="min-h-screen bg-black px-4 py-8 text-slate-100 sm:px-6 sm:py-10">
    <section
      class="mx-auto w-full max-w-[1120px] rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-[0_32px_90px_rgba(0,0,0,0.22)] sm:rounded-[32px] sm:p-8"
    >
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-widest text-violet-700">Order details</p>
          <h1 class="mt-4 text-title-2">
            {{ order?.number || "Order not found" }}
          </h1>
          <p class="mt-4 max-w-2xl text-slate-400 leading-7">
            {{
              order
                ? `Status: ${order.status}`
                : "Check the order number or return to your order history."
            }}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-2xl border border-violet-700 bg-transparent px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-violet-600 hover:text-white"
          @click="navigateBack"
        >
          Back to orders
        </button>
      </div>

      <div
        v-if="loading"
        class="mt-10 rounded-[24px] border border-slate-800 bg-violet-950 p-8 text-slate-400"
      >
        Loading order details...
      </div>

      <div
        v-else-if="error"
        class="mt-10 rounded-[24px] border border-red-900 bg-red-950 p-8 text-red-200"
      >
        {{ error }}
      </div>

      <div v-else class="mt-10 space-y-6">
        <div class="rounded-[24px] border border-slate-800 bg-violet-950 p-6">
          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <p class="text-xs uppercase tracking-widest text-violet-700">Order</p>
              <p class="mt-2 text-lg font-semibold text-slate-100">{{ order.number }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-widest text-violet-700">Date</p>
              <p class="mt-2 text-lg text-slate-400">{{ order.date }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-widest text-violet-700">Amount</p>
              <p class="mt-2 text-lg font-semibold text-slate-100">{{ order.total }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-[24px] border border-slate-800 bg-violet-950 p-6">
          <h2 class="text-lg font-semibold text-slate-100">Purchased artworks</h2>
          <p v-if="downloadMessage" class="mt-3 text-sm text-red-200" role="status">{{ downloadMessage }}</p>
          <div class="mt-5 space-y-4">
            <article
              v-for="item in order.items"
              :key="item.id"
              class="rounded-2xl border border-slate-800 bg-slate-850 p-4"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm text-slate-400">{{ item.artworkTitle || "Artwork" }}</p>
                  <p class="mt-1 text-base font-semibold text-slate-100">
                    {{ item.priceTokens }} tokens
                  </p>
                </div>
                <button
                  type="button"
                  class="ui-button-secondary"
                  :disabled="Boolean(downloadLoading[item.id])"
                  @click="downloadArtwork(item)"
                >
                  {{ downloadLoading[item.id] ? "Preparing..." : "Download artwork" }}
                </button>
              </div>
            </article>
          </div>
        </div>

        <div
          v-if="order.payments.length"
          class="rounded-[24px] border border-slate-800 bg-violet-950 p-6"
        >
          <h2 class="text-lg font-semibold text-slate-100">Payment</h2>
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <div class="rounded-2xl border border-slate-800 bg-slate-850 p-4">
              <p class="text-xs uppercase tracking-widest text-violet-700">Method</p>
              <p class="mt-2 text-sm text-slate-400">{{ order.payments[0].method || "—" }}</p>
            </div>
            <div class="rounded-2xl border border-slate-800 bg-slate-850 p-4">
              <p class="text-xs uppercase tracking-widest text-violet-700">Status</p>
              <p class="mt-2 text-sm text-slate-400">{{ order.payments[0].status || "—" }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { navigateTo, useRoute } from "#app";

const route = useRoute();
const order = ref(null);
const loading = ref(true);
const error = ref(null);
const downloadLoading = ref({});
const downloadMessage = ref("");

definePageMeta({
  middleware: "auth"
});

onMounted(async () => {
  try {
    const response = await $fetch(`/api/orders/${route.params.id}`, {
      method: "GET",
      credentials: "include"
    });

    order.value = {
      ...response.order,
      date: new Date(response.order.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }),
      total: `${response.order.totalToken} tokens`
    };
  } catch (fetchError) {
    error.value = fetchError?.data?.message || "Unable to load order details.";
  } finally {
    loading.value = false;
  }
});

function navigateBack() {
  return navigateTo("/orders");
}

async function downloadArtwork(item) {
  downloadMessage.value = "";
  downloadLoading.value = { ...downloadLoading.value, [item.id]: true };

  try {
    const file = await $fetch(`/api/orders/${route.params.id}/download/${item.id}`, {
      credentials: "include",
      responseType: "blob",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${item.artworkTitle || "artwork"}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (downloadError) {
    downloadMessage.value =
      downloadError?.data?.message || "This download is not available yet. Please try again later.";
  } finally {
    downloadLoading.value = { ...downloadLoading.value, [item.id]: false };
  }
}
</script>
