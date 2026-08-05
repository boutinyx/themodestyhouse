import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local-only working dirs. ESLint does not read .gitignore, so without
    // these it descends into the python venv (torch ships .js/.mjs) and drowns
    // real findings: 72 of 78 problems came from .venv-style alone.
    ".venv-style/**",
    ".cache/**",
    "conversations/**",
    "higgsfield-library/**",
    "public/hero-gen/**",
    "data/.backups/**",
  ]),
]);

export default eslintConfig;
