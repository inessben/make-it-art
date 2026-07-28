<template>
  <main class="min-h-screen bg-black px-5 py-8 text-slate-100 sm:px-6 sm:py-10">
    <section class="mx-auto w-full max-w-[1120px] pb-16 pt-1">
      <header>
        <h1 class="text-title-2">My Wallet</h1>
        <p class="mt-2 text-body-1 text-slate-400">
          Manage your embedded Base wallet, public address and secure access.
        </p>
      </header>

      <WalletConsentPanel class="mt-8" />
    </section>
  </main>
</template>

<script setup>
import WalletConsentPanel from "~/components/account/WalletConsentPanel.vue";

definePageMeta({ middleware: "auth" });
</script>
