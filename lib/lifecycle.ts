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
 */
export function nextDecisions(
  decisions: Record<string, string>,
  ids: string[],
): Record<string, string> {
  const out = { ...decisions };
  for (const id of ids) if (!(id in out)) out[id] = 'keep';
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
 * carrying delistedAt/filteredAt never publish anyway. lastSeen on ~5k published
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
