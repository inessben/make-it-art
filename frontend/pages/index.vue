<script setup lang="ts">
const config = useRuntimeConfig();
await useFetch(`${config.public.apiBase}/health`);
</script>

<template>
  <main class="page-home min-h-screen bg-slate-950 text-slate-100">
    <div class="mx-auto max-w-4xl px-6 py-16">
      <h2 class="page-home__subtitle text-3xl font-regular tracking-tight">Welcome to</h2>
      <h1 class="page-home__title text-4xl font-bold tracking-tight">Make It Art</h1>

      <section class="page-home__card mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <!--  -->
      </section>

      <section class="mt-8 grid gap-4 sm:grid-cols-2">
        <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <!--  -->
        </article>
        <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <!--  -->
        </article>
      </section>
    </div>
  </main>
</template>
