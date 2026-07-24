import type { Config } from "tailwindcss";

const config: Partial<Config> = {
  content: [
    "./app.vue",
    "./pages/**/*.{vue,js,ts}",
    "./components/**/*.{vue,js,ts}",
    "./layouts/**/*.vue"
  ],
  theme: {
    extend: {
      colors: {
        black: "#000000",
        brand: {
          500: "#5800C8",
          600: "#7B2CFF",
          700: "#5800C8"
        },
        slate: {
          950: "#01050E",
          900: "#090D17",
          850: "#0C1120",
          800: "#1A1F2A",
          750: "#262D3D",
          500: "#6C7380",
          400: "#A0A7B4",
          100: "#E6EDF7"
        },
        violet: {
          950: "#24005B",
          700: "#5800C8",
          600: "#7B2CFF",
          400: "#A277FF",
          200: "#D1BCFF"
        }
      },
      fontFamily: {
        sans: ["Hanken Grotesk", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      fontSize: {
        "big-title-1": ["200px", { lineHeight: "normal", fontWeight: "900" }],
        "big-title-2": ["148px", { lineHeight: "normal", fontWeight: "200" }],
        "big-title-3": ["120px", { lineHeight: "normal", fontWeight: "400" }],
        "big-title-4": ["96px", { lineHeight: "normal", fontWeight: "700" }],
        "title-1": ["64px", { lineHeight: "normal", fontWeight: "700" }],
        "title-2": ["40px", { lineHeight: "normal", fontWeight: "700" }],
        "title-3": ["24px", { lineHeight: "normal", fontWeight: "600" }],
        "title-4": ["16px", { lineHeight: "normal", fontWeight: "700" }],
        "title-5": ["24px", { lineHeight: "normal", fontWeight: "500" }],
        "body-1": ["16px", { lineHeight: "normal", fontWeight: "400" }],
        "body-2": ["16px", { lineHeight: "normal", fontWeight: "700" }],
        "subtitle-1": ["24px", { lineHeight: "normal", fontWeight: "500" }],
        "subtitle-2": ["12px", { lineHeight: "normal", fontWeight: "400" }],
        "subtitle-3": ["10px", { lineHeight: "normal", fontWeight: "400" }],
        "button-1": ["24px", { lineHeight: "normal", fontWeight: "600" }],
        "button-2": ["18px", { lineHeight: "normal", fontWeight: "600" }],
        footer: ["16px", { lineHeight: "normal", fontWeight: "400" }]
      }
    }
  },
  plugins: []
};

export default config;
