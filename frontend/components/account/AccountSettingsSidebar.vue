<template>
  <aside class="w-full border border-slate-800 bg-slate-950/80 px-5 py-10 lg:min-h-[1115px]">
    <div class="flex items-center gap-5 px-2">
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-750 text-title-4 text-violet-400"
        aria-hidden="true"
      >
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
        :class="
          isActive(item)
            ? 'border-slate-500 bg-black/20 text-slate-500'
            : 'border-transparent text-slate-100 hover:text-violet-400'
        "
        :aria-current="isActive(item) ? 'page' : undefined"
      >
        <svg class="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            :d="item.icon"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
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
const artistNavigationItems = computed(() => {
  if (auth.isAdmin) {
    return [];
  }

  if (auth.isVerifiedArtist) {
    return [
      {
        label: "Artist dashboard",
        to: "/artist",
        matches: ["/artist"],
        icon: "M4 5h7v6H4zM13 5h7v10h-7zM4 13h7v6H4zM13 17h7v2h-7z"
      },
      {
        label: "Artist sales",
        to: "/artist/sales",
        matches: ["/artist/sales"],
        icon: "M4 19h16M7 16l3-3 3 2 5-6"
      },
      {
        label: "Artist withdrawals",
        to: "/artist/withdrawals",
        matches: ["/artist/withdrawals"],
        icon: "M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"
      },
      {
        label: "Artist public profile",
        to: "/artist-profile",
        matches: ["/artist-profile", "/become-artist"],
        icon: "M12 3l7 4v10l-7 4-7-4V7l7-4zM9 11.5l2 2 4-4"
      },
      {
        label: "Artist alerts",
        to: "/notifications",
        matches: ["/notifications"],
        icon: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10.5 21h3"
      }
    ];
  }

  if (auth.artistApplicationStatus === "approved" && auth.isArtist) {
    return [
      {
        label: "Artist dashboard",
        to: "/artist",
        matches: ["/artist"],
        icon: "M4 5h7v6H4zM13 5h7v10h-7zM4 13h7v6H4zM13 17h7v2h-7z"
      },
      {
        label: "Artist public profile",
        to: "/artist-profile",
        matches: ["/artist-profile", "/become-artist"],
        icon: "M12 3l7 4v10l-7 4-7-4V7l7-4zM9 11.5l2 2 4-4"
      }
    ];
  }

  if (auth.artistApplicationStatus === "pending") {
    return [
      {
        label: "Artist application",
        to: "/artist-profile",
        matches: ["/artist-profile", "/become-artist"],
        icon: "M12 3l7 4v10l-7 4-7-4V7l7-4zM12 8v4m0 3h.01"
      }
    ];
  }

  if (auth.artistApplicationStatus === "rejected") {
    return [
      {
        label: "Update artist application",
        to: "/artist-profile",
        matches: ["/artist-profile", "/become-artist"],
        icon: "M12 3l7 4v10l-7 4-7-4V7l7-4zM8 12h8M12 8v8"
      }
    ];
  }

  if (auth.hasArtistApplication) {
    return [
      {
        label: "Artist application",
        to: "/artist-profile",
        matches: ["/artist-profile", "/become-artist"],
        icon: "M12 3l7 4v10l-7 4-7-4V7l7-4zM8 12h8"
      }
    ];
  }

  return [
    {
      label: "Become an artist",
      to: "/become-artist",
      matches: ["/become-artist", "/artist-profile"],
      icon: "M12 3l7 4v10l-7 4-7-4V7l7-4zM12 8v8M8 12h8"
    }
  ];
});

const baseNavigation = [
  {
    label: "Profile",
    to: "/account-settings",
    matches: ["/account-settings"],
    icon: "M3 3h18v18H3zM7 16l4-4 3 3 3-4 4 5"
  },
  {
    label: "Wishlist",
    to: "/wishlist",
    matches: ["/wishlist"],
    icon: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8a5.5 5.5 0 0 0 1-8.8z"
  },
  {
    label: "Order history",
    to: "/orders",
    matches: ["/orders"],
    icon: "M6 2h12l3 4v16H3V6l3-4zM3 6h18M8 10a4 4 0 0 0 8 0"
  },
  {
    label: "Payment methods",
    to: "/payment-methods",
    matches: ["/payment-methods"],
    icon: "M2 5h20v14H2zM2 10h20"
  }
];

const accountNavigation = computed(() => {
  return [
    ...baseNavigation.slice(0, 1),
    ...artistNavigationItems.value,
    ...baseNavigation.slice(1)
  ];
});
function isActive(item) {
  return item.matches.some(
    (path) => route.path === path || (path === "/orders" && route.path.startsWith("/orders/"))
  );
}
</script>
