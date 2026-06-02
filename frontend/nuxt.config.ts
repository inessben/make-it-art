export default defineNuxtConfig({
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt", "@nuxtjs/google-fonts"],
  googleFonts: {
    families: { Inter: [300, 400, 500, 600, 700, 800] },
    display: "swap",
    preload: true
  },
  css: ["~/assets/styles/main.scss"],
  devtools: { enabled: true },
  routeRules: {
    "/api/**": {
      proxy: "http://localhost:4000/api/**"
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "/api"
    }
  }
});
