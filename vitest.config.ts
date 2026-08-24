import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    /**
     * Never collect tests out of a git worktree.
     *
     * `.claude/worktrees/<name>/` is a SEPARATE CHECKOUT of this repo, with its
     * own copy of every `lib/*.test.ts` and its own in-progress edits. Vitest's
     * default include is `**` from the project root, so it was running that
     * checkout's suite alongside this one — meaning `npm run test` here reported
     * failures caused by code this working tree does not contain, and could not
     * fix.
     *
     * Found 2026-08-24: three red tests, all of them the other checkout's
     * (`aboutStats`, `devOnly`, and a `nonApparel` fixture that had already been
     * repaired HERE). A worktree runs its own suite from its own root; this one
     * has no business doing it for them.
     *
     * Same family as the `.venv-style/` exclusion in eslint.config.mjs — a tool
     * walking into a directory that is not the project.
     */
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '.claude/worktrees/**'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
