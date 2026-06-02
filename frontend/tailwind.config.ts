import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default <Partial<Config>>{
  content: [
    "./app.vue",
    "./pages/**/*.{vue,js,ts}",
    "./components/**/*.{vue,js,ts}",
    "./layouts/**/*.vue"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans]
      },
      colors: {
        brand: {
          100: "#A0A7B4",
          200: "#6C7380",
          300: "#262D3D",
          400: "#202F50",
          500: "#2C48CD",
          600: "#3F5CE0",
          700: "#4A6CF7",
          800: "#6F8CFF"
        }
      }
    }
  },
  plugins: []
};
