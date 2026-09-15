import { describe, it, expect } from 'vitest';
import { pageTitle, TITLE_SUFFIX, TITLE_MAX } from './metaTitle';

describe('pageTitle', () => {
  it('keeps the template for a short title', () => {
    expect(pageTitle('Modest Skirts')).toBe('Modest Skirts');
  });

  it('drops the suffix once the rendered title would exceed the limit', () => {
    // 79 characters rendered — the longest on the site, /modest-swimwear.
    const long = 'Modest Swimwear Online — Burkinis & Full-Coverage Swimsuits';
    expect(long.length + TITLE_SUFFIX.length).toBeGreaterThan(TITLE_MAX);
    expect(pageTitle(long)).toEqual({ absolute: long });
  });

  it('keeps the template at exactly the limit', () => {
    const exact = 'x'.repeat(TITLE_MAX - TITLE_SUFFIX.length);
    expect(pageTitle(exact)).toBe(exact);
  });

  it('drops the suffix one character over the limit', () => {
    const over = 'x'.repeat(TITLE_MAX - TITLE_SUFFIX.length + 1);
    expect(pageTitle(over)).toEqual({ absolute: over });
  });

  it('the suffix is exactly what app/layout.tsx appends', () => {
    // If the template in app/layout.tsx changes, this constant has to follow
    // it or the threshold is measuring the wrong string.
    expect(TITLE_SUFFIX).toBe(' | The Modesty House');
  });
});
