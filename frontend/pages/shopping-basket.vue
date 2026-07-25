<template>
  <main class="min-h-screen bg-black px-5 py-12 text-slate-100 sm:px-8">
    <section
      class="mx-auto w-full max-w-[1280px] border border-slate-800 bg-slate-950/75 p-6 sm:p-10"
    >
      <header
        class="flex flex-col gap-6 border-b border-slate-800 pb-8 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="text-subtitle-2 uppercase tracking-[0.14em] text-violet-400">Your selection</p>
          <h1 class="mt-3 text-title-2">Shopping basket</h1>
          <p class="mt-3 max-w-2xl text-body-1 text-slate-400">
            Review the artworks selected before continuing to checkout.
          </p>
        </div>
        <NuxtLink
          to="/artworks"
          class="inline-flex h-12 items-center justify-center border border-violet-600 px-7 text-subtitle-2 uppercase tracking-[0.1em] text-slate-100 transition-colors hover:bg-violet-950"
        >
          Continue shopping
        </NuxtLink>
      </header>

      <div class="grid min-h-[420px] place-items-center py-16 text-center">
        <div class="max-w-md">
          <img
            class="mx-auto h-12 w-12 opacity-60"
            src="/icons/shopping-basket.svg"
            alt=""
            loading="lazy"
          />
          <h2 class="mt-6 text-title-3">Your basket is empty</h2>
          <p class="mt-3 text-body-1 leading-7 text-slate-400">
            Artworks added from the marketplace will appear here.
          </p>
          <NuxtLink
            to="/artworks"
            class="mt-8 inline-flex h-12 items-center justify-center bg-violet-600 px-8 text-subtitle-2 uppercase tracking-[0.1em] text-white"
          >
            Explore artworks
          </NuxtLink>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
definePageMeta({ middleware: "auth" });
</script>
