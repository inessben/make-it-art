export default defineNuxtConfig({
  modules: ["@nuxtjs/tailwindcss"],
  css: ["~/assets/styles/main.scss"],
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "/api"
    }
  }
});

