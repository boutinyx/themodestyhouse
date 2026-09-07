import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

/*
 * The share card is the one asset nobody ever sees while working on the site.
 * It only appears when someone pastes a link into WhatsApp, and until
 * 2026-09-07 that was a cropped street photograph from 3 August with nothing
 * on it naming the site — Tina found it by sharing her own page.
 *
 * So these assert the two things that would make it silently wrong again: the
 * file the metadata points at not existing, and it not being the size every
 * platform expects. Both are properties of the repo, not of the catalogue, so
 * unlike an assertion over products.json (§10.19) the nightly refresh cannot
 * turn them red.
 */
const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');

/** Every '/x.jpg'-style path handed to an openGraph/twitter `images` field. */
function referencedOgImages(): string[] {
  const found = new Set<string>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.tsx?$/.test(e.name) || /\.test\.tsx?$/.test(e.name)) continue;
      const src = readFileSync(full, 'utf8');
      // The literal assigned to an OG image constant, or inlined in an
      // images: [...] array. Comments are excluded by requiring the quote.
      for (const m of src.matchAll(/(?:OG_IMAGE\s*=\s*|url:\s*|images:\s*\[)['"](\/[\w./-]+\.(?:jpg|jpeg|png|webp))['"]/g)) {
        found.add(m[1]);
      }
    }
  };
  for (const d of ['app', 'lib', 'components']) walk(path.join(ROOT, d));
  return [...found];
}

describe('the share card', () => {
  const refs = referencedOgImages();

  it('is referenced by at least one page, so this test cannot pass vacuously', () => {
    expect(refs.length).toBeGreaterThan(0);
    expect(refs).toContain('/og-card-1.jpg');
  });

  it('exists on disk for every path the metadata points at', () => {
    const missing = refs.filter((r) => !existsSync(path.join(PUBLIC, r.replace(/^\//, ''))));
    expect(missing).toEqual([]);
  });

  it('is 1200x630 and small enough to be fetched by a scraper', () => {
    const f = path.join(PUBLIC, 'og-card-1.jpg');
    // JPEG SOF0/SOF2 marker carries the dimensions; no image lib needed here.
    const buf = readFileSync(f);
    let w = 0, h = 0;
    for (let i = 2; i < buf.length - 9; ) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break;
      }
      i += 2 + len;
    }
    expect({ w, h }).toEqual({ w: 1200, h: 630 });
    // Facebook's documented ceiling is 8 MB; anything over ~1 MB risks a
    // scraper timing out and falling back to no card at all.
    expect(statSync(f).size).toBeLessThan(1_000_000);
  });
});
