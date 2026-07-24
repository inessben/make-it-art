<template>
  <footer id="about-us" class="bg-black text-slate-100 md:min-h-[685px]">
    <div
      class="mx-auto flex w-full max-w-[1176px] flex-col px-6 py-16 md:min-h-[685px] md:pb-[126px] md:pt-[140px]"
    >
      <div class="grid gap-14 md:grid-cols-[1.55fr_1fr_0.7fr] md:gap-24">
        <section>
          <NuxtLink
            to="/"
            class="ml-5 flex w-fit items-center gap-5"
            aria-label="Make It Art - Home"
            ><img class="h-12 w-10 object-contain" src="/logo.png" alt="" /><span
              class="text-title-4"
              >MAKE IT ART</span
            ></NuxtLink
          >
          <p class="mt-7 text-footer leading-[1.7] text-slate-100">
            Art is the destination...<br />Your imagination, the process !
          </p>
          <nav
            class="mt-10 flex flex-wrap items-center gap-8 md:mt-[66px]"
            aria-label="Social media"
          >
            <a
              href="https://x.com/makeitart_io"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Make It Art on X"
              ><img class="h-8 w-8" src="/icons/x.svg" alt=""
            /></a>
            <a
              href="https://discord.gg/TsF3jMGDr3"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Join Make It Art on Discord"
              ><img class="h-8 w-11" src="/icons/discord.svg" alt=""
            /></a>
            <a
              href="https://www.instagram.com/makeitart.io/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Make It Art on Instagram"
              ><img class="h-8 w-8" src="/icons/instagram.svg" alt=""
            /></a>
            <a href="mailto:contact@makeitart.io" aria-label="Email Make It Art"
              ><img class="h-8 w-11" src="/icons/mail.svg" alt=""
            /></a>
          </nav>
        </section>
        <section class="md:pt-[38px]">
          <h2 class="text-title-3">Catalogue</h2>
          <nav class="mt-7 flex flex-col gap-[18px] text-footer">
            <NuxtLink class="hover:text-violet-400" to="/artworks?artType=illustration"
              >Digital Art</NuxtLink
            ><NuxtLink class="hover:text-violet-400" to="/artworks?artType=photography"
              >Photography</NuxtLink
            ><NuxtLink class="hover:text-violet-400" to="/artworks?artType=graphic"
              >Graphical Assets</NuxtLink
            >
          </nav>
        </section>
        <section class="md:pt-[20px]">
          <h2 class="text-title-3">Support</h2>
          <nav class="mt-7 flex flex-col gap-[18px] text-footer">
            <NuxtLink class="hover:text-violet-400" to="/terms">Terms &amp; Conditions</NuxtLink
            ><NuxtLink class="hover:text-violet-400" to="/privacy">Privacy Policy</NuxtLink
            ><NuxtLink class="hover:text-violet-400" to="/about-us">About Us</NuxtLink
            ><a class="hover:text-violet-400" href="mailto:contact@makeitart.io">Contact</a>
          </nav>
        </section>
      </div>
      <div class="mt-auto flex items-center gap-5 text-center text-footer text-slate-100">
        <span class="h-px flex-1 bg-slate-800" />
        <p class="whitespace-nowrap">© 2026 MAKE IT ART. All rights reserved.</p>
        <span class="h-px flex-1 bg-slate-800" />
      </div>
    </div>
  </footer>
</template>
