import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * ESLint configuration
 *
 * Severity levels:
 *   "error"  — blocks CI (must be zero before merging)
 *   "warn"   — tracked as tech debt; CI passes but is visible in output
 *   "off"    — rule disabled
 *
 * Rules downgraded to "warn" (tracked tech debt, fix incrementally):
 *   • @typescript-eslint/no-explicit-any      — legacy code; X1 fixed catch blocks;
 *                                               remaining ~460 are complex component types
 *   • react/no-unescaped-entities             — apostrophes in JSX copy (~90 instances)
 *   • @typescript-eslint/no-require-imports   — CommonJS require() in utility scripts (~30)
 *   • react-hooks/error-boundaries            — JSX constructed inside try/catch render
 *                                               paths; needs ErrorBoundary refactor (X3)
 *
 * NOTE on flat-config plugin scoping:
 *   In ESLint 9 flat config each config object that contains a rule must also
 *   declare the owning plugin — unless the plugin was already registered in an
 *   earlier config with the *exact same object reference* (identical ===).
 *   We collect all plugin references from eslint-config-next and re-use them
 *   in the trailing override block so ESLint accepts the re-declaration.
 */

// Base configs from eslint-config-next (registers react, @typescript-eslint,
// react-hooks, @next/next, … plugins).
const nextConfigs = [...nextVitals, ...nextTs];

// Collect every plugin object registered by the base configs.
// Using the same object reference avoids "Cannot redefine plugin" errors.
/** @type {Record<string, unknown>} */
const inheritedPlugins = {};
for (const cfg of nextConfigs) {
  if (cfg.plugins) {
    for (const [name, plugin] of Object.entries(cfg.plugins)) {
      inheritedPlugins[name] = plugin;
    }
  }
}

const eslintConfig = defineConfig([
  ...nextConfigs,

  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    // One-off seed / migration scripts — CommonJS require() is intentional:
    "scripts/**",
  ]),

  // ── Downgrade high-volume legacy rules from error → warn ──────────────────
  // Plugins are declared with the same references as eslint-config-next uses,
  // so ESLint accepts the re-declaration (identical references are allowed).
  {
    plugins: inheritedPlugins,
    rules: {
      // X1 follow-up: explicit `any` remaining after catch-block cleanup.
      // Fix incrementally per component; do not add new `any` annotations.
      "@typescript-eslint/no-explicit-any": "warn",

      // CommonJS require() calls in utility scripts that predate ESM migration.
      "@typescript-eslint/no-require-imports": "warn",

      // Cosmetic: apostrophes / quotes in JSX text nodes need &apos; / &quot;.
      // Low risk; fix incrementally in UI copy PRs.
      "react/no-unescaped-entities": "warn",

      // JSX constructed inside try/catch render paths — tracked under X3
      // (Error Boundaries epic). Real architectural fix, not a one-liner.
      "react-hooks/error-boundaries": "warn",

      // ── React Compiler rules (Next 15 experimental) ────────────────────────
      // These enforce React Compiler's purity model for ahead-of-time
      // optimisation.  They flag real issues but also many intentional patterns
      // (e.g. setState inside an effect called from an event handler).
      // Tracked as tech debt; fix incrementally as components are refactored.
      "react-hooks/set-state-in-effect":           "warn",
      "react-hooks/purity":                        "warn",
      "react-hooks/static-components":             "warn",
      "react-hooks/immutability":                  "warn",
      "react-hooks/refs":                          "warn",
      "react-hooks/preserve-manual-memoization":   "warn",
    },
  },
]);

export default eslintConfig;
