import { describe, it, expect } from 'vitest';
import { resolveGarment } from './garmentReview';

const base = { id: 'brand:1', garment: 'other' as const, title: '' };

describe('resolveGarment', () => {
  it('an override always wins, regardless of title/type', () => {
    const row = { ...base, title: 'Wide Leg Trousers', garment: 'trousers' as const,
      raw: { productType: 'Trousers', tags: [], classifiedFrom: 'title' as const } };
    expect(resolveGarment(row, { 'brand:1': 'top' })).toEqual({ status: 'override', garment: 'top' });
  });

  it('no raw signals -> falls back to the frozen garment, unchanged', () => {
    const row = { ...base, title: 'Something', garment: 'dress' as const };
    expect(resolveGarment(row, {})).toEqual({ status: 'frozen', garment: 'dress' });
  });

  it('title-confident match with no contradicting type -> confident', () => {
    const row = { id: 'brand:2', garment: 'other' as const, title: 'Chiffon Silk Hijab',
      raw: { productType: 'Hijabs', tags: [], classifiedFrom: 'title' as const } };
    expect(resolveGarment(row, {})).toEqual({ status: 'confident', garment: 'hijab' });
  });

  it('title-confident match with type agreeing -> confident', () => {
    const row = { id: 'brand:3', garment: 'other' as const, title: 'Aurelia Maxi Dress',
      raw: { productType: 'Dresses', tags: [], classifiedFrom: 'title' as const } };
    expect(resolveGarment(row, {})).toEqual({ status: 'confident', garment: 'dress' });
  });

  it('title-confident but type disagrees -> held, signal-conflict, both guesses recorded', () => {
    const row = { id: 'brand:4', garment: 'other' as const, title: 'Wide Leg Trousers',
      raw: { productType: 'Tops', tags: [], classifiedFrom: 'title' as const } };
    expect(resolveGarment(row, {})).toEqual({
      status: 'held', why: 'signal-conflict', titleGuess: 'trousers', typeGuess: 'top',
    });
  });

  it('weak signal (matched only via meta, not the title) -> held', () => {
    const row = { id: 'brand:5', garment: 'other' as const, title: 'Navy Blue Square Neck Cover',
      raw: { productType: 'Tops', tags: [], classifiedFrom: 'meta' as const } };
    const d = resolveGarment(row, {});
    expect(d.status).toBe('held');
    expect(d).toMatchObject({ why: 'weak-signal', titleGuess: 'top', typeGuess: 'top' });
  });

  it('unclassifiable title -> held, unclassified', () => {
    const row = { id: 'brand:6', garment: 'other' as const, title: 'Gift Card',
      raw: { productType: '', tags: [], classifiedFrom: 'meta' as const } };
    expect(resolveGarment(row, {})).toEqual({
      status: 'held', why: 'unclassified', titleGuess: 'other', typeGuess: 'other',
    });
  });
});
