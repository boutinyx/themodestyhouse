// Product lifecycle rules — how the catalogue reacts to brands adding, removing
// and changing products. See docs/superpowers/specs/2026-08-05-catalogue-refresh-design.md
//
// EVERY rule lives here and NOTHING here touches the network or the filesystem,
// so all of it is unit-testable (lib/lifecycle.test.ts). That is deliberate: a
// wrongly-hidden product raises no error and prints nothing red — it is simply
// absent — so tests are the only mechanism that can catch this class of bug
// (§10.12). scripts/refresh.mjs and scripts/add-brands.mjs both call these
// functions rather than reimplementing them.
import type { Product } from '@/lib/types';

/** Lifecycle bookkeeping. `firstSeen` is published (see stripLifecycle below);
 *  the rest lives on raw rows ONLY and is stripped before publish. */
export interface Lifecycle {
  /** ISO date first ingested. `null` = pre-dates tracking; absent = never stamped.
   *  PUBLISHED — also declared on Product itself (lib/types.ts). */
  firstSeen?: string | null;
  /** ISO date of the last fetch (complete or partial) that contained this product. */
  lastSeen?: string;
  /** ISO date a complete fetch found this product gone. Cleared to null on return. */
  delistedAt?: string | null;
  /** ISO date OUR filters rejected a product the brand still lists. */
  filteredAt?: string | null;
  filterReason?: string;
}

export type LifecycleRow = Product & Lifecycle;

const LIFECYCLE_KEYS = ['lastSeen', 'delistedAt', 'filteredAt', 'filterReason'] as const;

// --- the complete-fetch contract -------------------------------------------

export interface FetchOutcome {
  /** A page returned zero products, i.e. we paginated to the true end. */
  reachedNaturalEnd: boolean;
  /** A page exhausted its 429 retries. */
  gaveUpOn429: boolean;
  /** A page returned a non-OK HTTP status. */
  sawErrorStatus: boolean;
  /** The pagination loop hit its page cap — so there may be more we never saw. */
  hitPageCap: boolean;
}

/**
 * Delisting is gated ENTIRELY on this predicate, so it is strict by design:
 * only a fetch that provably saw the brand's whole catalogue may be treated as
 * evidence of absence. A partial fetch is still perfectly good evidence of
 * PRESENCE — it may add and update — it just may never remove.
 *
 * This is Invariant 12 made explicit. §10.1 is what happens when it is implicit.
 */
export function isCompleteFetch(o: FetchOutcome): boolean {
  return o.reachedNaturalEnd && !o.gaveUpOn429 && !o.sawErrorStatus && !o.hitPageCap;
}

// --- the core reducer -------------------------------------------------------

export interface BrandFetchResult {
  brandSlug: string;
  /** Products that came back from the feed AND passed normalizeProduct. */
  normalized: Product[];
  /** Products the brand still lists that OUR filters rejected, and why. */
  rejected: { id: string; reason: string }[];
  complete: boolean;
}

export interface BrandReport {
  brandSlug: string;
  complete: boolean;
  fetched: number;
  /** Titles of products new to us this run — listed in full so Tina can veto. */
  added: string[];
  updated: number;
  delisted: number;
  /** Rows the brand still sells that our own filters dropped. Tracked apart from
   *  delists because 3 is churn and 300 is a broken regex. */
  filtered: { title: string; reason: string }[];
  returned: number;
}

/**
 * Applies one brand's fetch to the full row set. Returns the new row set and a
 * report. Rows belonging to other brands pass through untouched, and NO row is
 * ever removed — hiding is done with `delistedAt`, which is reversible.
 */
export function applyBrandRefresh(
  existing: LifecycleRow[],
  result: BrandFetchResult,
  today: string,
): { rows: LifecycleRow[]; report: BrandReport } {
  const byId = new Map(existing.map((r) => [r.id, r]));
  const rejectedById = new Map(result.rejected.map((r) => [r.id, r.reason]));
  const report: BrandReport = {
    brandSlug: result.brandSlug,
    complete: result.complete,
    fetched: result.normalized.length,
    added: [],
    updated: 0,
    delisted: 0,
    filtered: [],
    returned: 0,
  };

  // 1. Products the brand still sells and we can still derive: re-derive fully.
  for (const fresh of result.normalized) {
    const prior = byId.get(fresh.id);
    if (prior) {
      report.updated++;
      if (prior.delistedAt) report.returned++;
    } else {
      report.added.push(fresh.title);
    }
    byId.set(fresh.id, {
      ...fresh,
      // `'firstSeen' in prior` — not `??` — because an explicit null means
      // "pre-dates tracking" and is a real value we must not overwrite.
      firstSeen: prior && 'firstSeen' in prior ? prior.firstSeen : today,
      lastSeen: today,
      delistedAt: null,
      filteredAt: null,
    });
  }

  // 2. Products the brand still sells but our own filters reject.
  for (const { id, reason } of result.rejected) {
    const prior = byId.get(id);
    if (!prior) continue; // never seen it, nothing to record
    report.filtered.push({ title: prior.title, reason });
    byId.set(id, { ...prior, lastSeen: today, filteredAt: today, filterReason: reason });
  }

  // 3. Absence. ONLY a complete fetch may conclude a product is gone.
  if (result.complete) {
    const seen = new Set([...result.normalized.map((p) => p.id), ...rejectedById.keys()]);
    for (const row of byId.values()) {
      if (row.brandSlug !== result.brandSlug) continue;
      if (seen.has(row.id) || row.delistedAt) continue;
      report.delisted++;
      byId.set(row.id, { ...row, delistedAt: today });
    }
  }

  return { rows: [...byId.values()], report };
}

// --- decisions --------------------------------------------------------------

/**
 * Default an id to 'keep' only if there is no decision for it yet. An existing
 * decision — above all a 'cut' — is never overwritten.
 *
 * add-brands.mjs previously wrote `decisions[id] = 'keep'` unconditionally, so
 * every product Tina cut came back from the dead on the next ingest of its
 * brand. That is the failure Invariant 3 warns about.
 *
 * `defaultCutBrands` inverts the DEFAULT — never an existing decision — for a
 * house Tina curates piece by piece rather than in bulk. Without it, emptying
 * such a brand lasts exactly one night: cutting today's ids says nothing about
 * ids that do not exist yet, and the 04:10 refresh defaults every new arrival
 * to 'keep' and republishes it. Added 2026-08-27 for `urban-modesty`, which she
 * asked to empty while keeping the house itself listed so she can hand-pick
 * back into it. See data/default-cut-brands.json.
 */
export function nextDecisions(
  decisions: Record<string, string>,
  ids: string[],
  defaultCutBrands: Iterable<string> = [],
): Record<string, string> {
  const cutByDefault = new Set(defaultCutBrands);
  const out = { ...decisions };
  for (const id of ids) {
    if (id in out) continue;
    // Invariant 1: the id IS `${brandSlug}:${shopifyId}`.
    out[id] = cutByDefault.has(id.split(':')[0]) ? 'cut' : 'keep';
  }
  return out;
}

// --- publish side -----------------------------------------------------------

/** A row is live unless it has been delisted by the brand or filtered by us. */
export function isLifecycleLive(row: LifecycleRow): boolean {
  return !row.delistedAt && !row.filteredAt;
}

/**
 * Drops lifecycle bookkeeping before publish, EXCEPT firstSeen — that one is now
 * a published field (it powers the Newest/Oldest sort, lib/sortRows.ts). Rows
 * carrying delistedAt/filteredAt never publish anyway. lastSeen on ~23k published
 * rows would add real weight to products.json AND every RSC payload — which §8
 * names as the real scaling ceiling of this site — so it stays stripped; the
 * compact catalogue only ever needs firstSeen compressed to a day-index
 * (lib/compactCatalogue.ts), never the ISO string, for the same reason.
 */
export function stripLifecycle(row: LifecycleRow): Product {
  const out = { ...row } as Record<string, unknown>;
  for (const k of LIFECYCLE_KEYS) delete out[k];
  return out as unknown as Product;
}

// --- guard ------------------------------------------------------------------

export interface BrandDrop {
  brandSlug: string;
  prev: number;
  next: number;
  pct: number;
}

/**
 * Replaces the global `Math.abs(published - prev) > 40` ratchet.
 *
 * A single total covering 32 brands lets losses cancel out against gains: a
 * brand whose feed dies can vanish entirely in the same week others add stock,
 * and the total barely moves. Checking each brand independently cannot be
 * masked that way. The >=5 floor stops a 3-product brand tripping on one loss.
 */
export function brandDropViolations(
  prevCounts: Record<string, number>,
  nextCounts: Record<string, number>,
): BrandDrop[] {
  const out: BrandDrop[] = [];
  for (const [brandSlug, prev] of Object.entries(prevCounts)) {
    if (prev <= 0) continue;
    const next = nextCounts[brandSlug] ?? 0;
    const lost = prev - next;
    if (lost <= 0) continue;
    const pct = lost / prev;
    if (next === 0 || (pct > 0.3 && lost >= 5)) {
      out.push({ brandSlug, prev, next, pct: +pct.toFixed(2) });
    }
  }
  return out;
}

/**
 * Isolates a collapse to the brand(s) that caused it, instead of blocking the
 * WHOLE catalogue's publish. Added 2026-08-20 after a single brand's real
 * price-driven collapse (Abadia, see
 * docs/log/2026-08-20-refresh-failure-abadia-price-collapse.md) silently
 * blocked all ~120 OTHER brands' legitimate nightly updates — and would have
 * kept doing so every night, indefinitely, since the collapse wasn't
 * transient. `brandDropViolations` used to be a hard stop for `products.json`
 * entirely; now the caller uses it to decide WHICH brands to freeze here.
 *
 * Every dropped brand's rows are replaced with its PREVIOUS published rows
 * (same shape as `nextRows` — both are post-publish, already-stripped
 * `Product` rows, so this is a direct swap, not a re-derivation). Every other
 * brand publishes its freshly computed state normally. `ALLOW_LARGE_DIFF`
 * bypasses this entirely upstream (the caller never calls this when it's
 * set) — that remains the escape hatch for accepting a collapse as real.
 */
export function freezeCollapsedBrands<T extends { brandSlug: string }>(
  prevRows: T[],
  nextRows: T[],
  drops: BrandDrop[],
): T[] {
  if (!drops.length) return nextRows;
  const frozenSlugs = new Set(drops.map((d) => d.brandSlug));
  const kept = nextRows.filter((p) => !frozenSlugs.has(p.brandSlug));
  const frozen = prevRows.filter((p) => frozenSlugs.has(p.brandSlug));
  return [...kept, ...frozen];
}

export interface BrandPriceSignal {
  brandSlug: string;
  /** Set when the brand's published currency changed between publishes. */
  currency?: { prev: string; next: string };
  /** Median price in USD, before and after, with the ratio next/prev. */
  medianUsd: { prev: number; next: number; ratio: number };
}

const medianOf = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/**
 * Per-brand price movement between two publishes, in USD.
 *
 * WHY: on 2026-08-26 a third of the catalogue turned out to be carrying prices in
 * the wrong currency — Hidayah showing $3.12 for a 120 DKK scarf — and nothing in
 * the pipeline noticed, because every individual publish looked ordinary. The
 * currency of a feed can change under us whenever a merchant reconfigures Shopify
 * Markets or the CI runner's location moves, and the SIZE of the resulting jump is
 * an exchange rate: obvious once measured, invisible otherwise.
 * → docs/log/2026-08-26-currency-mislabelling.md
 *
 * Reports rather than blocks. A legitimate currency correction moves a median by
 * exactly this much, so failing the publish would block the very republish that
 * fixes it — the mistake `freezeCollapsedBrands` was added to undo. `rates` is
 * `data/fx-rates.json`'s `rates` (units per USD); a row in an unknown currency is
 * skipped rather than counted at 1:1.
 */
export function brandPriceSignals(
  prevRows: { brandSlug: string; price: number; currency: string }[],
  nextRows: { brandSlug: string; price: number; currency: string }[],
  rates: Record<string, number>,
  threshold = 0.15,
): BrandPriceSignal[] {
  const group = (rows: typeof prevRows) => {
    const m = new Map<string, { usd: number[]; currencies: Set<string> }>();
    for (const r of rows) {
      if (!m.has(r.brandSlug)) m.set(r.brandSlug, { usd: [], currencies: new Set() });
      const g = m.get(r.brandSlug)!;
      g.currencies.add(r.currency);
      const rate = r.currency === 'USD' ? 1 : rates[r.currency];
      if (rate) g.usd.push(r.price / rate);
    }
    return m;
  };
  const a = group(prevRows);
  const b = group(nextRows);
  const out: BrandPriceSignal[] = [];
  for (const [brandSlug, before] of a) {
    const after = b.get(brandSlug);
    if (!after || !before.usd.length || !after.usd.length) continue;
    const prev = medianOf(before.usd);
    const next = medianOf(after.usd);
    if (prev <= 0) continue;
    const ratio = next / prev;
    // One currency each side and they differ — the leading indicator.
    const pc = before.currencies.size === 1 ? [...before.currencies][0] : null;
    const nc = after.currencies.size === 1 ? [...after.currencies][0] : null;
    const changed = pc && nc && pc !== nc ? { prev: pc, next: nc } : undefined;
    if (!changed && Math.abs(ratio - 1) <= threshold) continue;
    out.push({
      brandSlug,
      ...(changed ? { currency: changed } : {}),
      medianUsd: { prev: +prev.toFixed(2), next: +next.toFixed(2), ratio: +ratio.toFixed(2) },
    });
  }
  return out.sort((x, y) => Math.abs(y.medianUsd.ratio - 1) - Math.abs(x.medianUsd.ratio - 1));
}
