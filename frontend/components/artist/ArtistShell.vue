<template>
  <main class="min-h-screen bg-black text-slate-100">
    <section
      class="mx-auto grid w-full max-w-[1440px] gap-8 px-5 py-8 lg:grid-cols-[258px_minmax(0,1fr)]"
    >
      <AccountSettingsSidebar />

      <div class="min-w-0 pb-16 pt-1 lg:px-4">
        <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
              {{ eyebrow }}
            </p>
            <h1 class="mt-3 text-title-2 text-slate-100">{{ title }}</h1>
            <p class="mt-2 max-w-3xl text-body-1 leading-7 text-slate-400">
              {{ description }}
            </p>
          </div>

          <div v-if="$slots.actions" class="flex flex-wrap gap-3">
            <slot name="actions" />
          </div>
        </header>

        <div class="mt-8 grid gap-6">
          <slot />
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
defineProps({
  eyebrow: {
    type: String,
    default: "Espace artiste"
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  }
});
</script>
