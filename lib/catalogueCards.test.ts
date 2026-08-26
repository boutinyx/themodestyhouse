import { describe, it, expect } from 'vitest';
import { cardSliceFor, CatalogueMovedError, MAX_ROWS } from './catalogueCards';
import { browseProducts, productsForLane } from './products';
import { encodeCatalogue } from './compactCatalogue';
import { BRANDS } from '@/data/brands';

describe('cardSliceFor', () => {
  it('returns exactly the rows asked for, keyed by absolute row index', () => {
    const slice = cardSliceFor('browse', [0, 5, 9]);
    expect(Object.keys(slice.rows).map(Number).sort((a, b) => a - b)).toEqual([0, 5, 9]);
  });

  // The whole scheme rests on this: a slice fetched later must describe the
  // same product the inline payload would have. If these ever disagree, cards
  // render with another product's photograph and link — the §10.12 failure,
  // invisible from the grid.
  it('produces byte-identical card data to the inline encoding', () => {
    const full = encodeCatalogue(browseProducts(), BRANDS);
    const slice = cardSliceFor('browse', [0, 1, 500, 5000]);
    for (const row of [0, 1, 500, 5000]) {
      expect(slice.rows[row]).toEqual(full.cards.rows[row]);
    }
  });

  it('ignores out-of-range and malformed indices rather than throwing', () => {
    const slice = cardSliceFor('browse', [0, -1, 99_999_999, 1.5, NaN]);
    expect(slice.rows[0]).toBeDefined();
    expect(Object.keys(slice.rows)).toHaveLength(1);
  });

  it('caps a request so the endpoint cannot be used as a bulk export', () => {
    const slice = cardSliceFor('browse', Array.from({ length: 1000 }, (_, i) => i));
    expect(Object.keys(slice.rows)).toHaveLength(MAX_ROWS);
  });

  it('refuses when the client\'s row count disagrees with the server\'s', () => {
    expect(() => cardSliceFor('browse', [0], 1)).toThrow(CatalogueMovedError);
  });

  it('accepts a matching row count', () => {
    const n = browseProducts().length;
    expect(() => cardSliceFor('browse', [0], n)).not.toThrow();
  });

  it('indexes into the lane, not the whole catalogue, for a lane source', () => {
    // Row 0 is NOT a usable discriminator: the catalogue's first product is a
    // dress, so browse[0] and modest-dresses[0] are legitimately the same row
    // (verified — both are niswa:10217348399402). Row 40 is where the two
    // orderings have diverged.
    const lane = cardSliceFor({ lane: 'modest-dresses' }, [40]);
    const browse = cardSliceFor('browse', [40]);
    expect(lane.rows[40]).toBeDefined();
    expect(lane.rows[40]).not.toEqual(browse.rows[40]);
  });

  it('matches the lane\'s OWN inline encoding, row for row', () => {
    const laneFull = encodeCatalogue(productsForLane('modest-dresses'), BRANDS);
    const slice = cardSliceFor({ lane: 'modest-dresses' }, [0, 40, 100]);
    for (const row of [0, 40, 100]) {
      expect(slice.rows[row]).toEqual(laneFull.cards.rows[row]);
    }
  });
});
