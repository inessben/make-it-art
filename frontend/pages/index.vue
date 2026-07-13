<template>
  <main class="overflow-hidden bg-black text-slate-100">
    <section
      class="flex min-h-[790px] items-start justify-center px-6 pt-[112px] text-center lg:min-h-[840px] lg:pt-[140px]"
    >
      <div class="flex flex-col items-center">
        <h1 class="flex flex-col items-center uppercase">
          <span class="text-title-2 font-light leading-[0.95] text-slate-100 sm:text-title-1 lg:text-big-title-4">Welcome to</span>
          <span class="text-title-1 font-black leading-[0.9] text-violet-600 sm:text-big-title-4 lg:text-big-title-3">Make It Art</span>
        </h1>
        <p class="mt-7 text-title-4 uppercase tracking-[0.28em] text-slate-500">
          Digital arts curations &amp; artists marketplace
        </p>
        <div class="mt-14 flex flex-wrap justify-center gap-6">
          <NuxtLink
            to="/artworks"
            class="inline-flex h-16 min-w-[238px] items-center justify-center bg-violet-600 px-8 text-subtitle-2 font-bold uppercase tracking-[0.22em] text-black transition-colors hover:bg-violet-400"
          >
            Start exploring
          </NuxtLink>
          <NuxtLink
            to="/artists"
            class="inline-flex h-16 min-w-[238px] items-center justify-center border border-slate-800 bg-black px-8 text-subtitle-2 font-bold uppercase tracking-[0.22em] text-slate-100 transition-colors hover:border-violet-600"
          >
            View galleries
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-[1392px] px-6 pb-28">
      <div>
        <h2 class="text-title-2 uppercase text-slate-100">Browse by categories</h2>
        <p class="mt-2 text-body-1 text-slate-400">
          Discover art across diverse digital disciplines.
        </p>
      </div>

      <div
        class="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-5"
        aria-label="Category placeholders"
      >
        <div class="min-h-[322px] border border-slate-900 bg-slate-950 lg:col-span-2" />
        <div class="min-h-[322px] border border-slate-900 bg-slate-950 lg:col-span-3" />
        <div class="min-h-[322px] border border-slate-900 bg-slate-950 lg:col-span-5" />
      </div>

      <div class="mt-6 flex justify-end">
        <NuxtLink
          to="/artworks"
          class="inline-flex items-center gap-3 text-footer text-slate-400 underline underline-offset-4 transition-colors hover:text-violet-400"
        >
          all categories → <span aria-hidden="true"></span>
        </NuxtLink>
      </div>
    </section>

    <section class="mx-auto w-full max-w-[1440px] pb-28">
      <div class="px-6">
        <h2 class="text-title-2 uppercase text-slate-100">Featured artworks</h2>
        <p class="mt-2 text-body-1 text-slate-400">
          Hand-picked digital masterpieces from our global roster.
        </p>
      </div>

      <div
        class="mt-14 grid grid-cols-1 gap-12 px-6 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Featured artwork placeholders"
      >
        <div class="min-h-[462px] border border-slate-900 bg-slate-950" />
        <div class="min-h-[462px] border border-slate-900 bg-slate-950" />
        <div class="min-h-[462px] border border-slate-900 bg-slate-950" />
        <div class="min-h-[462px] border border-slate-900 bg-slate-950" />
      </div>

      <div class="mt-16 flex justify-end px-6">
        <NuxtLink
          to="/artworks"
          class="inline-flex items-center gap-3 text-footer text-slate-400 underline underline-offset-4 transition-colors hover:text-violet-400"
        >
          more artworks → <span aria-hidden="true"></span>
        </NuxtLink>
      </div>
    </section>

    <section class="mx-auto w-full max-w-[1392px] px-6 pb-36">
      <div>
        <h2 class="text-title-2 uppercase text-slate-100">Some artists</h2>
        <p class="mt-2 text-body-1 text-slate-400">
          Discover art across diverse digital disciplines.
        </p>
      </div>

      <div class="relative mt-14 px-16">
        <button
          type="button"
          class="absolute left-0 top-1/2 flex h-14 w-10 -translate-y-1/2 items-center justify-center text-title-3 text-slate-100"
          aria-label="Previous artists"
        >
          ‹
        </button>
        <div
          class="grid grid-cols-1 gap-6 md:grid-cols-3"
          aria-label="Artist profile placeholders"
        >
          <div class="min-h-[370px] border border-slate-800 bg-slate-950" />
          <div class="min-h-[370px] border border-slate-800 bg-slate-950" />
          <div class="min-h-[370px] border border-slate-800 bg-slate-950" />
        </div>
        <button
          type="button"
          class="absolute right-0 top-1/2 flex h-14 w-10 -translate-y-1/2 items-center justify-center text-title-3 text-slate-100"
          aria-label="Next artists"
        >
          ›
        </button>
      </div>

      <div class="mx-16 mt-5 grid grid-cols-3 gap-4" aria-hidden="true">
        <span class="h-1 bg-slate-500" /><span class="h-1 bg-slate-500" /><span
          class="h-1 bg-slate-500"
        />
      </div>
      <div class="mt-16 flex justify-end">
        <NuxtLink
          to="/artists"
          class="inline-flex items-center gap-3 text-footer text-slate-400 underline underline-offset-4 transition-colors hover:text-violet-400"
        >
          all artists → <span aria-hidden="true"></span>
        </NuxtLink>
      </div>
    </section>

    <section
      class="relative border-y border-violet-950 bg-gradient-to-b from-violet-950 to-black px-5 py-16 sm:px-6 sm:py-20"
    >
      <h2 class="text-center text-title-2 uppercase text-slate-100 sm:text-title-1">Join the collective</h2>
      <p class="mx-auto mt-4 max-w-2xl text-center text-body-1 leading-7 text-slate-400">
        Get early access to curated drops or apply to showcase your work on Make It Art.
      </p>
      <div
        class="relative mx-auto mt-10 grid w-full max-w-[1180px] overflow-hidden border border-violet-950 bg-slate-950/95 md:grid-cols-2"
      >
        <form class="flex flex-col justify-center border-b border-violet-950 px-6 py-10 md:border-b-0 md:border-r sm:px-10" @submit.prevent="subscribe">
          <p class="text-body-1 text-slate-300">
            Subscribe for exclusive access to early drops and artist features.
          </p>
          <label class="mt-7 grid gap-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-400">
            Email address
            <span class="flex flex-col gap-3 sm:flex-row">
              <input v-model.trim="newsletterEmail" required type="email" autocomplete="email" class="ui-field" placeholder="you@example.com" />
              <button type="submit" class="ui-button-secondary shrink-0">Subscribe</button>
            </span>
          </label>
          <p v-if="newsletterMessage" class="mt-3 text-footer text-violet-400" role="status">{{ newsletterMessage }}</p>
        </form>
        <div class="flex flex-col justify-center px-6 py-10 sm:px-10">
          <p class="text-body-1 leading-7 text-slate-300">
            Are you an artist ready to sell your work? Submit your profile for curation.
          </p>
          <NuxtLink
            to="/become-artist"
            class="ui-button-primary mt-7"
            >Become an artist</NuxtLink
          >
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref } from "vue";

const newsletterEmail = ref("");
const newsletterMessage = ref("");

function subscribe() {
  newsletterMessage.value = "Thank you. You are on the early-access list.";
  newsletterEmail.value = "";
}
</script>
