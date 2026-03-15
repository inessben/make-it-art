import type { Config } from "tailwindcss";

export default <Partial<Config>>{
  content: [
    "./app.vue",
    "./pages/**/*.{vue,js,ts}",
    "./components/**/*.{vue,js,ts}",
    "./layouts/**/*.vue"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#22d3ee",
          600: "#06b6d4"
        }
      }
    }
  },
  plugins: []
};

