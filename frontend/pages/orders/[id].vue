<template>
  <main class="min-h-screen bg-[#000000] px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto w-full max-w-[1120px] rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Détail de la commande</p>
          <h1 class="mt-4 text-[clamp(2rem,2.5vw,2.8rem)] font-semibold leading-[1.05]">
            {{ order?.number || "Commande introuvable" }}
          </h1>
          <p class="mt-4 max-w-2xl text-[#A0ADB4] leading-7">
            {{
              order
                ? `Statut : ${order.status}`
                : "Vérifiez le numéro de commande ou revenez à votre historique."
            }}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-transparent px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:border-[#6d8bff] hover:text-[#ffffff]"
          @click="navigateBack"
        >
          Retour aux commandes
        </button>
      </div>

      <div
        v-if="loading"
        class="mt-10 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8 text-[#A0ADB4]"
      >
        Chargement du détail de la commande...
      </div>

      <div
        v-else-if="error"
        class="mt-10 rounded-[24px] border border-[#7f1d1d] bg-[#2b1014] p-8 text-[#FECACA]"
      >
        {{ error }}
      </div>

      <div v-else class="mt-10 space-y-6">
        <div class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Commande</p>
              <p class="mt-2 text-lg font-semibold text-[#E6EDF7]">{{ order.number }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Date</p>
              <p class="mt-2 text-lg text-[#A0ADB4]">{{ order.date }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Montant</p>
              <p class="mt-2 text-lg font-semibold text-[#E6EDF7]">{{ order.total }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
          <h2 class="text-lg font-semibold text-[#E6EDF7]">Articles</h2>
          <div class="mt-5 space-y-4">
            <article
              v-for="item in order.items"
              :key="item.id"
              class="rounded-2xl border border-[#1A1F2A] bg-[#0d1120] p-4"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm text-[#A0ADB4]">{{ item.artworkTitle || "Oeuvre" }}</p>
                  <p class="mt-1 text-base font-semibold text-[#E6EDF7]">
                    {{ item.priceTokens }} tokens
                  </p>
                </div>
                <span
                  class="inline-flex items-center rounded-full bg-[#1c3350] px-3 py-2 text-xs uppercase text-[#67b7ff]"
                >
                  Article n°{{ item.id }}
                </span>
              </div>
            </article>
          </div>
        </div>

        <div
          v-if="order.payments.length"
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6"
        >
          <h2 class="text-lg font-semibold text-[#E6EDF7]">Paiement</h2>
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <div class="rounded-2xl border border-[#1A1F2A] bg-[#0d1120] p-4">
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Méthode</p>
              <p class="mt-2 text-sm text-[#A0ADB4]">{{ order.payments[0].method || "—" }}</p>
            </div>
            <div class="rounded-2xl border border-[#1A1F2A] bg-[#0d1120] p-4">
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Statut</p>
              <p class="mt-2 text-sm text-[#A0ADB4]">{{ order.payments[0].status || "—" }}</p>
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
      date: new Date(response.order.createdAt).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }),
      total: `${response.order.totalToken} tokens`
    };
  } catch (fetchError) {
    error.value = fetchError?.data?.message || "Impossible de charger le détail de la commande.";
  } finally {
    loading.value = false;
  }
});

function navigateBack() {
  return navigateTo("/orders");
}
</script>
