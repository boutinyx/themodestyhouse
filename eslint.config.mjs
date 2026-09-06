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
    // Throwaway per-task working dirs, matching /.scratch-*/ in .gitignore.
    // Nothing here ships; linting it only surfaces warnings in code that is
    // deleted after the task, and lint is a CI job, so a warning there reads
    // as a regression in the site.
    ".scratch-*/**",
    "higgsfield-library/**",
    "public/hero-gen/**",
    "data/.backups/**",
    // Output of `npm run audit:mobile` — screenshots, report.json and any
    // throwaway measuring scripts. Gitignored, so linting it can only ever
    // fail the build on a file that is not part of the product.
    ".audit/**",
  ]),
]);

export default eslintConfig;
