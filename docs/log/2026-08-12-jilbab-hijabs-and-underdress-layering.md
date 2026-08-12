# Route jilbabs to Hijabs, add dress-length under-dresses to Layering Basics
**Date:** 2026-08-12 · **Status:** done

## Goal
Tina reported still seeing layering pieces and hijabs/jilbabs in `/directory`
after the earlier layering fixes. My own verification had checked `/directory`
against the live production site and found zero leaks from the vocabulary
already built — that was true, but incomplete: it didn't mean nothing was
showing, only that nothing I'd already classified was leaking. A full-catalogue
sweep (not just the brands checked so far) found two real, distinct gaps:
jilbab-titled products (never previously addressed at all — genuinely new),
and a whole dress-length "under dress"/"inner dress" layering category I'd
only been looking for at top length.

## What changed

### Jilbabs → routed to the Hijabs lane, not cut
Checked all 332 raw jilbab-titled rows: only ~106 explicitly say "prayer"
("2-Piece Prayer Set (Jilbab)"); the rest — mostly eastessence and
bazar-al-haya — use "jilbab" as a regional synonym for a normal fashion
abaya ("Denim Jacket Style Jilbab", "Corduroy Jilbab"). Presented both groups
to Tina with the recommendation to only pull the prayer ones; she overrode
that and asked for **all** jilbab-titled items routed to Hijabs & Scarves,
prayer or not.

- **`lib/specialty.ts`** — new `isJilbab(p)`, matches `\bjilbabs?\b` in the
  title regardless of garment. Folded into `isSpecialty()` so every existing
  "shop everything" surface (`browseProducts()`, homepage editor's picks,
  category cards) excludes it automatically — no changes needed to those
  files, since they already all gate on `isSpecialty()`.
- **`lib/lanes.ts`** — `modest-hijabs` lane match extended to
  `p.garment === 'hijab' || isJilbab(p)`, and given `specialty: true` (the
  same mechanism `modest-swimwear`/`modest-activewear`/`layering-basics`
  already use to be the one lane a specialty item is allowed to appear on —
  without it, `productsForLane` would strip jilbab items back out via the
  same `!isSpecialty` check that removes them from every other lane).
  Doesn't touch the `garment` field itself — a jilbab product's structured
  data still describes what it structurally is; only lane routing changes.

### Dress-length "Under Dress" / "Inner Dress" → Layering Basics
The existing `layering-basics` vocabulary was built entirely from top-length
pieces (neck covers, sleeve extenders, cropped body shirts). A full sweep
surfaced 87 raw rows across 19 brands using "Under Dress"/"Inner Dress"/
"Underdress" — a dress-length equivalent I'd never gone looking for. Checked
photos on a sample before asking Tina how to scope it: some are unambiguous
(kamin's "Ruqa Underdress" is sheer black mesh, would be immodest alone),
others read as complete standalone looks (chi-ka's $245 "Under Dress",
styled and priced like any other premium dress). She chose to move all of
them regardless of styling or price.

- **`lib/specialty.ts`** — new `UNDER_DRESS_RE` (`\bunder.?dress\b|\binner
  dress\b`), checked in `isLayering()` **gated on `garment !== 'abaya'`**.
  This is a deliberate, explained narrowing of "move all of them": of the 87
  raw rows, 37 are `garment: 'abaya'`, and every single one of those is a
  bundled multi-piece SET LISTING where "with inner dress" or "&
  Underdress" describes a component of ONE sold-together product — e.g.
  kamin's "The Shamsa Abaya & Underdress" (520 AED, a full outfit, not an
  accessory), mukistore's "2pcs Set Kimono + Underdress". Tina's examples
  during the decision (kamin's Ruqa Underdress, chi-ka's Under Dress) were
  both `garment: 'dress'` — standalone products — not these bundle
  listings, so I scoped the implementation to what she was actually shown
  rather than the literal superset of everything the text pattern touches.
  Flagging this explicitly rather than silently deciding it for her.

## Verification
```
npx tsc --noEmit          # clean
npm test                   # 33 files, 568 tests passed (13 new)
npm run lint                # 0 errors (2 pre-existing unrelated warnings)
npm run build                # 38 routes, clean
```
No `build:data` needed — this is presentation-layer routing computed at
request time from the already-published `data/products.json`, the same
mechanism `isLayering`/`isSpecialty` already used before today.

Checked against `getProducts()`/`browseProducts()`/`productsForLane()`
directly:
- 174 published jilbab items: 0 leak into `browseProducts()` or
  `/modest-abayas`; all 174 appear on `/modest-hijabs`.
- `layering-basics`: 104 → 146 (+42, the published/in-stock subset of the
  dress+skirt-garment under/inner-dress rows).
- 16 abaya-set bundle listings (e.g. "The Shamsa Abaya & Underdress")
  confirmed still correctly in `/modest-abayas`, not pulled into Layering
  Basics.
- Homepage `editorsPicks` pool: 0 jilbab leak, 0 under-dress leak.

Then re-verified end-to-end against a real `next start` production build
(not just unit-level checks): fetched `/directory`, `/modest-hijabs`, and
`/layering-basics` live. `/directory` shows 0 "jilbab" occurrences and only
the deliberately-kept abaya-set bundle titles for "under dress"/"underdress"
(one more hit, "velvet-under-dress", turned out to be a URL slug baked into
another brand's Shopify handle, not a title match — the actual product title
is "Velvet Dress Mink", confirmed via raw data, not a leak).
`/modest-hijabs` shows real jilbab titles ("Adela Two Piece Jilbab/Prayer
Set", "Almond Jilbab"). `/layering-basics` shows the new under-dress items
("The Ruqa Underdress", "LB66 Green Inner Dress", "The Rania Underdress").

## Notes / follow-ups
- `/modest-hijabs`' own intro copy ("Chiffon, jersey, satin and crinkle
  hijabs, shawls and underscarves") doesn't mention jilbabs are now also
  shown there. Left it untouched — CLAUDE.md §10.18 is explicit that
  inventing/editing page copy nobody asked for is a standing mistake to
  avoid. Flagging in case Tina wants it updated to reflect the new content
  mix; a straight prayer-set/denim-jilbab item sitting under a "Hijabs &
  Scarves" heading may read oddly to a visitor even though the routing
  logic is correct.
- Did not touch `garment` classification anywhere in this pass — both
  `isJilbab` and the under-dress addition to `isLayering` are purely
  presentation-layer lane routing, consistent with how `isLayering` has
  worked all along.
