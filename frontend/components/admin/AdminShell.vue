<template>
  <main class="min-h-screen bg-black px-4 py-6 text-slate-100 sm:px-5 sm:py-8">
    <section
      class="mx-auto grid w-full max-w-[1280px] border border-slate-900 lg:grid-cols-[320px_minmax(0,1fr)]"
    >
      <AdminSidebar />

      <div class="min-w-0 bg-black">
        <AdminHeader :eyebrow="eyebrow" :title="title" :description="description">
          <template v-if="$slots.actions" #actions>
            <slot name="actions" />
          </template>
        </AdminHeader>

        <div class="grid gap-6 p-4 sm:p-5 lg:p-8">
          <slot />
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
defineProps({
  eyebrow: { type: String, default: "Admin" },
  title: { type: String, required: true },
  description: { type: String, required: true }
});
</script>
