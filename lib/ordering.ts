// Catalogue ordering adjustments applied at publish time (scripts/build-data.mjs),
// after interleaveByBrand.
//
// Pure and unit-tested, because ordering bugs are invisible: a product in the
// wrong place still renders correctly and nothing errors.
import type { Garment, Product } from '@/lib/types';

/**
 * Round-robin by house, so a grid mixes houses instead of showing one house's
 * whole catalogue at a time.
 *
 * Lived in scripts/build-data.mjs until 2026-09-01, when lib/newIn.ts needed
 * the same behaviour. Moved rather than copied: §8 already records what
 * happens when one rule exists in two places (the exclusion logic duplicated
 * between build-data.mjs and lib/exclude.test.ts, where changing one silently
 * stops the other testing anything real). build-data.mjs imports it from here
 * now, and this file's own header already described itself as running "after
 * interleaveByBrand".
 *
 * Stable within a house: two pieces from the same house keep their relative
 * order, which is what lets /new-in interleave INSIDE a day without disturbing
 * newest-first across days.
 */
export function interleaveByBrand<T extends { brandSlug: string }>(items: T[]): T[] {
  const queues = new Map<string, T[]>();
  for (const p of items) {
    let q = queues.get(p.brandSlug);
    if (!q) { q = []; queues.set(p.brandSlug, q); }
    q.push(p);
  }
  const lists = [...queues.values()];
  const out: T[] = [];
  let any = true;
  while (any) {
    any = false;
    for (const q of lists) {
      const item = q.shift();
      if (item) { out.push(item); any = true; }
    }
  }
  return out;
}

/** Share of the demoted garment allowed in the opening of the catalogue. */
const OPENING_SHARE = 0.15;
/** Positions over which the cap ramps back to the garment's natural share. */
const RAMP_FROM = 100;
const RAMP_TO = 300;

/**
 * Pushes one garment lower in a mixed grid without hiding it.
 *
 * Owner's request (2026-08-06): abayas are 37% of the browsable catalogue — the
 * largest garment by far — and dominated the scroll. They should sit "a little
 * lower, not completely down".
 *
 * Works as a cap on the RUNNING share rather than a fixed offset: at each output
 * position the target share ramps from 15% over the first 100 products back to
 * the garment's natural share by position 300, and an item of that garment is
 * only emitted when the running share is below target. Held-back items are not
 * dumped at the end — once the ramp completes, the running share sits under
 * target and they flush back in over the following few hundred positions.
 *
 * CRITICAL PROPERTY: items keep their order RELATIVE TO EACH OTHER within their
 * group. `/modest-abayas` filters the published order down to abayas, so their
 * unchanged relative order means the abaya lane is completely unaffected by this.
 * `lib/ordering.test.ts` asserts it.
 */
export function demoteGarment(
  items: Product[],
  garment: Garment,
  /**
   * Which rows the shopper actually sees in the mixed grid. `/directory` calls
   * browseProducts(), which strips hijabs and swim/activewear BEFORE rendering,
   * so capping across the raw list measures a sequence nobody looks at —
   * removing those rows re-concentrates the demoted garment. The first version
   * of this did exactly that and pushed abayas from 12% UP to 21%.
   *
   * Rows that fail this predicate keep their exact positions and are ignored by
   * the share calculation, so other lanes are untouched.
   */
  isVisible?: (p: Product) => boolean,
): Product[] {
  if (isVisible) {
    const slots: number[] = [];
    const visible: Product[] = [];
    items.forEach((p, i) => {
      if (isVisible(p)) { slots.push(i); visible.push(p); }
    });
    const reordered = demoteGarment(visible, garment);
    const out = items.slice();
    slots.forEach((slot, k) => { out[slot] = reordered[k]; });
    return out;
  }

  const target: Product[] = [];
  const rest: Product[] = [];
  for (const p of items) (p.garment === garment ? target : rest).push(p);

  // Nothing to balance: one of the two groups is empty.
  if (!target.length || !rest.length) return items.slice();

  const natural = target.length / items.length;
  const out: Product[] = [];
  let ti = 0;
  let ri = 0;

  // How many of the demoted garment SHOULD have appeared by this position: the
  // integral of the rate curve (15% flat, then ramping to the natural share).
  //
  // WHY AN INTEGRAL AND NOT A RUNNING AVERAGE: comparing `ti / pos` against the
  // rate makes the deficit repayable, so every item held back early has to be
  // crammed in right after the ramp — measured as a 59%-abaya stretch at
  // positions 200-300, which is worse than not demoting at all. Integrating the
  // rate means the schedule only ever describes the LOCAL density, and the
  // held-back remainder simply lands in the deep tail.
  const ramp = RAMP_TO - RAMP_FROM;
  const dueBy = (pos: number): number => {
    if (pos <= RAMP_FROM) return OPENING_SHARE * pos;
    const d = Math.min(pos, RAMP_TO) - RAMP_FROM;
    const upToRamp =
      OPENING_SHARE * RAMP_FROM + OPENING_SHARE * d + ((natural - OPENING_SHARE) * d * d) / (2 * ramp);
    return pos <= RAMP_TO ? upToRamp : upToRamp + natural * (pos - RAMP_TO);
  };

  for (let pos = 0; pos < items.length; pos++) {
    const wantTarget = ti < dueBy(pos);

    if (ri >= rest.length) out.push(target[ti++]);
    else if (ti >= target.length) out.push(rest[ri++]);
    else if (wantTarget) out.push(target[ti++]);
    else out.push(rest[ri++]);
  }
  return out;
}
