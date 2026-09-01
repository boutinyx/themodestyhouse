import { describe, it, expect } from 'vitest';
import { cardSliceFor, CatalogueMovedError, MAX_ROWS } from './catalogueCards';
import { browseProducts, productsForLane, getProducts } from './products';
import { selectNewIn } from './newIn';
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

  /*
   * /new-in is the second caller of DirectoryBrowser, and until 2026-09-01 that
   * component hardcoded `source: 'browse'`. So every "Load more" past the 48
   * embedded cards asked for rows of a 9,000-row list while holding indices
   * into a 163-row one; the rowCount guard 409'd, the client stopped, and the
   * button vanished without ever adding a card. Nothing errored and nothing
   * looked wrong on the first two screens, which is why it survived a full
   * staging verification.
   *
   * These assert the SHAPE and the SELF-CONSISTENCY of the source, never a
   * specific product or count — the nightly refresh moves both (§10.19).
   */
  it('resolves the newIn source, and matches its own inline encoding', () => {
    const rows = selectNewIn(getProducts(), { hijabs: false });
    expect(rows.length).toBeGreaterThan(0);
    const full = encodeCatalogue(rows, BRANDS);
    const slice = cardSliceFor({ newIn: { hijabs: false } }, [0, 1, 2], rows.length);
    for (const row of [0, 1, 2]) expect(slice.rows[row]).toEqual(full.cards.rows[row]);
  });

  it('treats the two hijab views as different catalogues', () => {
    const off = selectNewIn(getProducts(), { hijabs: false }).length;
    const on = selectNewIn(getProducts(), { hijabs: true }).length;
    expect(on).toBeGreaterThan(off); // the toggle genuinely widens the list
    // asking for the WIDER list while holding the narrower one's rowCount is
    // exactly the mismatch that broke Load more, and must be refused
    expect(() => cardSliceFor({ newIn: { hijabs: true } }, [0], off)).toThrow(CatalogueMovedError);
    // ...and ACCEPTED with its own. Without this half the test passes even when
    // the newIn branch is missing entirely, because an unresolved source yields
    // an empty list whose length disagrees with everything — it would be
    // asserting the guard, not the source (§10.28 rule 1, found by running it).
    expect(() => cardSliceFor({ newIn: { hijabs: true } }, [0], on)).not.toThrow();
    expect(() => cardSliceFor({ newIn: { hijabs: false } }, [0], off)).not.toThrow();
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
