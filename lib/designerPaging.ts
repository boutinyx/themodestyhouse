/**
 * Pagination arithmetic for /designers, extracted so it can be tested and so
 * generateMetadata and the page body cannot drift apart.
 *
 * They HAD drifted: the body clamped with
 *   Math.min(Math.max(Math.trunc(raw), 1), pages)
 * while generateMetadata clamped only the lower bound and never compared
 * against `pages`. So `?page=99` served page 4's content under a canonical
 * that echoed `?page=99` — a self-canonicalising duplicate for every integer
 * anyone cares to append. Confirmed live 2026-08-19.
 *
 * The body's soft-serve behaviour (an out-of-range page renders the last real
 * page rather than 404ing) is deliberate and unchanged — it is kinder to a
 * human who mistypes. Only the canonical is clamped.
 */

/** Total pages for `count` items at `perPage` each. Never below 1, so an empty
 *  index still has a page 1 to canonicalise to. */
export function designerPageCount(count: number, perPage: number): number {
  if (!Number.isFinite(count) || !Number.isFinite(perPage) || perPage < 1) return 1;
  return Math.max(1, Math.ceil(count / perPage));
}

/**
 * Parse a `?page=` value and clamp it into [1, pages].
 *
 * Accepts the raw searchParam (string | undefined). Anything not a finite
 * number — absent, empty, "abc", "NaN" — is page 1. Fractional and
 * exponential input is truncated first ("2.9" -> 2, "1e9" -> clamped to
 * `pages`), which matters because Number('1e9') IS finite and would otherwise
 * sail past a naive isFinite check.
 */
export function clampDesignerPage(raw: string | undefined, pages: number): number {
  const n = Number(raw ?? '1');
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(Math.trunc(n), 1), Math.max(1, pages));
}
