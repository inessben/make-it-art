<template>
  <main class="min-h-screen bg-[#000000] px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto w-full max-w-[1120px] rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Notifications</p>
          <h1 class="mt-4 text-[clamp(2rem,2.5vw,2.8rem)] font-semibold leading-[1.05]">
            Préférences de notification
          </h1>
          <p class="mt-4 max-w-2xl text-[#A0ADB4] leading-7">
            Gérez comment et quand vous recevez les alertes et notifications.
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

      <div class="mt-10 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8 text-[#A0ADB4]">
        <p>Contenu spécifique aux notifications sera ajouté ici.</p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { navigateTo } from "#app";

definePageMeta({
  middleware: "auth"
});

function navigateBack() {
  return navigateTo("/profile");
}
</script>
