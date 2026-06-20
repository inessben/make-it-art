<template>
  <main class="min-h-screen bg-[#000000] px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto w-full max-w-[820px] rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Access control</p>
      <h1 class="mt-4 text-[clamp(2rem,2.5vw,2.8rem)] font-semibold leading-[1.05]">
        Acces refuse
      </h1>
      <p class="mt-4 max-w-2xl text-[#A0ADB4] leading-7">
        Cette zone est reservee aux comptes admin. Si tu dois y avoir acces, il faut qu'un role
        admin soit defini pour ton utilisateur dans la base.
      </p>

      <div class="mt-8 grid gap-4 sm:grid-cols-2">
        <NuxtLink
          to="/profile"
          class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20"
        >
          Retour au profil
        </NuxtLink>

        <NuxtLink
          to="/"
          class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        >
          Revenir a l'accueil
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
