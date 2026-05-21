const apiProxyTarget = process.env.NUXT_API_PROXY_TARGET || "http://localhost:4000";

export default defineNuxtConfig({
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt"],
  css: ["~/assets/styles/main.scss"],
  devtools: { enabled: true },
  routeRules: {
    "/api/**": {
      proxy: `${apiProxyTarget}/api/**`
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "/api"
    }
  }
});
