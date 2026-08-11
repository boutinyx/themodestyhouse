import type { Garment, Product } from '@/lib/types';
import { tagDiscovery, classifyFromType } from '@/lib/tag';

export type GarmentDecision =
  | { status: 'override'; garment: Garment }
  | { status: 'confident'; garment: Garment }
  | { status: 'frozen'; garment: Garment }
  | {
      status: 'held';
      why: 'signal-conflict' | 'unclassified';
      titleGuess: Garment;
      typeGuess: Garment;
    };

/**
 * The publish-time classification decision. Re-runs the CURRENT lib/tag.ts
 * logic from the signals persisted on the raw row (see lib/normalize.ts),
 * instead of trusting the value frozen at ingest time — this is what lets a
 * tagger fix reach the whole catalogue on the next `npm run build:data`
 * without a re-scrape.
 *
 * Order matters: an override always wins (§10.13 — a human decision is never
 * silently revisited by automation). Absent `raw` means the row pre-dates
 * this system and there is nothing to re-derive from, so the frozen value is
 * kept as-is — behavior only improves as brands get re-scraped, never
 * regresses on untouched rows.
 *
 * REVISED 2026-08-12, same day as first shipped: the original held back
 * anything not sourced from the title alone. A real `npm run refresh`
 * measured the cost: 6,358 of 8,749 held-back rows were meta/foreign/
 * description-sourced, and only 139 (2%) had a product_type that actually
 * DISAGREED — the other 6,219 had either independent agreement or no
 * product_type opinion at all (e.g. a brand that only tags colourways:
 * "Solid Modal - Umber" -> hijab, via its tags). Gating on source alone was
 * strictly more cautious than the status quo (these fallback passes were
 * being trusted with ZERO review before this system existed) for no
 * measured benefit.
 *
 * `body_html` is deliberately never persisted (see the design doc's
 * non-goals), which means the tagDiscovery call below can NEVER reproduce a
 * description-sourced (pass-4) match — there is nothing to parse, so title/
 * meta/foreign always come back `other` for a row that originally needed
 * pass 4. Tried holding those for review (matching "can't re-verify it, so
 * don't trust it"), on the theory this would also catch a real bad case: an
 * iLoveModesty "Neck Cover" accessory (tagged "Cover-Ups"/"Neck Covers", no
 * product_type) whose FROZEN garment was 'dress' — a pass-4 false positive
 * from unrelated cross-sell prose. It did catch that — but a real refresh
 * run measured the actual cost: 1,317 rows across the catalogue are
 * description-sourced, entirely legitimate ones (colourway-only titles like
 * "Onyx Luxe" for an abaya brand — precisely what pass 4 was BUILT for,
 * "measured across 4,694 live products: 321 rescued, 0 existing results
 * changed", see tag.ts's own pass-4 comment). Holding all of them wiped out
 * 100% of three brands' catalogues to guard against one two-item edge case.
 * `classifiedFrom: 'description'` rows therefore trust the FROZEN value
 * instead — identical to the "no raw signals" fallback, because for this one
 * pass that IS the situation: nothing here can improve on what ingest-time
 * already determined. The narrow accessory-vs-garment gap this reopens
 * (Neck Cover) is real and known — it's an editorial/vocabulary question
 * (does "neck cover" belong in the hijab word list in tag.ts?), not a
 * confidence-scoring one, and belongs there as a follow-up, not here.
 *
 * The product_type conflict check below is applied ONLY to meta-sourced
 * matches, not title-sourced ones — measured why: of 1,363 "conflicts" on
 * the first pass, 1,224 (90%) were title-sourced, e.g. a title that
 * literally says "Abaya" flagged against a merchant's storefront-wide
 * `product_type: "Dresses"`. `tagDiscovery`'s own top-of-function comment
 * already states the design principle this violated: "Trust the TITLE
 * first (most accurate), then fall back to type/tags" — product_type is
 * frequently a blunt, catalog-wide bucket a merchant set once for their
 * whole store, not a reliable per-item signal, and re-litigating an
 * explicit title match against it inverts that stated priority. A
 * meta-sourced match has no title signal to anchor on, so checking it
 * against product_type is the genuinely useful case (the remaining 139)
 * and is unaffected by this change.
 */
export function resolveGarment(
  row: { id: string; garment: Garment; title: string; raw?: Product['raw'] },
  overrides: Record<string, Garment>,
): GarmentDecision {
  const override = overrides[row.id];
  if (override) return { status: 'override', garment: override };

  if (!row.raw) return { status: 'frozen', garment: row.garment };
  if (row.raw.classifiedFrom === 'description') return { status: 'frozen', garment: row.garment };

  const disc = tagDiscovery({ title: row.title, productType: row.raw.productType, tags: row.raw.tags });
  const typeGuess = classifyFromType(row.raw.productType);

  if (disc.garment === 'other') {
    return { status: 'held', why: 'unclassified', titleGuess: disc.garment, typeGuess };
  }
  // abaya vs. a generic "Dresses" product_type is NOT a real conflict: 68 of
  // the (then-)139 remaining meta-sourced conflicts were exactly this pair —
  // e.g. latifi tags every product "kaftan" (an explicit GARMENT_RULES abaya
  // word) but sets product_type to "Dresses" storefront-wide, collapsing 19
  // of 21 products into review. Same precedent already documented in
  // FOREIGN_RULES for the identical French "Robe"-vs-abaya ambiguity: "Abaya
  // is a distinct category here, so English/product-specific results must
  // always win." A specific abaya/kaftan word beats a generic dress bucket.
  const isAbayaVsGenericDress = disc.garment === 'abaya' && typeGuess === 'dress';
  if (disc.source !== 'title' && !isAbayaVsGenericDress && typeGuess !== 'other' && typeGuess !== disc.garment) {
    return { status: 'held', why: 'signal-conflict', titleGuess: disc.garment, typeGuess };
  }
  return { status: 'confident', garment: disc.garment };
}
