<template>
  <div class="min-h-screen bg-black font-sans">
    <TheHeader v-if="showGlobalNavigation" />
    <NuxtPage />
    <TheFooter v-if="showGlobalNavigation" />
    <ArtistFloatingAction v-if="showArtistFloatingAction" />
    <CookieConsentBanner />
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useHead, useRoute, useRuntimeConfig, useSeoMeta } from "#app";
import { useAuthStore } from "~/stores/auth";

const route = useRoute();
const config = useRuntimeConfig();
const siteUrl = config.public.siteUrl.replace(/\/$/, "");
const auth = useAuthStore();

useHead({
  htmlAttrs: { lang: "en" },
  link: [
    {
      rel: "icon",
      type: "image/png",
      sizes: "any",
      href: "/logo.png?v=20260714"
    },
    {
      rel: "shortcut icon",
      type: "image/png",
      href: "/logo.png?v=20260714"
    },
    {
      rel: "apple-touch-icon",
      href: "/logo.png?v=20260714"
    },
    {
      rel: "canonical",
      href: () => `${siteUrl}${route.path}`
    }
  ]
});

const authOnlyRoutes = new Set([
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password"
]);
const showGlobalNavigation = computed(() => !authOnlyRoutes.has(route.path));
const showArtistFloatingAction = computed(() => {
  if (!showGlobalNavigation.value) {
    return false;
  }

  if (route.path.startsWith("/admin")) {
    return false;
  }

  return auth.isVerifiedArtist;
});

const privateRoutePrefixes = [
  "/admin",
  "/account-settings",
  "/orders",
  "/wallet",
  "/payment-methods",
  "/settings",
  "/wishlist",
  "/shopping-basket",
  "/cart",
  "/checkout",
  "/follows",
  "/artist-profile",
  "/become-artist",
  "/verify-email",
  "/reset-password",
  "/forgot-password"
];
const isPrivateRoute = computed(() =>
  privateRoutePrefixes.some(
    (prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`)
  )
);

const seoByRoute = {
  "/": [
    "Digital Art Marketplace",
    "Discover curated digital artworks and emerging artists on Make It Art."
  ],
  "/about-us": [
    "About Us",
    "Discover the vision, mission and curation process behind Make It Art."
  ],
  "/artworks": [
    "Marketplace",
    "Browse original digital artworks from curated independent artists."
  ],
  "/artists": [
    "Artist Collections",
    "Explore profiles and collections from emerging digital artists."
  ],
  "/login": ["Sign In", "Sign in to manage your ACCOUNT and collection."],
  "/register": [
    "Create an Account",
    "Join Make It Art as a collector or begin your artist application."
  ],
  "/forgot-password": ["Forgot Password", "Request a secure password reset link for your account."],
  "/reset-password": ["Reset Password", "Choose a new secure password for your ACCOUNT."],
  "/verify-email": ["Verify Email", "Confirm your email address to activate your ACCOUNT."],
  "/account-settings": [
    "Account Settings",
    "Manage your public profile, preferences and account security."
  ],
  "/wishlist": ["Wishlist", "Review the digital artworks saved to your wishlist."],
  "/collections": [
    "Personal Collections",
    "Create and organize your private digital art collections."
  ],
  "/orders": ["Order History", "Review your purchases and download acquired artworks."],
  "/payment-methods": ["Payment Methods", "Manage the payment methods linked to your account."],
  "/settings": ["Settings", "Manage your ACCOUNT preferences."],
  "/wallet": ["Wallet", "Review your balance and recent wallet activity."],
  "/cart": ["Shopping Basket", "Review the artworks in your shopping basket."],
  "/become-artist": [
    "Become an Artist",
    "Submit your artist application and signed creator agreement."
  ],
  "/artist-profile": [
    "Artist Profile",
    "Manage your public artist profile and portfolio information."
  ],
  "/admin": ["Admin Dashboard", "Monitor users, artists, artworks, orders and payments."]
};

const currentSeo = computed(() => {
  const exact = seoByRoute[route.path];
  if (exact) return exact;
  if (route.path.startsWith("/artworks/")) {
    return ["Artwork Details", "View artwork details, artist information and purchase options."];
  }
  if (route.path.startsWith("/artists/")) {
    return ["Artist Profile", "Discover an artist, their artworks and public collections."];
  }
  if (route.path.startsWith("/orders/")) {
    return ["Order Details", "Review an order and download your purchased artworks."];
  }
  if (route.path.startsWith("/admin/")) {
    return ["Admin Workspace", "Manage Make It Art marketplace operations."];
  }
  return ["Make It Art", "Curated digital artworks and independent artists."];
});

useSeoMeta({
  title: () => `${currentSeo.value[0]} | Make It Art`,
  description: () => currentSeo.value[1],
  ogTitle: () => `${currentSeo.value[0]} | Make It Art`,
  ogDescription: () => currentSeo.value[1],
  ogType: "website",
  ogUrl: () => `${siteUrl}${route.path}`,
  ogSiteName: "Make It Art",
  ogImage: `${siteUrl}/logo.png`,
  ogImageWidth: 512,
  ogImageHeight: 512,
  ogLocale: "en_US",
  twitterCard: "summary_large_image",
  twitterTitle: () => `${currentSeo.value[0]} | Make It Art`,
  twitterDescription: () => currentSeo.value[1],
  twitterImage: `${siteUrl}/logo.png`,
  robots: () => (isPrivateRoute.value ? "noindex, nofollow" : "index, follow")
});

// Home > Section > Current page, reusing the same titles as the <title>/meta description
// map above so the trail always matches what the page actually calls itself.
const breadcrumbItems = computed(() => {
  const segments = route.path.split("/").filter(Boolean);
  const items = [{ name: "Home", path: "/" }];
  let accumulatedPath = "";

  segments.forEach((segment, index) => {
    accumulatedPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    const name = isLast ? currentSeo.value[0] : seoByRoute[accumulatedPath]?.[0] || segment;
    items.push({ name, path: accumulatedPath });
  });

  return items;
});

useHead({
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Make It Art",
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        sameAs: []
      })
    },
    {
      type: "application/ld+json",
      innerHTML: () =>
        JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbItems.value.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: `${siteUrl}${item.path}`
          }))
        })
    }
  ]
});

onMounted(async () => {
  if (auth.user || auth.loading) {
    return;
  }

  try {
    await auth.fetchCurrentUser();
  } catch {
    // Public pages remain accessible when no authenticated session exists.
  }
});
</script>
