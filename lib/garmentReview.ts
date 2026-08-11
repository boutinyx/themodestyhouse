import type { Garment, Product } from '@/lib/types';
import { tagDiscovery, classifyFromType } from '@/lib/tag';

export type GarmentDecision =
  | { status: 'override'; garment: Garment }
  | { status: 'confident'; garment: Garment }
  | { status: 'frozen'; garment: Garment }
  | {
      status: 'held';
      why: 'signal-conflict' | 'weak-signal' | 'unclassified';
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
 */
export function resolveGarment(
  row: { id: string; garment: Garment; title: string; raw?: Product['raw'] },
  overrides: Record<string, Garment>,
): GarmentDecision {
  const override = overrides[row.id];
  if (override) return { status: 'override', garment: override };

  if (!row.raw) return { status: 'frozen', garment: row.garment };

  const disc = tagDiscovery({ title: row.title, productType: row.raw.productType, tags: row.raw.tags });
  const typeGuess = classifyFromType(row.raw.productType);

  if (disc.garment === 'other') {
    return { status: 'held', why: 'unclassified', titleGuess: disc.garment, typeGuess };
  }
  if (disc.source !== 'title') {
    return { status: 'held', why: 'weak-signal', titleGuess: disc.garment, typeGuess };
  }
  if (typeGuess !== 'other' && typeGuess !== disc.garment) {
    return { status: 'held', why: 'signal-conflict', titleGuess: disc.garment, typeGuess };
  }
  return { status: 'confident', garment: disc.garment };
}
