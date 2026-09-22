import { describe, expect, test } from 'vitest';
import { productAltText } from './altText';

describe('productAltText', () => {
  test('adds the garment word when the title does not already say it', () => {
    expect(productAltText({ title: 'Mirage Pant Black', brandName: 'Mirage', garment: 'trousers' }))
      .toBe('Mirage Pant Black — trousers by Mirage');
  });

  test('skips the garment word when the title already contains it, case-insensitively', () => {
    expect(productAltText({ title: 'Zahra Dress', brandName: 'Zahra', garment: 'dress' }))
      .toBe('Zahra Dress — by Zahra');
    expect(productAltText({ title: 'ABAYA — Washed Silk Jacquard Flared', brandName: 'Aab', garment: 'abaya' }))
      .toBe('ABAYA — Washed Silk Jacquard Flared — by Aab');
  });

  test('never surfaces the "other" garment as a word', () => {
    expect(productAltText({ title: 'Baju Kurung Set', brandName: 'Sei Sorelle', garment: 'other' }))
      .toBe('Baju Kurung Set — by Sei Sorelle');
  });

  test('always names the brand, which the title alone never does', () => {
    const alt = productAltText({ title: 'The Comfy Dress Burgundy', brandName: 'HUM Clothing', garment: 'dress' });
    expect(alt).toContain('HUM Clothing');
  });
});
