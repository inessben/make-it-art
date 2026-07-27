const environment =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env || {};

export default defineNuxtConfig({
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt"],
  css: ["~/assets/styles/main.scss"],
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      link: [
        { rel: "icon", type: "image/png", href: "/logo.png" },
        { rel: "shortcut icon", type: "image/png", href: "/logo.png" },
        { rel: "apple-touch-icon", href: "/logo.png" },
        { rel: "manifest", href: "/manifest.webmanifest" }
      ],
      meta: [
        { name: "theme-color", content: "#000000" },
        { name: "application-name", content: "Make It Art" }
      ]
    }
  },
  nitro: {
    routeRules: {
      "/api/**": {
        proxy: environment.NUXT_API_PROXY_TARGET || "http://localhost:4000/api/**"
      }
    }
  },
  runtimeConfig: {
    public: {
      apiBase: environment.NUXT_PUBLIC_API_BASE || "/api",
      cdpProjectId: environment.NUXT_PUBLIC_CDP_PROJECT_ID || "",
      umamiWebsiteId: environment.NUXT_PUBLIC_UMAMI_WEBSITE_ID || "",
      siteUrl: environment.NUXT_PUBLIC_SITE_URL || "https://www.makeitart.io",
      appBaseUrl: environment.NUXT_PUBLIC_APP_BASE_URL || "http://localhost",
      stripePublishableKey: environment.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
    },
    apiInternalBase: (environment.NUXT_API_PROXY_TARGET || "http://localhost:4000/api/**").replace(
      /\/\*\*$/,
      ""
    )
  }
});
