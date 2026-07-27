<template>
  <section
    class="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100"
    aria-live="polite"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-violet-500">Coinbase CDP</p>
        <h2 class="mt-2 text-lg font-semibold">Portefeuille numérique</h2>
      </div>
      <span
        class="w-fit rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300"
      >
        {{ statusLabel }}
      </span>
    </div>

    <p class="mt-4 text-sm leading-6 text-slate-400">
      {{ statusMessage }}
    </p>

    <p v-if="errorCode" class="mt-3 text-xs text-rose-400">Code : {{ errorCode }}</p>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { useEmbeddedWallet } from "~/composables/useEmbeddedWallet";
const { activeWallet, configured, errorCode, status } = useEmbeddedWallet();

const statusLabel = computed(() => {
  if (!configured.value) return "Non configuré";
  if (activeWallet.value) return "Actif";

  const labels = {
    failed: "Échec",
    idle: "Disponible",
    loading: "Chargement",
    pending: "Création",
    retry_required: "À relancer"
  };

  return labels[status.value] || status.value;
});

const statusMessage = computed(() => {
  if (!configured.value) {
    return "Le service de portefeuille n’est pas configuré pour cet environnement.";
  }

  if (activeWallet.value?.address) {
    return `Adresse Base : ${activeWallet.value.address}`;
  }

  if (["failed", "retry_required"].includes(status.value)) {
    return "La création n’a pas abouti. Le compte Make It Art reste entièrement utilisable.";
  }

  if (status.value === "pending") {
    return "La création du portefeuille est en cours.";
  }

  return "Aucun portefeuille numérique n’est encore associé à ce compte.";
});
</script>
