import { describe, it, expect } from 'vitest';
import { fitSentences, clampText, META_DESCRIPTION_MAX } from './metaDescription';

describe('clampText', () => {
  it('leaves a string that already fits alone', () => {
    expect(clampText('Short enough.', 160)).toBe('Short enough.');
  });

  it('cuts at a word boundary, never mid-word', () => {
    const out = clampText('Amsterdam Rotterdam Eindhoven Groningen', 20);
    expect(out).toBe('Amsterdam Rotterdam');
    expect(out.length).toBeLessThanOrEqual(20);
  });

  it('leaves no dangling punctuation at the cut', () => {
    expect(clampText('Pieces, prices, and links straight to the house.', 15)).toBe('Pieces, prices');
  });
});

describe('fitSentences', () => {
  it('keeps every part when they all fit', () => {
    expect(fitSentences(['One piece.', 'Based in Sydney.'], 160)).toBe('One piece. Based in Sydney.');
  });

  it('drops trailing parts rather than characters', () => {
    // The third clause is what pushes a real /designers page over 160.
    const parts = [
      `Every ${'X'.repeat(60)} piece we track: 1,027 items, $12–$517.`,
      'Based in Amsterdam.',
      'Prices in your own currency, checked nightly, with links straight to merrachi.com.',
    ];
    const out = fitSentences(parts, META_DESCRIPTION_MAX);
    expect(out.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(out.endsWith('Based in Amsterdam.')).toBe(true);
  });

  it('keeps the first part even when it alone is too long, word-boundary cut', () => {
    const out = fitSentences(['a'.repeat(50) + ' ' + 'b'.repeat(50) + ' ' + 'c'.repeat(90)], 160);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith('c'.repeat(90))).toBe(false);
  });

  it('ignores empty parts', () => {
    expect(fitSentences(['Only this.', '', '   '], 160)).toBe('Only this.');
  });
});
