import { vi, describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sitemap from '../app/sitemap';

vi.mock('./posts', async (importOriginal) => {
  const { FIXTURE_POSTS } = await import('./postsFixture');
  return { ...(await importOriginal<typeof import('./posts')>()), getPosts: async () => FIXTURE_POSTS };
});


/*
 * /directory ("All Clothing") was replaced by /new-in on 2026-09-01. A stale
 * href to it is invisible: next.config.ts 308s the path, so the link still
 * WORKS and nothing fails — it just costs a redirect and points visitors and
 * crawlers at an address the site no longer claims.
 *
 * CLAUDE.md §10.29 is the reason this is a test rather than a one-off grep: a
 * class or path renamed in one directory keeps working from another that no
 * compiler covers, and the only thing that notices is a check somebody has to
 * remember to run.
 */
// scripts/ IS included, and was missing from the first version of this test —
// which is how `npm run audit:interaction` came to drive five checks at a
// redirected URL and one at the wrong element. §10.29's whole point is that a
// path used from a directory no compiler covers dies quietly, and scripts/ is
// that directory.
const SOURCE_ROOTS = ['app', 'components', 'lib', 'scripts'];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) { sourceFiles(full, out); continue; }
    if (/\.(tsx?|mjs)$/.test(e.name)) out.push(full);
  }
  return out;
}

describe('/directory is retired', () => {
  it('no source file still points at it', () => {
    // STRING LITERALS ONLY. Four files mention /directory in explanatory
    // comments (ProductCard, IndexPanel, FilterableGrid, useZeroResultSearch)
    // and that history is worth keeping — it is not a live reference, and a
    // test that fails on prose would be deleted rather than obeyed.
    // Quotes only, never backticks: a comment quoting `/directory` in
    // markdown style is prose, and app/[lane]/page.tsx and lib/ordering.ts
    // both do exactly that. This file is skipped because it contains the
    // pattern by construction.
    const live = /['"]\/directory(\?|['"])/;
    const offenders = SOURCE_ROOTS
      .flatMap((r) => sourceFiles(r))
      .filter((f) => f !== join('lib', 'routes.test.ts'))
      .filter((f) => live.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('is absent from sitemap.xml, and /new-in is in it', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain('https://themodestyhouse.com/new-in');
    expect(urls.filter((u) => u.endsWith('/directory'))).toEqual([]);
  });
});
