import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { editorialVariant, editorialSrcSet, EDITORIAL_WIDTHS } from './staticImage';

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
    expect(editorialSrcSet('/editorial/lookbook.jpg')).toBe(
      '/editorial/lookbook-400.webp 400w, /editorial/lookbook-900.webp 900w'
    );
  });

  it('is undefined off-convention, so React omits the attribute', () => {
    expect(editorialSrcSet('/hero-home-640.webp')).toBeUndefined();
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
