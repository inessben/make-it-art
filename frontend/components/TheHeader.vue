<template>
  <header
    class="relative z-50 h-20 border-b border-white/5 bg-black text-slate-100"
    :aria-busy="!auth.initialized || auth.loading"
    @keydown.esc="closeMenu(true)"
  >
    <div
      class="mx-auto grid h-full w-full max-w-[1440px] grid-cols-[auto_1fr_auto] items-center px-4 sm:px-6 lg:grid-cols-3 lg:px-8"
    >
      <button
        ref="menuButton"
        type="button"
        class="flex h-11 w-11 flex-col items-center justify-center gap-[6px] lg:hidden"
        :aria-expanded="mobileMenuOpen"
        aria-controls="mobile-navigation"
        :aria-label="mobileMenuOpen ? 'Close menu' : 'Open menu'"
        @click="toggleMenu"
      >
        <span
          class="h-px w-6 bg-slate-100 transition-transform"
          :class="mobileMenuOpen ? 'translate-y-[7px] rotate-45' : ''"
        />
        <span
          class="h-px w-6 bg-slate-100 transition-opacity"
          :class="mobileMenuOpen ? 'opacity-0' : ''"
        />
        <span
          class="h-px w-6 bg-slate-100 transition-transform"
          :class="mobileMenuOpen ? '-translate-y-[7px] -rotate-45' : ''"
        />
      </button>

      <nav
        class="hidden h-full items-center gap-6 font-geist text-[11px] font-medium uppercase tracking-[0.18em] lg:flex xl:gap-10"
        aria-label="Main navigation"
      >
        <NuxtLink class="px-3 py-2 transition-colors hover:text-violet-400" to="/artworks"
          >Marketplace</NuxtLink
        >
        <NuxtLink class="px-3 py-2 transition-colors hover:text-violet-400" to="/artists"
          >Collections</NuxtLink
        >
        <NuxtLink class="px-3 py-2 transition-colors hover:text-violet-400" to="/about-us"
          >About Us</NuxtLink
        >
      </nav>

      <NuxtLink
        to="/"
        class="flex items-center justify-self-center gap-3 px-4 py-2 sm:gap-4"
        aria-label="Make It Art - Home"
        @click="closeMenu"
      >
        <img class="h-10 w-8 object-contain sm:h-12 sm:w-10" src="/logo.png" alt="" />
        <span
          class="hidden whitespace-nowrap font-geist text-[13px] font-bold uppercase tracking-[0.12em] sm:inline"
          >MAKE IT ART</span
        >
      </NuxtLink>

      <div class="hidden items-center justify-self-end lg:flex">
        <div v-if="!auth.initialized || auth.loading" class="h-[60px] w-[237px]" />
        <nav
          v-else-if="auth.isAuthenticated"
          class="flex items-center gap-4 sm:gap-8 lg:gap-16"
          aria-label="Account navigation"
        >
          <template v-if="!auth.isAdmin">
            <NuxtLink to="/wallet" class="transition-opacity hover:opacity-70" aria-label="Wallet"
              ><img class="h-5 w-5 sm:h-6 sm:w-6" src="/icons/wallet.svg" alt="" loading="lazy"
            /></NuxtLink>
            <NuxtLink
              to="/cart"
              class="transition-opacity hover:opacity-70"
              aria-label="Shopping basket"
              ><img
                class="h-6 w-6 sm:h-7 sm:w-7"
                src="/icons/shopping-basket.svg"
                alt=""
                loading="lazy"
            /></NuxtLink>
          </template>
          <NuxtLink
            :to="profileRoute"
            class="transition-opacity hover:opacity-70"
            aria-label="Profile"
            ><img class="h-8 w-8 sm:h-9 sm:w-9" src="/icons/profile.svg" alt="" loading="lazy"
          /></NuxtLink>
        </nav>
        <NuxtLink
          v-else
          to="/register"
          class="flex h-12 w-[120px] items-center justify-center border border-violet-600 bg-transparent font-geist text-[16px] font-medium text-slate-100 transition-colors hover:bg-violet-950/35 sm:w-[150px] lg:h-14 lg:w-[144px]"
          >Sign Up</NuxtLink
        >
      </div>
    </div>

    <nav
      v-show="mobileMenuOpen"
      id="mobile-navigation"
      ref="mobileNavigation"
      class="fixed inset-x-0 top-20 max-h-[calc(100vh-5rem)] overflow-y-auto border-y border-slate-800 bg-black px-6 py-8 lg:hidden"
      aria-label="Mobile navigation"
    >
      <NuxtLink
        to="/artworks"
        class="block border-b border-slate-800 py-5 text-title-3"
        @click="closeMenu"
        >Marketplace</NuxtLink
      >
      <NuxtLink
        to="/artists"
        class="block border-b border-slate-800 py-5 text-title-3"
        @click="closeMenu"
        >Collections</NuxtLink
      >
      <NuxtLink
        to="/about-us"
        class="block border-b border-slate-800 py-5 text-title-3"
        @click="closeMenu"
        >About Us</NuxtLink
      >
      <div v-if="!auth.initialized || auth.loading" class="mt-6 h-12" aria-hidden="true" />
      <template v-else-if="auth.isAuthenticated">
        <NuxtLink
          v-if="!auth.isAdmin"
          to="/wallet"
          class="flex items-center gap-4 border-b border-slate-800 py-5 text-title-3"
          @click="closeMenu"
        >
          <img class="h-6 w-6" src="/icons/wallet.svg" alt="" loading="lazy" />
          Wallet
        </NuxtLink>
        <NuxtLink
          v-if="!auth.isAdmin"
          to="/cart"
          class="flex items-center gap-4 border-b border-slate-800 py-5 text-title-3"
          @click="closeMenu"
        >
          <img class="h-7 w-7" src="/icons/shopping-basket.svg" alt="" loading="lazy" />
          Shopping basket
        </NuxtLink>
        <NuxtLink
          :to="profileRoute"
          class="flex items-center gap-4 py-5 text-title-3"
          @click="closeMenu"
        >
          <img class="h-9 w-9" src="/icons/profile.svg" alt="" loading="lazy" />
          {{ auth.isAdmin ? "Admin dashboard" : "Account settings" }}
        </NuxtLink>
        <button
          type="button"
          class="flex w-full items-center gap-4 border-t border-slate-800 py-5 text-left text-title-3 text-red-200"
          @click="handleLogout"
        >
          Sign out
        </button>
      </template>
      <NuxtLink
        v-else
        to="/register"
        class="mt-6 flex h-12 items-center justify-center border border-violet-600 bg-violet-950/50 text-body-1 font-semibold"
        @click="closeMenu"
      >
        Sign Up
      </NuxtLink>
    </nav>
  </header>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { navigateTo, useRoute } from "#app";
import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();
const route = useRoute();
const mobileMenuOpen = ref(false);
const menuButton = ref(null);
const mobileNavigation = ref(null);
const profileRoute = computed(() => (auth.isAdmin ? "/admin" : "/account-settings"));

function closeMenu(restoreFocus = false) {
  mobileMenuOpen.value = false;
  if (restoreFocus) nextTick(() => menuButton.value?.focus());
}

async function toggleMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
  if (mobileMenuOpen.value) {
    await nextTick();
    mobileNavigation.value?.querySelector("a, button")?.focus();
  }
}

async function handleLogout() {
  closeMenu();
  await auth.logout();
  await navigateTo("/login");
}

watch(() => route.fullPath, closeMenu);
</script>
