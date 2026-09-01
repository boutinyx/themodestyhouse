import { encodeCatalogue, type CardSlice, type CardSource } from '@/lib/compactCatalogue';
import { browseProducts, productsForLane, productsForBrand } from '@/lib/products';
import { newInProducts } from '@/lib/newIn';
import { BRANDS } from '@/data/brands';
import type { Product } from '@/lib/types';

/**
 * Server side of the index/card split (lib/compactCatalogue.ts).
 *
 * A grid page ships the index tier for every row and the card tier only for the
 * first screenful. When a visitor filters or scrolls past it, the client asks
 * here for the card data of the specific rows it is about to paint.
 *
 * Framework-free on purpose: `cookies()`/`NextRequest` only work inside a
 * request context, which vitest does not provide, and this is the half worth
 * unit-testing. Same split as lib/staffSession.ts over lib/adminAuth.ts.
 */

/** Thrown when the client's row indices refer to a catalogue that no longer
 *  exists. See CatalogueMovedError's use in the route handler. */
export class CatalogueMovedError extends Error {}

// CardSource is declared in lib/compactCatalogue.ts (client-safe) and
// re-exported here so server callers have one import.
export type { CardSource };

function productsFor(source: CardSource): Product[] {
  if (source === 'browse') return browseProducts();
  if ('lane' in source) return productsForLane(source.lane);
  if ('newIn' in source) return newInProducts({ hijabs: source.newIn.hijabs });
  return productsForBrand(source.brand);
}

/**
 * How many rows one request may ask for.
 *
 * The client asks for a screenful at a time (STEP = 24), occasionally a few
 * after fast scrolling. The cap is not about protecting the server — this is
 * cheap — but about not offering a bulk catalogue export at a public URL that
 * the site's own pages deliberately do not contain.
 */
export const MAX_ROWS = 240;

export function cardSliceFor(
  source: CardSource,
  rows: number[],
  expectedRowCount?: number,
): CardSlice {
  const products = productsFor(source);

  // The staleness guard. The nightly refresh pushes a new catalogue to main on
  // its own schedule (CLAUDE.md §10.35), and a deploy restarts this container
  // under tabs that are already open. When that happens every row index the
  // client holds silently points at a DIFFERENT product — the failure would be
  // wrong products rendered under the right titles, which nothing would catch.
  // Refuse instead, and let the client reload.
  if (expectedRowCount !== undefined && expectedRowCount !== products.length) {
    throw new CatalogueMovedError(
      `catalogue moved: client has ${expectedRowCount} rows, server has ${products.length}`,
    );
  }

  const wanted = [...new Set(rows)]
    .filter((r) => Number.isInteger(r) && r >= 0 && r < products.length)
    .slice(0, MAX_ROWS);

  // Encode only the rows asked for. `products.map` would re-derive the whole
  // catalogue; instead hand encodeCatalogue exactly the products wanted and
  // remap its 0..n-1 output back onto the absolute row indices. This keeps
  // every derivation (shopifyId, image split, urlTail) in encodeCatalogue —
  // there is no second implementation that could drift from it.
  const subset = wanted.map((r) => products[r]);
  const encoded = encodeCatalogue(subset, BRANDS);
  const out: CardSlice = { rows: {} };
  wanted.forEach((absoluteRow, i) => {
    out.rows[absoluteRow] = encoded.cards.rows[i];
  });
  return out;
}
