import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  editorialVariant,
  editorialSrcSet,
  EDITORIAL_WIDTHS,
  aboutVariant,
  aboutSrcSet,
  ABOUT_WIDTHS,
} from './staticImage';

describe('editorialVariant', () => {
  it('maps an original to its width-suffixed webp', () => {
    expect(editorialVariant('/editorial/outfit-crop.jpg', 400)).toBe('/editorial/outfit-crop-400.webp');
  });

  it('ignores anything that is not a local editorial jpeg', () => {
    expect(editorialVariant('/logo-240.webp', 400)).toBeUndefined();
    expect(editorialVariant('https://cdn.shopify.com/a.jpg', 400)).toBeUndefined();
    expect(editorialVariant('/style-it/top_0.webp', 400)).toBeUndefined();
    expect(editorialVariant(undefined, 400)).toBeUndefined();
    // Already a variant — must not be re-suffixed into -400-400.
    expect(editorialVariant('/editorial/outfit-crop-400.webp', 900)).toBeUndefined();
  });
});

describe('editorialSrcSet', () => {
  it('emits one candidate per width', () => {
    // DERIVED from EDITORIAL_WIDTHS, not hard-coded. This assertion listed
    // 400 and 900 literally and broke the moment 1440 was added on 2026-08-25 —
    // a green-to-red on a widths change that was deliberate and correct. The
    // property worth asserting is "one candidate per width, in order, each
    // pointing at its own variant", which is true whatever the list contains.
    expect(editorialSrcSet('/editorial/lookbook.jpg')).toBe(
      EDITORIAL_WIDTHS.map((w) => `/editorial/lookbook-${w}.webp ${w}w`).join(', ')
    );
    // ...and that it really is per-width, so the line above cannot pass by
    // comparing two identically-wrong strings.
    expect(editorialSrcSet('/editorial/lookbook.jpg')!.split(', ')).toHaveLength(
      EDITORIAL_WIDTHS.length
    );
  });

  it('is undefined off-convention, so React omits the attribute', () => {
    expect(editorialSrcSet('/hero-home-640.webp')).toBeUndefined();
  });
});

describe('aboutVariant', () => {
  it('maps an about original to its width-suffixed webp', () => {
    expect(aboutVariant('/about/mashrabiya.jpg', 1440)).toBe('/about/mashrabiya-1440.webp');
  });

  it('does not cross folders', () => {
    // The two folders are generated at different widths, so a cross-folder
    // match would emit a variant URL that was never written.
    expect(aboutVariant('/editorial/lookbook.jpg', 640)).toBeUndefined();
    expect(editorialVariant('/about/mashrabiya.jpg', 400)).toBeUndefined();
  });
});

describe('aboutSrcSet', () => {
  it('emits one candidate per hero-grade width', () => {
    expect(aboutSrcSet('/about/mashrabiya.jpg')).toBe(
      '/about/mashrabiya-640.webp 640w, /about/mashrabiya-1024.webp 1024w, ' +
        '/about/mashrabiya-1440.webp 1440w, /about/mashrabiya-1920.webp 1920w'
    );
  });

  it('carries the four widths the full-bleed band needs', () => {
    expect([...ABOUT_WIDTHS]).toEqual([640, 1024, 1440, 1920]);
  });
});

/**
 * The contract with scripts/optimise-images.mjs. Without this, adding a
 * photograph and forgetting to run the script produces a silent 404 in a
 * browser rather than a failure anyone would notice.
 */
describe('generated variants exist on disk', () => {
  const dir = path.join(process.cwd(), 'public', 'editorial');
  const originals = readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f));

  it('finds the originals it is meant to guard', () => {
    expect(originals.length).toBeGreaterThan(0);
  });

  for (const file of originals) {
    for (const w of EDITORIAL_WIDTHS) {
      it(`${file} has a ${w}px variant`, () => {
        const variant = editorialVariant(`/editorial/${file}`, w)!;
        expect(
          existsSync(path.join(process.cwd(), 'public', variant.replace(/^\//, ''))),
          `${variant} is missing — run: node scripts/optimise-images.mjs`
        ).toBe(true);
      });
    }
  }
});

/** Same contract, for the full-bleed photography on /about. */
describe('generated about variants exist on disk', () => {
  const dir = path.join(process.cwd(), 'public', 'about');
  const originals = readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f));

  it('finds the originals it is meant to guard', () => {
    expect(originals.length).toBeGreaterThan(0);
  });

  for (const file of originals) {
    for (const w of ABOUT_WIDTHS) {
      it(`${file} has a ${w}px variant`, () => {
        const variant = aboutVariant(`/about/${file}`, w)!;
        expect(
          existsSync(path.join(process.cwd(), 'public', variant.replace(/^\//, ''))),
          `${variant} is missing — run: node scripts/optimise-images.mjs`
        ).toBe(true);
      });
    }
  }
});
