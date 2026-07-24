<template>
  <main class="min-h-screen bg-black px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
    <section
      class="mx-auto w-full max-w-[1120px] rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-[0_32px_90px_rgba(0,0,0,0.22)] sm:rounded-[32px] sm:p-8"
    >
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-widest text-violet-700">Payment methods</p>
          <h1 class="mt-4 text-title-2">Manage your payments</h1>
          <p class="mt-4 max-w-2xl text-slate-400 leading-7">
            Add or remove cards and manage your payment methods.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-2xl border border-violet-700 bg-transparent px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-violet-600 hover:text-white"
          @click="navigateBack"
        >
          Back to profile
        </button>
      </div>

      <AppStatePanel
        class="mt-10"
        type="disabled"
        title="Payment methods unavailable"
        message="Payment method management will be enabled when the checkout provider is connected."
      />
    </section>
  </main>
</template>

<script setup>
import { navigateTo } from "#app";

definePageMeta({
  middleware: "auth"
});

function navigateBack() {
  return navigateTo("/account-settings");
}
</script>
