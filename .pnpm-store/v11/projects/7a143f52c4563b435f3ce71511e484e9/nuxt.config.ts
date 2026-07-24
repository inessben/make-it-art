type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv =
  (
    globalThis as typeof globalThis & {
      process?: {
        env?: RuntimeEnv;
      };
    }
  ).process?.env ?? {};

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
      proxy: runtimeEnv.NUXT_API_PROXY_TARGET || "http://localhost:4000/api/**"
    }
  },
  runtimeConfig: {
    public: {
      apiBase: runtimeEnv.NUXT_PUBLIC_API_BASE || "/api"
    }
  }
});
