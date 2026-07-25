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
        { rel: "apple-touch-icon", href: "/logo.png" }
      ],
      meta: [
        { name: "theme-color", content: "#000000" },
        { name: "application-name", content: "Make It Art" }
      ]
    }
  },
  routeRules: {
    "/api/**": {
      proxy: process.env.NUXT_API_PROXY_TARGET || "http://localhost:4000/api/**"
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "/api",
      umamiSrc: process.env.NUXT_PUBLIC_UMAMI_SRC || "",
      umamiWebsiteId: process.env.NUXT_PUBLIC_UMAMI_WEBSITE_ID || ""
    }
  }
});
