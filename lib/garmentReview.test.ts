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

  it('title-confident but type disagrees -> STILL confident, title wins (real example: brand-wide product_type)', () => {
    // Measured why this must NOT hold: of 1,363 first-pass conflicts, 1,224
    // (90%) were exactly this shape — a title that explicitly says the
    // garment, flagged against a merchant's storefront-wide product_type
    // (e.g. "Abaya" titles vs a catalog-wide product_type: "Dresses").
    // tagDiscovery's own comment already states the priority this respects:
    // "Trust the TITLE first (most accurate), then fall back to type/tags."
    const row = { id: 'brand:4', garment: 'other' as const, title: 'Wide Leg Trousers',
      raw: { productType: 'Tops', tags: [], classifiedFrom: 'title' as const } };
    expect(resolveGarment(row, {})).toEqual({ status: 'confident', garment: 'trousers' });
  });

  it('meta-sourced match with no contradicting type -> confident (trusted, not held)', () => {
    // Revised 2026-08-12: meta reads a structured field (product_type/tags) a
    // merchant deliberately set, and was already being trusted with zero
    // review before this system existed — see the function's own doc comment.
    const row = { id: 'brand:5', garment: 'other' as const, title: 'Navy Blue Square Neck Cover',
      raw: { productType: 'Tops', tags: [], classifiedFrom: 'meta' as const } };
    expect(resolveGarment(row, {})).toEqual({ status: 'confident', garment: 'top' });
  });

  it('meta-sourced abaya (via a kaftan tag) vs. a generic "Dresses" product_type -> confident, not a real conflict', () => {
    // Real case: latifi tags every product "kaftan" but sets product_type to
    // "Dresses" storefront-wide, which collapsed 19 of 21 products into
    // review. Same precedent as FOREIGN_RULES' French "Robe" handling: abaya
    // is a distinct category, an explicit abaya/kaftan word wins over a
    // generic dress bucket.
    const row = { id: 'latifi:1', garment: 'other' as const, title: 'Mizna',
      raw: { productType: 'Dresses', tags: ['kaftan'], classifiedFrom: 'meta' as const } };
    expect(resolveGarment(row, {})).toEqual({ status: 'confident', garment: 'abaya' });
  });

  it('meta-sourced match with a genuinely contradicting type -> held, signal-conflict', () => {
    // The 139 real conflicts: no title signal to anchor on (garment came
    // from product_type/tags via the hay fallback), and product_type
    // independently disagrees with what the hay match landed on.
    const row = { id: 'brand:8', garment: 'other' as const, title: 'Premium Chiffon - Baltic Amber',
      raw: { productType: 'Sets', tags: ['hijab'], classifiedFrom: 'meta' as const } };
    expect(resolveGarment(row, {})).toEqual({
      status: 'held', why: 'signal-conflict', titleGuess: 'hijab', typeGuess: 'set',
    });
  });

  it('description-sourced rows trust the frozen value (cannot be re-derived without bodyHtml)', () => {
    // A colourway-only abaya title with no product_type/tags — exactly what
    // pass 4 was built to rescue (tag.ts's own "321 rescued, 0 changed"
    // measurement). Re-deriving without bodyHtml would find nothing at all
    // (title/meta/foreign all fail), so trust what ingest-time determined
    // instead of holding a legitimate classification for no reason.
    const row = { id: 'ahlam:1', garment: 'abaya' as const, title: 'Onyx Luxe',
      raw: { productType: '', tags: [], classifiedFrom: 'description' as const } };
    expect(resolveGarment(row, {})).toEqual({ status: 'frozen', garment: 'abaya' });
  });

  it('known, accepted gap: a description-sourced FALSE classification also trusts the frozen value', () => {
    // An iLoveModesty "Neck Cover" accessory, tagged "Cover-Ups"/"Neck
    // Covers", no product_type — its frozen garment 'dress' came from
    // unrelated cross-sell prose in the description at ingest time, and is
    // wrong. resolveGarment can't tell this apart from the legitimate case
    // above without bodyHtml, so it trusts the frozen value here too. This
    // is a deliberate, documented tradeoff (see the function's doc comment)
    // — the fix for this specific case is adding "neck cover" to tag.ts's
    // hijab vocabulary, not tightening confidence scoring.
    const row = { id: 'ilovemodesty:1', garment: 'dress' as const, title: 'Navy Blue Square Neck Cover',
      raw: { productType: '', tags: ['Cover-Ups', 'Neck Covers'], classifiedFrom: 'description' as const } };
    expect(resolveGarment(row, {})).toEqual({ status: 'frozen', garment: 'dress' });
  });

  it('unclassifiable title -> held, unclassified', () => {
    const row = { id: 'brand:6', garment: 'other' as const, title: 'Gift Card',
      raw: { productType: '', tags: [], classifiedFrom: 'meta' as const } };
    expect(resolveGarment(row, {})).toEqual({
      status: 'held', why: 'unclassified', titleGuess: 'other', typeGuess: 'other',
    });
  });
});
