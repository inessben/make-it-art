<template>
  <header class="app-header">
    <div class="app-header__inner">
      <NuxtLink to="/" class="app-header__logo">
        <img :src="logoUrl" alt="Make It Art" class="app-header__logo-img" />
        <span class="app-header__logo-text">MAKE IT ART</span>
      </NuxtLink>

      <!-- Nav desktop -->
      <nav class="app-header__nav" aria-label="Navigation principale">
        <NuxtLink to="/marketplace" class="app-header__nav-link">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          Marketplace
        </NuxtLink>
        <NuxtLink to="/about" class="app-header__nav-link">About Us</NuxtLink>
      </nav>

      <!-- Search desktop -->
      <div class="app-header__search">
        <svg
          class="app-header__search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search"
          class="app-header__search-input"
          aria-label="Rechercher"
        />
      </div>

      <!-- Actions desktop -->
      <div class="app-header__actions">
        <button class="app-header__icon-btn" aria-label="Panier">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61H19.4a2 2 0 001.98-1.73L22.72 6H6" />
          </svg>
        </button>
        <NuxtLink to="/login" class="app-header__btn-signin">Sign in</NuxtLink>
        <NuxtLink to="/register" class="app-header__btn-signup">Sign Up</NuxtLink>
        <button class="app-header__icon-btn app-header__more-btn" aria-label="Plus d'options">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      <!-- Mobile right: cart + burger -->
      <div class="app-header__mobile-right">
        <button class="app-header__icon-btn" aria-label="Panier">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61H19.4a2 2 0 001.98-1.73L22.72 6H6" />
          </svg>
        </button>
        <button
          class="app-header__burger"
          :class="{ 'is-open': menuOpen }"
          aria-label="Menu"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <span /><span /><span />
        </button>
      </div>
    </div>

    <!-- Mobile menu drawer -->
    <Transition name="mobile-menu">
      <div v-if="menuOpen" class="app-header__mobile-menu" @click.self="menuOpen = false">
        <!-- Search mobile -->
        <div class="app-header__mobile-search">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input v-model="searchQuery" type="search" placeholder="Search" aria-label="Rechercher" />
        </div>

        <nav aria-label="Navigation mobile">
          <NuxtLink to="/marketplace" class="app-header__mobile-link" @click="menuOpen = false">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            Marketplace
          </NuxtLink>
          <NuxtLink to="/about" class="app-header__mobile-link" @click="menuOpen = false"
            >About Us</NuxtLink
          >
        </nav>

        <div class="app-header__mobile-cta">
          <NuxtLink
            to="/login"
            class="app-header__btn-signin app-header__btn-signin--full"
            @click="menuOpen = false"
          >
            Sign in
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="app-header__btn-signup app-header__btn-signup--full"
            @click="menuOpen = false"
          >
            Sign Up
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import logoUrl from "~/public/logo.png";

const searchQuery = ref("");
const menuOpen = ref(false);

const route = useRoute();
watch(route, () => {
  menuOpen.value = false;
});
</script>

<style scoped lang="scss">
$breakpoint-md: 768px;

.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: #262d3d;
  font-family: "Inter", sans-serif;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  &__inner {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1.5rem;
    height: 60px;
  }

  // ── Logo ─────────────────────────────────────────────────────────────────
  &__logo {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    text-decoration: none;
    flex-shrink: 0;
  }

  &__logo-img {
    width: 32px;
    height: 32px;
    object-fit: contain;
    flex-shrink: 0;
  }

  &__logo-text {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: white;
    white-space: nowrap;
  }

  // ── Desktop nav ──────────────────────────────────────────────────────────
  &__nav {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;

    @media (max-width: $breakpoint-md) {
      display: none;
    }
  }

  &__nav-link {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.85);
    text-decoration: none;
    transition:
      color 0.15s,
      background 0.15s;
    white-space: nowrap;

    &:hover {
      color: white;
      background: rgba(255, 255, 255, 0.06);
    }

    &.router-link-active {
      color: white;
    }
  }

  // ── Search ───────────────────────────────────────────────────────────────
  &__search {
    flex: 1;
    position: relative;
    min-width: 0;

    @media (max-width: $breakpoint-md) {
      display: none;
    }
  }

  &__search-icon {
    position: absolute;
    left: 0.875rem;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.4);
    pointer-events: none;
  }

  &__search-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    padding: 0.5rem 1rem 0.5rem 2.5rem;
    font-size: 0.9rem;
    color: white;
    outline: none;
    transition:
      border-color 0.15s,
      background 0.15s;

    &::placeholder {
      color: rgba(255, 255, 255, 0.35);
    }

    &:focus {
      border-color: rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.07);
    }

    &::-webkit-search-cancel-button {
      display: none;
    }
  }

  // ── Desktop actions ──────────────────────────────────────────────────────
  &__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;

    @media (max-width: $breakpoint-md) {
      display: none;
    }
  }

  &__icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 0.375rem;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition:
      color 0.15s,
      background 0.15s;

    &:hover {
      color: white;
      background: rgba(255, 255, 255, 0.06);
    }
  }

  &__btn-signin {
    padding: 0.4rem 1.1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    background-color: #2c48cd;
    color: white;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    transition: background 0.15s;

    &:hover {
      background-color: #4a6cf7;
    }

    &--full {
      display: block;
      text-align: center;
    }
  }

  &__btn-signup {
    padding: 0.375rem 1.1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: white;
    text-decoration: none;
    white-space: nowrap;
    transition:
      border-color 0.15s,
      background 0.15s;

    &:hover {
      border-color: rgba(255, 255, 255, 0.5);
      background: rgba(255, 255, 255, 0.05);
    }

    &--full {
      display: block;
      text-align: center;
    }
  }

  // ── Mobile right (cart + burger) ─────────────────────────────────────────
  &__mobile-right {
    display: none;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;

    @media (max-width: $breakpoint-md) {
      display: flex;
    }
  }

  // ── Burger button ────────────────────────────────────────────────────────
  &__burger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    width: 38px;
    height: 38px;
    padding: 0 9px;
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: background 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    span {
      display: block;
      height: 1.5px;
      background: white;
      border-radius: 2px;
      transform-origin: center;
      transition:
        transform 0.22s ease,
        opacity 0.15s ease;
    }

    &.is-open {
      span:nth-child(1) {
        transform: translateY(6.5px) rotate(45deg);
      }
      span:nth-child(2) {
        opacity: 0;
        transform: scaleX(0);
      }
      span:nth-child(3) {
        transform: translateY(-6.5px) rotate(-45deg);
      }
    }
  }

  // ── Mobile menu drawer ───────────────────────────────────────────────────
  &__mobile-menu {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem 1.5rem 1.5rem;
    background-color: #262d3d;
    border-top: 1px solid rgba(255, 255, 255, 0.06);

    @media (min-width: calc($breakpoint-md + 1px)) {
      display: none;
    }
  }

  &__mobile-search {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    padding: 0.5rem 0.875rem;
    margin-bottom: 0.5rem;
    color: rgba(255, 255, 255, 0.4);

    input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      font-size: 0.9rem;
      color: white;

      &::placeholder {
        color: rgba(255, 255, 255, 0.35);
      }
      &::-webkit-search-cancel-button {
        display: none;
      }
    }
  }

  &__mobile-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.85);
    text-decoration: none;
    transition:
      color 0.15s,
      background 0.15s;

    &:hover {
      color: white;
      background: rgba(255, 255, 255, 0.06);
    }

    &.router-link-active {
      color: white;
    }
  }

  &__mobile-cta {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
}

// ── Transition ───────────────────────────────────────────────────────────────
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
