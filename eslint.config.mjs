// Deliberately two rules and nothing else. A typo'd identifier in privileged
// chrome code only surfaces after install + restart + startup-cache clear, which
// is exactly the loop no-undef removes. Style is not linted: the source of truth
// for how code here reads is the code around it.
export default [
  {
    files: ["src/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        // Gecko chrome globals, visible to a fx-autoconfig userscript
        console: "readonly",
        window: "readonly",
        document: "readonly",
        Services: "readonly",
        ChromeUtils: "readonly",
        Components: "readonly",
        Cc: "readonly",
        Ci: "readonly",
        IOUtils: "readonly",
        PathUtils: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
