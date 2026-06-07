<template>
  <main class="min-h-screen bg-[#000000] px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto w-full max-w-[1120px] rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Mon compte</p>
          <h1 class="mt-4 text-[clamp(2rem,2.5vw,2.8rem)] font-semibold leading-[1.05]">
            {{ sectionData.title }}
          </h1>
          <p class="mt-4 max-w-2xl text-[#A0ADB4] leading-7">
            {{ sectionData.description }}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-transparent px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:border-[#6d8bff] hover:text-[#ffffff]"
          @click="goBack"
        >
          Retour au profil
        </button>
      </div>

      <div class="mt-10 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8 text-[#A0ADB4]">
        <p>
          Cette page est prête pour être enrichie avec la fonctionnalité correspondante. En
          attendant, la navigation fonctionne vers cette section.
        </p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed } from "vue";
import { navigateTo, useRoute } from "#app";

const route = useRoute();
const section = route.params.section;

const sections = {
  "artist-profile": {
    title: "Profil artiste",
    description: "Gérez votre portfolio artistique et vos informations de présentation."
  },
  wishlist: {
    title: "Liste de souhaits",
    description: "Retrouvez vos œuvres préférées et vos favoris."
  },
  orders: {
    title: "Historique des commandes",
    description: "Consultez vos commandes passées et leur statut."
  },
  "payment-methods": {
    title: "Moyens de paiement",
    description: "Gérez vos cartes et options de paiement."
  },
  wallet: {
    title: "Portefeuille",
    description: "Consultez votre solde et vos transactions enregistrées."
  },
  addresses: {
    title: "Adresses",
    description: "Gérez vos adresses de livraison et de facturation."
  },
  notifications: {
    title: "Notifications",
    description: "Configurez vos préférences de notification."
  },
  settings: {
    title: "Paramètres",
    description: "Gérez les préférences générales de votre compte."
  }
};

definePageMeta({
  middleware: "auth"
});

const sectionData = computed(() => {
  return (
    sections[section] || {
      title: "Section introuvable",
      description:
        "Cette section n'existe pas encore. Retournez au profil pour choisir une autre page."
    }
  );
});

function goBack() {
  return navigateTo("/profile");
}
</script>
