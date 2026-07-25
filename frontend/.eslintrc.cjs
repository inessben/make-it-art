module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true
  },
  globals: {
    $fetch: "readonly",
    defineNuxtConfig: "readonly",
    computed: "readonly",
    onMounted: "readonly",
    reactive: "readonly",
    ref: "readonly",
    useAsyncData: "readonly",
    useFetch: "readonly",
    useNuxtApp: "readonly",
    useRoute: "readonly",
    useRouter: "readonly",
    useRuntimeConfig: "readonly",
    watch: "readonly",
    definePageMeta: "readonly",
    navigateTo: "readonly"
  },
  extends: [
    "eslint:recommended",
    "plugin:vue/vue3-recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    ecmaVersion: "latest",
    sourceType: "module"
  },
  rules: {
    "vue/multi-word-component-names": "off"
  }
};
