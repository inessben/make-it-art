<template>
  <main class="min-h-screen bg-[#000000] px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto w-full max-w-[1380px] rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.22)] sm:p-6 xl:p-7"
    >
      <div class="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <AdminSidebar />

        <div class="grid gap-6">
          <AdminHeader :eyebrow="eyebrow" :title="title" :description="description">
            <template v-if="$slots.actions" #actions>
              <slot name="actions" />
            </template>
          </AdminHeader>

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
    default: "Administration"
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
