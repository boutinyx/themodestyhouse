# First real cuts made via /staff/curate, synced into the tracked catalogue
**Date:** 2026-08-12 · **Status:** done

## Goal
Tina used the new `/staff/curate` admin (see
`docs/log/2026-08-12-staff-curate.md`) to review the live catalogue and cut
57 products she judged didn't belong, then downloaded the export
(`live-cuts-2026-08-12.json`) as documented. This is the first real run of
the deliberate manual sync step that was designed in but never yet exercised.

## What changed
- Ran `node scripts/merge-live-cuts.mjs ~/Downloads/live-cuts-2026-08-12.json`
  — wrote all 57 ids into `data/decisions.json` as `'cut'` (0 already
  matched, confirming these were genuinely new decisions).
- Ran `npm run build:data` to republish. `brandDropViolations` did not fire
  (57 cuts spread across ~30 brands, none anywhere near the 30%/5-item
  collapse threshold), so this needed no `ALLOW_LARGE_DIFF` override.
- `data/products.json`: 22,937 → 22,880 rows (exactly -57). Verified by id
  diff, not just count, that every one of the 57 cut ids is absent from the
  republished file and nothing else moved.
- **Fixed a bug in `scripts/merge-live-cuts.mjs` found on this very first
  run**: it wrote `data/decisions.json` pretty-printed
  (`JSON.stringify(decisions, null, 2)`), but `add-brands.mjs` writes it
  minified — exactly the "decisions.json formatting is contested" landmine
  CLAUDE.md §8 already documents, and this script would have been a third
  writer flipping the format every time it ran. First attempt produced a
  38,000+ line diff for a 57-value change; caught it before committing,
  reverted `decisions.json` with `git checkout --`, changed the script to
  write minified (matching `add-brands.mjs`), and re-ran — same correct
  57-value change, 2-line diff.

## Verification
```
node scripts/merge-live-cuts.mjs <file>   # 57 written, 0 already matched
npm run build:data                        # published 22880 (was 22937)
```
Programmatic check: loaded the pre-publish `data/products.json` (from git
HEAD) and the freshly republished one, confirmed count dropped by exactly 57
and that a set-intersection of the 57 cut ids against the new file's ids is
empty (no leak). `npm test` — 33 files, 561 tests, still green.

## Notes / follow-ups
- Cleared the local `data/.live-cuts.json` (gitignored, dev-machine-only)
  after the sync — it has no further purpose once the decisions are in git.
  This does NOT touch whatever copy exists on the Railway container; that
  file only matters again if Tina makes more live cuts before the next sync.
- This is the pattern going forward: cut on the live site → download export →
  hand to a session with repo access → `merge-live-cuts.mjs` →
  `npm run build:data`. Nothing about this run suggests the process needs to
  change.
