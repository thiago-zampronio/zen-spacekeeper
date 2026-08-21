import { defineConfig } from "vitest/config";

/**
 * Coverage is configured, and it is deliberately NOT a gate.
 *
 * `src/zen-space-tab-groups.uc.mjs` is 107 KB and cannot be imported under node —
 * it touches `window`, `gBrowser` and `Services` at module scope. So line
 * coverage here can only ever describe the pure layer, about a tenth of the code.
 * A threshold over that would report a healthy number while every behaviour that
 * needs a browser stayed unchecked, which is the opposite of useful.
 *
 * The metric that matches the real problem is requirement coverage: of the
 * requirements in `openspec/specs/`, how many have an automated check and how many
 * still need a person. `test/helpers/requirements.mjs` is what makes that
 * countable; the numbers below are a diagnostic for the pure layer only.
 */
export default defineConfig({
  test: {
    include: ["test/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      // Only the code a node test can actually reach. Listing the chrome script
      // here would report it as 0% forever and drag the number into fiction.
      include: ["src/resources/zstg-core.mjs", "scripts/lib/**/*.mjs"],
      thresholds: undefined,
    },
  },
});
