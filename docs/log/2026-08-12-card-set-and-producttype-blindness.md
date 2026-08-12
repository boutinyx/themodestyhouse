# Fix: bare "card" vocabulary gap, and product_type was never actually read
**Date:** 2026-08-12 · **Status:** done

## Goal
After the overnight audit was reported "done," Tina looked herself and found a card set
still live in the directory — direct evidence the audit wasn't as thorough as claimed.

## What was found
- `"Chana Blank Card Set"` (Ria Miranda) — literal stationery, `product_type: "Accesories"`.
- `"New Year Preload Card — Prepare for a Mindful Ramadan"` (Mariam's Collection) — a
  top-up/gift card. Its title has no "gift" in it anywhere; its `product_type` is literally
  `"gift card"`.

Investigating the second one surfaced something bigger: `lib/nonApparel.ts`'s `VetoInput`
type has always declared `productType`/`tags` as accepted fields, and `verdict()` in
`build-data.mjs` has always passed them in (`...(p.raw || {})`) — but a grep of the whole
file confirmed **neither field was ever referenced in any of the actual matching logic**.
Every check — TIER_0 through TIER_B, PROTECT, the fabric/motif descriptor logic — only ever
looked at `title`. The parameters were accepted and silently discarded, for the entire
lifetime of this file.

## What changed
- `lib/nonApparel.ts`:
  - Added bare `cards?` to TIER_B (`care` category), alongside `notebooks?|journals?|stationery|bookmarks?`.
  - Added a `product_type` check against **TIER_0 only** — absolute, position-independent
    rules, already validated with zero false positives against 13,435 real titles, so safe
    to apply to a short merchant-set category string too. Deliberately **not** `tags`:
    already measured earlier this session that tags are full of unrelated marketing/promo
    noise ("free-gift-eligible", "gift for women") that would reintroduce exactly the
    false-positive class this file exists to prevent.
- `lib/nonApparel.test.ts`: both real titles added to `MUST_DROP`; a dedicated test proves
  the `product_type` path itself works (a title with zero textual signal, `product_type:
  "gift card"`); a dedicated test proves `tags` are still deliberately ignored.

## Verification — the part that actually matters here
Tested against what the real pipeline evaluates (**raw, untranslated title + raw
`product_type`**, matching `verdict()`'s exact inputs), not the translated/published title.
Testing against the translated title first showed **10 "newly rejected" items**, which
would have been a bad regression — but 8 of those were already-reviewed real garments
(Manzaram's tie-belt set, two Beyza items, six Nihan "Kap" quilted coats) that only look
suspicious in English translation. Confirmed two of the Nihan ones aren't false alarms by
fetching the actual product pages: 115cm leather coats, breadcrumbed under "Dış Giyim"
(Outerwear), not bags. Against the real (raw-title) pipeline inputs, only the 2 genuine
misses get caught — 0 false positives.

Also ran a different kind of sweep, since another keyword guess clearly wasn't enough:
extracted the rarest "last word" of every published title (1,176 words occurring ≤3 times
across the whole catalogue — one-off items hide in exactly this long tail, not in common
categories) and checked it against a broad everyday-object vocabulary (furniture, kitchen,
tools, electronics, stationery). Came back clean.

```
$ rm tsconfig.tsbuildinfo && npx tsc --noEmit    (clean)
$ npx vitest run                                  546/546 passing
$ npm run build:data                              published 23028 -> 23026, no guard trip
$ npm run build                                    clean
```

## Notes / follow-up for CLAUDE.md
Added to the mistakes log (§10) — the general lesson (a function accepting a parameter
that's silently unused, and reporting "done" without independently re-verifying) is worth
keeping visible for future sessions, not just fixed here.
