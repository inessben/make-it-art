<template>
  <main class="min-h-screen bg-[#000000] px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto w-full max-w-[1120px] rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <div class="flex flex-col gap-10">
        <div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div class="flex items-start gap-6">
            <div
              class="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#1E2540] ring-1 ring-[#4A6CF7]/30"
            >
              <span class="text-4xl font-bold text-[#E6EDF7]">SM</span>
            </div>
            <div class="max-w-2xl">
              <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Profil artiste</p>
              <h1
                class="mt-4 text-[clamp(2.25rem,3vw,3.8rem)] font-semibold leading-[1.02] text-white"
              >
                Sarah Mitchell
              </h1>
              <p class="mt-4 max-w-2xl text-[#A0ADB4] leading-7">
                Digital artist based in New York, specializing in abstract and contemporary art.
                With over 10 years of experience, Sarah creates pieces that challenge perception and
                evoke emotion.
              </p>
              <div class="mt-5 flex flex-wrap items-center gap-3">
                <span
                  class="inline-flex items-center rounded-full bg-[#4A6CF7]/10 px-4 py-2 text-sm font-semibold text-[#4A6CF7]"
                >
                  www.sarahmitchell.art
                </span>
                <span
                  class="inline-flex items-center rounded-full bg-[#ffffff]/5 px-4 py-2 text-sm text-[#A0ADB4]"
                >
                  @sarahmitchell
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20"
            >
              Follow artist
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
              @click="navigateBack"
            >
              Retour au profil
            </button>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <div class="rounded-[28px] border border-[#1A1F2A] bg-[#090017] p-8">
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">A propos</p>
            <h2 class="mt-4 text-2xl font-semibold text-[#E6EDF7]">À propos de l'artiste</h2>
            <p class="mt-4 text-[#A0ADB4] leading-7">
              Sarah Mitchell is a digital artist whose work explores the relationship between light,
              texture, and personal memory. Her pieces combine monochrome palettes with expressive
              brushwork to create immersive visual stories.
            </p>
            <div class="mt-8 grid gap-4 sm:grid-cols-2">
              <div class="rounded-[24px] bg-[#0F1523] p-5 text-sm leading-6 text-[#A0ADB4]">
                <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Collections</p>
                <p class="mt-2 text-xl font-semibold text-white">12</p>
                <p class="mt-2">Curated series of digital works.</p>
              </div>
              <div class="rounded-[24px] bg-[#0F1523] p-5 text-sm leading-6 text-[#A0ADB4]">
                <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Galerie publique</p>
                <p class="mt-2 text-xl font-semibold text-white">Disponible</p>
                <p class="mt-2">Exhibition-ready and available for sale.</p>
              </div>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <article class="rounded-[24px] border border-[#1A1F2A] bg-[#12172D] p-6 text-center">
              <p class="text-sm uppercase tracking-[0.18em] text-[#4A6CF7]">Artworks</p>
              <p class="mt-4 text-3xl font-semibold text-white">24</p>
            </article>
            <article class="rounded-[24px] border border-[#1A1F2A] bg-[#12172D] p-6 text-center">
              <p class="text-sm uppercase tracking-[0.18em] text-[#4A6CF7]">Followers</p>
              <p class="mt-4 text-3xl font-semibold text-white">1.250</p>
            </article>
            <article class="rounded-[24px] border border-[#1A1F2A] bg-[#12172D] p-6 text-center">
              <p class="text-sm uppercase tracking-[0.18em] text-[#4A6CF7]">Ventes</p>
              <p class="mt-4 text-3xl font-semibold text-white">89</p>
            </article>
          </div>
        </div>

        <div class="grid gap-10">
          <section>
            <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Artworks</p>
                <h2 class="mt-3 text-2xl font-semibold text-white">Dernières œuvres</h2>
              </div>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
              >
                Voir tout
              </button>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div class="aspect-[4/5] rounded-[28px] bg-[#12172D]" />
              <div class="aspect-[4/5] rounded-[28px] bg-[#12172D]" />
              <div class="aspect-[4/5] rounded-[28px] bg-[#12172D]" />
              <div class="aspect-[4/5] rounded-[28px] bg-[#12172D]" />
              <div class="aspect-[4/5] rounded-[28px] bg-[#12172D]" />
            </div>
          </section>

          <section>
            <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Collections</p>
                <h2 class="mt-3 text-2xl font-semibold text-white">Contenus sélectionnés</h2>
              </div>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
              >
                Découvrir
              </button>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div class="aspect-[4/5] rounded-[28px] bg-[#12172D]" />
              <div class="aspect-[4/5] rounded-[28px] bg-[#12172D]" />
              <div class="aspect-[4/5] rounded-[28px] bg-[#12172D]" />
              <div class="aspect-[4/5] rounded-[28px] bg-[#12172D]" />
              <div class="aspect-[4/5] rounded-[28px] bg-[#12172D]" />
            </div>
          </section>
        </div>
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
