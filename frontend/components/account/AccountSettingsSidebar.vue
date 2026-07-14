<template>
  <aside class="w-full border border-slate-800 bg-slate-950/80 px-5 py-10 lg:min-h-[1115px]">
    <div class="flex items-center gap-5 px-2">
      <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-750 text-title-4 text-violet-400" aria-hidden="true">
        {{ userInitials }}
      </div>
      <p class="truncate text-title-3">{{ auth.user?.username || "" }}</p>
    </div>
    <nav class="mt-9 grid gap-3" aria-label="Account navigation">
      <NuxtLink
        v-for="item in accountNavigation"
        :key="item.label"
        :to="item.to"
        class="flex min-h-14 items-center gap-4 border-l-4 px-3 text-button-2 transition-colors"
        :class="isActive(item) ? 'border-slate-500 bg-black/20 text-slate-500' : 'border-transparent text-slate-100 hover:text-violet-400'"
        :aria-current="isActive(item) ? 'page' : undefined"
      >
        <svg class="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path :d="item.icon" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "#app";
import { useAuthStore } from "~/stores/auth";
import { getArtistInitials } from "~/utils/marketplace";

defineProps({ compact: { type: Boolean, default: false } });
const auth = useAuthStore();
const route = useRoute();
const userInitials = computed(() => getArtistInitials(auth.user?.username || "User"));
const accountNavigation = [
  { label: "Profile", to: "/account-settings", matches: ["/account-settings"], icon: "M3 3h18v18H3zM7 16l4-4 3 3 3-4 4 5" },
  { label: "Wishlist", to: "/wishlist", matches: ["/wishlist"], icon: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8a5.5 5.5 0 0 0 1-8.8z" },
  { label: "Order history", to: "/orders", matches: ["/orders"], icon: "M6 2h12l3 4v16H3V6l3-4zM3 6h18M8 10a4 4 0 0 0 8 0" },
  { label: "Payment methods", to: "/payment-methods", matches: ["/payment-methods"], icon: "M2 5h20v14H2zM2 10h20" },
  { label: "Settings", to: "/settings", matches: ["/settings"], icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z" }
];
function isActive(item) {
  return item.matches.some((path) => route.path === path || (path === "/orders" && route.path.startsWith("/orders/")));
}
</script>
