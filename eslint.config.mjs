import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next 16 ships native flat configs, so the FlatCompat bridge
// (@eslint/eslintrc) is no longer needed. Same rule sets as before:
// core-web-vitals (Next, React, React Hooks, jsx-a11y and import rules) plus
// the typescript-eslint recommended rules.
const config = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Replaces eslint-config-next's default ignores; generated output only.
  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "out/**",
    "next-env.d.ts",
  ]),
]);

export default config;
