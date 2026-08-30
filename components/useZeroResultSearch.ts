'use client';
import { useEffect, useRef } from 'react';
import { trackGoal } from '@/lib/pulse';

/** Below this, a query is someone still typing, not a search. */
const MIN_LENGTH = 3;
/** Long enough that a query is finished, short enough to survive a page leave. */
const SETTLE_MS = 1200;

/**
 * Emits `search_zero_results` when a search has settled and found nothing.
 *
 * Both grids filter LIVE as you type, so there is no submit event to hang this
 * on and no "results page" that either exists or doesn't — "sh", "shi", "shir"
 * and "shirt" are four states of one search, three of which legitimately match
 * nothing. Hence the two guards, which are what make the resulting list worth
 * reading rather than a transcript of keystrokes:
 *
 *   - the query must have stopped changing for SETTLE_MS, and
 *   - it is only ever counted ONCE per page view (backspacing to a prefix and
 *     forward again is one search, not three).
 *
 * The count comes from the caller because only the grid knows it: the search
 * field lives in `IndexPanel`, the filtering in `DirectoryBrowser` /
 * `FilterableGrid`. Passing the number in also means this fires on a genuinely
 * empty result set, not on "the grid has not rendered yet".
 *
 * ONE CALL SITE TODAY, deliberately: `DirectoryBrowser`. Every lane and every
 * edit passes `searchable={false}` to `FilterableGrid` (app/[lane]/page.tsx,
 * app/edits/[slug]/page.tsx), so those grids have no search field and a hook
 * there could never fire — code that cannot run is not coverage (§10.28 rule 3).
 * The header's magnifier routes to `/directory?q=…`, so it IS measured here.
 * If a lane ever becomes searchable, add the same one-line call there.
 *
 * PRIVACY. This is the only goal on the site carrying text a visitor typed, so:
 * zero-result queries only (a search that worked tells us nothing we need), one
 * event per query, and `lib/pulse.ts` caps the value at 60 characters. It is
 * disclosed in content/legal/privacy.md §2 in its own sentence, and
 * `lib/legal.test.ts` fails if that sentence goes missing.
 */
export function useZeroResultSearch(query: string, resultCount: number): void {
  const seen = useRef<Set<string>>(new Set());
  // Read inside the timeout so a count that arrives a tick later — the grid
  // re-renders as the user types — is the one that decides, without restarting
  // the timer and pushing the report out indefinitely.
  const countRef = useRef(resultCount);
  useEffect(() => { countRef.current = resultCount; }, [resultCount]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < MIN_LENGTH || seen.current.has(q)) return;
    const t = setTimeout(() => {
      if (countRef.current !== 0) return;
      seen.current.add(q);
      trackGoal('search_zero_results', { query: q });
    }, SETTLE_MS);
    return () => clearTimeout(t);
  }, [query]);
}
