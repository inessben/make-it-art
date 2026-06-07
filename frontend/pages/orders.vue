<template>
  <main class="min-h-screen bg-[#000000] px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto w-full max-w-[1120px] rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Historique des commandes</p>
          <h1 class="mt-4 text-[clamp(2rem,2.5vw,2.8rem)] font-semibold leading-[1.05]">
            Toutes vos commandes récentes
          </h1>
          <p class="mt-4 max-w-2xl text-[#A0ADB4] leading-7">
            Retrouvez les commandes que vous avez passées, leur statut et le détail de chaque achat.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-transparent px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:border-[#6d8bff] hover:text-[#ffffff]"
          @click="navigateBack"
        >
          Retour au profil
        </button>
      </div>

      <div class="mt-10 space-y-5">
        <article
          v-for="order in orders"
          :key="order.id"
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.18)] transition hover:border-[#4A6CF7]"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-4">
              <div
                class="flex h-20 w-20 items-center justify-center rounded-3xl border border-[#1A1F2A] bg-[#15213d] text-xs uppercase tracking-[0.18em] text-[#6C80BC]"
              >
                CMD
              </div>
              <div class="grid gap-2">
                <div class="text-sm text-[#A0ADB4]">
                  Commande <span class="font-semibold text-[#E6EDF7]">{{ order.number }}</span>
                </div>
                <div class="text-sm text-[#A0ADB4]">Passée le {{ order.date }}</div>
                <div class="text-sm text-[#A0ADB4]">{{ order.itemCount }} article(s)</div>
              </div>
            </div>

            <div class="grid items-start gap-2 text-right">
              <span class="text-sm text-[#A0ADB4]">Total</span>
              <span class="text-xl font-semibold text-[#E6EDF7]">{{ order.total }}</span>
            </div>
          </div>

          <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span
              :class="[
                'inline-flex items-center rounded-full px-3 py-2 text-xs font-semibold uppercase',
                order.status === 'Processing'
                  ? 'bg-[#1c3350] text-[#67b7ff]'
                  : 'bg-[#21382f] text-[#6ee7b7]'
              ]"
            >
              {{ order.status }}
            </span>

            <button
              type="button"
              class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-transparent px-4 py-2 text-sm font-semibold text-[#4A6CF7] transition hover:bg-[#4A6CF7]/10"
              @click="viewDetails(order.id)"
            >
              Voir le détail
            </button>
          </div>
        </article>
      </div>

      <div
        v-if="loading"
        class="mt-6 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 text-[#A0ADB4]"
      >
        Chargement de vos commandes...
      </div>

      <div
        v-if="!loading && orders.length === 0"
        class="mt-6 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 text-[#A0ADB4]"
      >
        Vous n'avez encore aucune commande passée.
      </div>
    </section>
  </main>
</template>

<script setup>
import { navigateTo } from "#app";
import { onMounted, ref } from "vue";

definePageMeta({
  middleware: "auth"
});

const orders = ref([]);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    const response = await $fetch("/api/orders", {
      method: "GET",
      credentials: "include"
    });

    orders.value = response.orders.map((order) => ({
      ...order,
      date: new Date(order.createdAt).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }),
      total: `${order.totalToken} tokens`
    }));
  } catch (fetchError) {
    error.value = fetchError?.data?.message || "Impossible de charger les commandes.";
  } finally {
    loading.value = false;
  }
});

function navigateBack() {
  return navigateTo("/profile");
}

function viewDetails(orderId) {
  return navigateTo(`/orders/${orderId}`);
}
</script>
