import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GHOST_IMAGE_WIDTHS, ghostImageSrcSet, ghostImageVariant } from './ghostImage';

const SRC = 'https://cms.themodestyhouse.com/content/images/2026/09/a.jpg';

describe('ghostImageVariant', () => {
  it('inserts the size and webp segments after /content/images/', () => {
    expect(ghostImageVariant(SRC, 900)).toBe(
      'https://cms.themodestyhouse.com/content/images/size/w900/format/webp/2026/09/a.jpg',
    );
  });

  it('refuses a foreign host', () => {
    expect(ghostImageVariant('https://example.com/content/images/a.jpg', 900)).toBeUndefined();
  });

  it('refuses a width the theme does not declare', () => {
    expect(ghostImageVariant(SRC, 500)).toBeUndefined();
  });

  it('refuses a URL that is not under /content/images/', () => {
    expect(ghostImageVariant('https://cms.themodestyhouse.com/other/a.jpg', 900)).toBeUndefined();
  });

  it('returns undefined for a missing src', () => {
    expect(ghostImageVariant(undefined, 900)).toBeUndefined();
  });
});

describe('ghostImageSrcSet', () => {
  it('lists every declared width', () => {
    const s = ghostImageSrcSet(SRC)!;
    expect(s.split(', ')).toHaveLength(GHOST_IMAGE_WIDTHS.length);
    expect(s).toContain('/size/w1440/format/webp/2026/09/a.jpg 1440w');
  });
  it('is undefined for a foreign image', () => {
    expect(ghostImageSrcSet('https://example.com/a.jpg')).toBeUndefined();
  });
});

describe('theme contract', () => {
  // An undeclared width does not 404 on Ghost: it 302s to the full-size original,
  // which is a silent page-weight regression. So the widths are pinned to the theme.
  it('every width is declared in ghost-theme/package.json', () => {
    const pkg = JSON.parse(readFileSync('ghost-theme/package.json', 'utf8'));
    const declared = Object.values(pkg.config.image_sizes as Record<string, { width: number }>).map(
      (v) => v.width,
    );
    for (const w of GHOST_IMAGE_WIDTHS) expect(declared).toContain(w);
  });
});
