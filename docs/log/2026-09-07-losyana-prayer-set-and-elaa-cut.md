# Losyana prayer set moved to Hijabs & Scarves; an Elaa preorder cut
**Date:** 2026-09-07 · **Status:** done

## Goal

Tina, with two live links:
- `losyana.shop/products/gebetskleidung-medina-seide-royal-green` — *"needs to go to prayer sets"*
- `elaathelabel.com/products/preorder-mini-lila-muted-floral` — *"needs to be deleted"*

## The shared-tree hazard this ran into

A day had passed since this session last fetched. `git checkout` on the three generated data
files (undoing a speculative republish, see below) landed on whatever `staging`'s HEAD
currently was — and HEAD had moved substantially: another session had shipped a Meta product
catalogue feed, an og:image fix, an under-dresses lane move, and — critically — a same-day
commit titled *"cut five menswear products, and refresh Losyana to fix two dead images"*.

**The Losyana link Tina sent resolves to a product id that Loyana's own domain move
(§10.54, `.nl` → `.shop`) had already orphaned.** The id in my first draft,
`losyana:8609451737426`, still exists in `raw-products.json` (Invariant 12 — raw never
deletes) with `lastSeen: 2026-08-28` and a `losyana.nl` URL, but it is **not published** —
the live product at the exact URL Tina sent is `losyana:8573922246981`, a different Shopify
product id on the `.shop` domain, same title, same URL path. Writing the override against the
first id would have been a silent no-op: a correctly-shaped edit pointing at a dead row.

Caught by checking "is this id actually published" before trusting it, rather than assuming a
raw-data hit meant the id was current — the second half of the lesson §10.54 already wrote
down. Also re-verified the base was current (`git fetch && git log HEAD..origin/main`) before
republishing, which is why the first republish attempt's count looked wrong by 70-some rows
until it was re-run against the right base — see Verification.

## What changed

**`data/lane-overrides.json`** — one entry, on the corrected id:
`"losyana:8573922246981": {"lane": "layering-basics", "subtype": "prayer-set"}`. Same shape
as the 22 existing `prayer-set` entries (Ahlam, Nasiba, Nour Al Houda, Ria Miranda, Jennah
Boutique, Modern Hijabi, Mariam's, Veiled). `isPrayer()` in `lib/specialty.ts` reads
`forcedLayeringSubtype === 'prayer-set'` as authoritative, and the Hijabs & Scarves lane
matches on `isPrayer(p)` — so this one edit moves it there without touching `lib/tag.ts`.
This product's German description (*"Muslimisches Gebets-Set... Dieses Set bestehend aus
einem Hijab und einer Abaya"*) confirms it: a hijab + abaya prayer set, titled in German
("Gebetskleidung" = prayer clothing) with no literal English "prayer" for `PRAYER_RE` to
catch — exactly the stranded case the override mechanism exists for.

**`data/exclusions.json`** — `elaa-the-label:7326907990149` added to `ids`. Permanent removal
goes in exclusions, never `decisions.json` (Invariant 3) — a `cut` decision would be silently
overwritten to `keep` the next time `add-brands.mjs`/`refresh.mjs` touches Elaa The Label.
Checked first: not referenced in `lib/edits.ts`, `data/dress-subtypes.json` or
`data/garment-overrides.json` — those files hold entries for OTHER Elaa products, never this
one, so no hand-picked rail or override is left pointing at a cut row.

**`data/products.json`** — republished.

## Verification

```
HEAD published count (before, correct base): 19102
after this republish:                        19101   (delta -1, expected -1)

removed:        [elaa-the-label:7326907990149]
added:           []
content changed: [losyana:8573922246981]   (garment "set", forcedLane "layering-basics",
                                             forcedLayeringSubtype "prayer-set")
```

By id, not array index — `interleaveByBrand` reshuffles the whole catalogue on any
single-product change (§8).

Suite: `66 files, 1176 tests passed`.

## Notes / follow-ups

- **The tidy-up `lib/specialty.ts`'s own comment defers is still deferred.** `ForcedLane` has
  no `'modest-hijabs'` member, so `forcedLayeringSubtype: 'prayer-set'` is what moves prayer
  sets to Hijabs & Scarves rather than a direct `forcedLane` pointing there — this entry
  follows the same pattern as the 22 that came before it, not a new workaround.
- Not yet pushed to `staging`/`main` — bundling with whatever else is in flight.
