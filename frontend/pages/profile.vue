<template>
  <!-- Pas fan du main si qlq peut le modif svp  -->
  <main class="min-h-screen grid place-items-center px-6 py-10 bg-[#000000] text-[#E6EDF7]">
    <div
      class="w-full max-w-[1120px] grid gap-7 rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <header class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div class="max-w-3xl">
          <p class="mb-3 text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Mon compte</p>
          <h1 class="text-[clamp(2rem,2.5vw,2.8rem)] leading-[1.05] font-semibold">
            Gérez votre compte et vos préférences
          </h1>
          <p class="mt-4 max-w-2xl text-[#A0ADB4]">
            Accédez à vos informations de compte, vos préférences et vos services.
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center justify-center min-w-[140px] rounded-2xl border border-[#1A1F2A] bg-[#10150E]/90 px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1A1F2E]"
          @click="handleLogout"
        >
          Se déconnecter
        </button>
      </header>

      <section
        v-if="loading"
        class="rounded-[24px] border border-[#1A1F2A] bg-[#01050E] p-6 text-[#A0ADB4]"
      >
        <p>Chargement du profil...</p>
      </section>

      <section
        v-else-if="user"
        class="flex flex-col gap-6 rounded-[24px] border border-[#1A1F2A] bg-[#01050E] p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="grid gap-3">
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Bienvenue</p>
          <h2 class="text-3xl font-semibold">{{ user.username || "Utilisateur" }}</h2>
          <p class="text-[#A0ADB4]">{{ user.email }}</p>
        </div>
        <span
          class="inline-flex items-center rounded-full bg-[#4A6CF7]/10 px-4 py-2 text-sm font-semibold text-[#4A6CF7]"
          >Membre</span
        >
      </section>

      <section
        v-else
        class="rounded-[24px] border border-[#1A1F2A] bg-[#01050E] p-6 text-[#A0ADB4]"
      >
        <p>{{ message }}</p>
      </section>

      <section v-if="user" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="card in cards"
          :key="card.title"
          class="group cursor-pointer grid gap-4 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-5 transition duration-200 hover:-translate-y-1 hover:border-[#262D30]"
          @click="card.title === 'Paramètres du profil' && handleSettings()"
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4A6CF7]/10 text-2xl text-[#4A6CF7]"
          >
            {{ card.icon }}
          </div>
          <div>
            <h3 class="text-base font-semibold text-[#E6EDF7]">{{ card.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">{{ card.description }}</p>
          </div>
        </article>
      </section>
    </div>
  </main>
</template>

<script setup>
import { navigateTo } from "#app";
import { storeToRefs } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "~/stores/auth";

definePageMeta({
  middleware: "auth"
});

const auth = useAuthStore();
const { user, loading } = storeToRefs(auth);
const message = ref("");

// !!!!!! A FAIRE !!!!
// Recup icones du figma pour ajouter aux cards IMPORTANT !!!!!!

const cards = [
  {
    icon: "",
    title: "Paramètres du profil",
    description: "Mettez à jour vos informations personnelles"
  },
  { icon: "", title: "Profil artiste", description: "Gérez votre portfolio artistique" },
  { icon: "", title: "Liste de souhaits", description: "Œuvres sauvegardées et favoris" },
  { icon: "", title: "Historique des commandes", description: "Consultez vos commandes passées" },
  { icon: "", title: "Moyens de paiement", description: "Gérez vos options de paiement" },
  { icon: "", title: "Portefeuille", description: "Consultez votre solde et vos transactions" },
  { icon: "", title: "Adresses", description: "Gérez vos adresses de livraison" },
  { icon: "", title: "Notifications", description: "Gérez vos préférences de notification" },
  { icon: "", title: "Paramètres", description: "Préférences du compte" }
];

async function handleLogout() {
  await auth.logout();
  await navigateTo("/login");
}

function handleSettings() {
  return navigateTo("/account-settings");
}
</script>
