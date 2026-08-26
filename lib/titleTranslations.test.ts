import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { publishTitle } from './publishTitle';

/**
 * Guards against the double-translation bug found on 2026-08-26 (CLAUDE.md
 * §10.46): scripts/translate_titles.py read the ALREADY-translated
 * data/products.json, so for a row build-data had already translated it sent
 * the ENGLISH title back to Google under the brand's source language, and
 * cached the corruption under that English key. Once cached it was reapplied
 * on every publish, permanently. 52 chained entries, 40 corrupted rows.
 *
 * These two checks are a consistency assertion between two files that are
 * written by the same publish, not an assertion about third-party text — a
 * brand re-casing a title moves raw and published together and leaves both
 * green, which is what §10.19 says such a test must not do.
 */
const D = (f: string) => path.join(process.cwd(), 'data', f);
const read = (f: string) => JSON.parse(readFileSync(D(f), 'utf8'));

const cache: Record<string, string> = read('title-translations.json');
const translateBrands: Record<string, string> = read('translate-brands.json');

describe('title translation cache', () => {
  it('holds no double-translation chains', () => {
    // A key that is some OTHER entry's output was fed back in from
    // products.json. Harmless if it maps to itself; a corruption if it does not.
    const outputs = new Set<string>();
    for (const [k, v] of Object.entries(cache)) if (v !== k) outputs.add(v);
    const chains = Object.entries(cache)
      .filter(([k, v]) => outputs.has(k) && v !== k)
      .map(([k, v]) => `${JSON.stringify(k)} -> ${JSON.stringify(v)}`);
    expect(chains).toEqual([]);
  });
});

describe('published titles', () => {
  it('match exactly what publishTitle() derives from the raw feed title', () => {
    const raw = read('raw-products.json');
    const rawRows: { id: string; title: string }[] = Array.isArray(raw) ? raw : raw.products;
    const rawById = new Map(rawRows.map((p) => [p.id, p.title]));
    const prods = read('products.json');
    const rows: { id: string; brandSlug: string; title: string }[] = Array.isArray(prods)
      ? prods
      : prods.products;

    const drift: string[] = [];
    for (const p of rows) {
      if (!translateBrands[p.brandSlug]) continue;
      const rawTitle = rawById.get(p.id);
      if (rawTitle === undefined) continue; // published from a raw row since removed
      const expected = publishTitle(rawTitle, p.brandSlug, translateBrands, cache).title;
      if (p.title !== expected) drift.push(`${p.id}: on disk ${JSON.stringify(p.title)}, publishTitle ${JSON.stringify(expected)}`);
    }
    expect(drift).toEqual([]);
  });
});
