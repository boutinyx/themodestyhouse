import type { LinkVerdict } from './deadLink';

/**
 * The ledger that lets a dead product link unpublish itself — and republish
 * itself when the house puts the piece back.
 *
 * Tina, 2026-09-15: *"id rather not touch anything and everything will be
 * automatic"*. So this is modelled on the size floor (Tina's other standing
 * rule, `lib/sizeAvailability.ts`): the judgement is re-evaluated on every
 * publish and never written into `data/decisions.json`, because a permanent cut
 * would be wrong the moment the brand restocks. A product is withheld while its
 * link is dead and comes back on the next publish once it works again, with no
 * human action either way.
 *
 * WHAT IT WILL NOT DO, and why each guard exists:
 *
 * 1. **`unknown` never counts.** A timeout, a 429, a 5xx or a DNS failure is the
 *    check failing, not the product dying. It leaves the entry exactly as it
 *    was — it cannot add a strike and it cannot clear one. §10.44 is the cost of
 *    getting this wrong: 90 rate-limited brands were nearly published as a
 *    finding about the brands.
 *
 * 2. **A `moved` verdict needs TWO sightings; a hard 404 needs one.** A 404 or
 *    410 is the house's own statement that the page is gone. A redirect is not:
 *    it can be an A/B test, a geo rule, or a bot wall, and this machine's own
 *    resolver has already made a live storefront look dead once (losyana.nl,
 *    same day). So a redirect has to be seen twice, in separate sweeps.
 *
 * 3. **A brand-wide failure withholds NOTHING.** If more than
 *    `BRAND_WIDE_SHARE` of a brand's checked rows fail in one sweep, that is a
 *    storefront-level event — a domain move (§10.54), a region block, a bot
 *    wall — not 300 products being discontinued at once. Those rows are recorded
 *    and flagged, and the decision goes to a human. Withholding a whole house on
 *    an automated signal is exactly the shape of §10.1.
 */

export type DeadEntry = {
  url: string;
  verdict: Exclude<LinkVerdict, 'ok' | 'unknown'>;
  /** Separate sweeps that have seen this link fail. */
  strikes: number;
  firstSeen: string;
  lastSeen: string;
  /** True when this row failed as part of a brand-wide failure — never withheld. */
  brandWide?: boolean;
};

export type DeadLedger = {
  generatedAt: string;
  entries: Record<string, DeadEntry>;
};

export type SweepRow = {
  id: string;
  brandSlug: string;
  url: string;
  verdict: LinkVerdict;
};

/** Above this share of a brand's CHECKED rows failing, treat it as storefront-level. */
export const BRAND_WIDE_SHARE = 0.4;
/** A brand needs at least this many checked rows before the share means anything. */
export const BRAND_WIDE_MIN_ROWS = 5;

export const EMPTY_LEDGER: DeadLedger = { generatedAt: '', entries: {} };

/**
 * Fold one sweep's rows into the ledger.
 *
 * `rows` must be only the rows this sweep actually checked — a product absent
 * from it keeps whatever the ledger already says, which is what makes the
 * rotating 1/7 slice safe to write.
 */
export function mergeSweep(ledger: DeadLedger, rows: SweepRow[], now: string): DeadLedger {
  const entries: Record<string, DeadEntry> = { ...ledger.entries };

  const checkedByBrand = new Map<string, number>();
  const failedByBrand = new Map<string, number>();
  for (const r of rows) {
    if (r.verdict === 'unknown') continue;
    checkedByBrand.set(r.brandSlug, (checkedByBrand.get(r.brandSlug) ?? 0) + 1);
    if (r.verdict !== 'ok') failedByBrand.set(r.brandSlug, (failedByBrand.get(r.brandSlug) ?? 0) + 1);
  }
  const brandWide = new Set<string>();
  for (const [slug, failed] of failedByBrand) {
    const checked = checkedByBrand.get(slug) ?? 0;
    if (checked >= BRAND_WIDE_MIN_ROWS && failed / checked > BRAND_WIDE_SHARE) brandWide.add(slug);
  }

  for (const r of rows) {
    if (r.verdict === 'unknown') continue;

    if (r.verdict === 'ok') {
      // Self-healing: the piece is back, so the ledger forgets it entirely.
      delete entries[r.id];
      continue;
    }

    const prev = entries[r.id];
    entries[r.id] = {
      url: r.url,
      verdict: r.verdict,
      strikes: (prev?.strikes ?? 0) + 1,
      firstSeen: prev?.firstSeen ?? now,
      lastSeen: now,
      ...(brandWide.has(r.brandSlug) ? { brandWide: true } : {}),
    };
  }

  return { generatedAt: now, entries };
}

/** Strikes required before a verdict is acted on. See guard 2 in the header. */
export function strikesNeeded(verdict: DeadEntry['verdict']): number {
  return verdict === 'dead' ? 1 : 2;
}

/** The product ids the publish should withhold. */
export function withheldIds(ledger: DeadLedger): Set<string> {
  const out = new Set<string>();
  for (const [id, e] of Object.entries(ledger.entries ?? {})) {
    if (e.brandWide) continue;
    if (e.strikes >= strikesNeeded(e.verdict)) out.add(id);
  }
  return out;
}
