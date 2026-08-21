// Deliberately two rules and nothing else. A typo'd identifier in privileged
// chrome code only surfaces after install + restart + startup-cache clear, which
// is exactly the loop no-undef removes. Style is not linted: the source of truth
// for how code here reads is the code around it.
export default [
  // Untracked scratch files must not change the verdict. A leftover backup in one
  // clone made the verifier fail there and pass everywhere else, which turns a gate
  // into a coin flip: the answer has to come from what is committed, not from what
  // happens to be lying in the working tree.
  { ignores: ["**/_*", "node_modules/**", "vendor/**", "coverage/**"] },
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
  {
    // zstg-panel.mjs runs as a <script src> in an actual DOM document (the
    // about:spacekeeper page), not as a privileged chrome-window script - the
    // timer and event globals below are ordinary web-page globals, not part of
    // the Gecko chrome surface the block above documents.
    files: ["src/resources/zstg-panel.mjs"],
    languageOptions: {
      globals: {
        CustomEvent: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        requestAnimationFrame: "readonly",
      },
    },
  },
];
