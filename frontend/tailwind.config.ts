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
          500: "#838C9B",
          400: "#AEB6C3",
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
        geist: ["Geist", "Hanken Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Hanken Grotesk", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      fontSize: {
        "big-title-1": ["clamp(3.5rem, 8vw, 6rem)", { lineHeight: "1", fontWeight: "900" }],
        "big-title-2": ["clamp(3rem, 7vw, 5rem)", { lineHeight: "1.05", fontWeight: "300" }],
        "big-title-3": ["clamp(2.75rem, 6vw, 4.5rem)", { lineHeight: "1.05", fontWeight: "400" }],
        "big-title-4": ["clamp(2.5rem, 5vw, 4rem)", { lineHeight: "1.1", fontWeight: "700" }],
        "title-1": ["clamp(2.25rem, 4vw, 3rem)", { lineHeight: "1.1", fontWeight: "700" }],
        "title-2": ["clamp(1.875rem, 3vw, 2.25rem)", { lineHeight: "1.15", fontWeight: "700" }],
        "title-3": ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],
        "title-4": ["1.125rem", { lineHeight: "1.4", fontWeight: "700" }],
        "title-5": ["1.25rem", { lineHeight: "1.4", fontWeight: "500" }],
        "body-1": ["1rem", { lineHeight: "1.5", fontWeight: "400" }],
        "body-2": ["1rem", { lineHeight: "1.5", fontWeight: "700" }],
        "subtitle-1": ["1.25rem", { lineHeight: "1.5", fontWeight: "500" }],
        "subtitle-2": ["0.875rem", { lineHeight: "1.4", fontWeight: "400" }],
        "subtitle-3": ["0.75rem", { lineHeight: "1.4", fontWeight: "400" }],
        "button-1": ["1rem", { lineHeight: "1.25", fontWeight: "600" }],
        "button-2": ["0.875rem", { lineHeight: "1.25", fontWeight: "600" }],
        footer: ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }]
      }
    }
  },
  plugins: []
};

export default config;
