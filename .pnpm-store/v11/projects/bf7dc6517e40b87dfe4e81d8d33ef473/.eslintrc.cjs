module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true
  },
  extends: ["eslint:recommended", "prettier"],
  parserOptions: {
    ecmaVersion: "latest"
  },
  rules: {
    "no-console": "off",
    "no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ]
  }

};
