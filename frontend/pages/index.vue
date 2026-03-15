<script setup lang="ts">
const config = useRuntimeConfig();
const { data, pending, error } = await useFetch(`${config.public.apiBase}/health`);
</script>

<template>
  <main class="page-home min-h-screen bg-slate-950 text-slate-100">
    <div class="mx-auto max-w-4xl px-6 py-16">
      <h1 class="page-home__title text-4xl font-bold tracking-tight">Make It Art</h1>
      <p class="mt-3 text-slate-300">
        Base project ready: Nuxt + Tailwind + Sass + Express + Docker + Nginx.
      </p>

      <section class="page-home__card mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 class="text-xl font-semibold">Backend status</h2>
        <p v-if="pending" class="mt-2 text-slate-400">Checking backend...</p>
        <p v-else-if="error" class="mt-2 text-red-400">API unavailable for now.</p>
        <pre
          v-else
          class="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-cyan-300"
          >{{ data }}</pre
        >
      </section>

      <section class="mt-8 grid gap-4 sm:grid-cols-2">
        <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 class="font-semibold">Frontend stack</h3>
          <p class="mt-2 text-sm text-slate-300">Nuxt, Tailwind, Sass (BEM-ready).</p>
        </article>
        <article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 class="font-semibold">Infra stack</h3>
          <p class="mt-2 text-sm text-slate-300">
            Docker Compose, Nginx reverse proxy, CI templates.
          </p>
        </article>
      </section>
    </div>
  </main>
</template>
