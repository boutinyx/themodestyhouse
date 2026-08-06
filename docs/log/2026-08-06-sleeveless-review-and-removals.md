# Sleeveless audit — review tool, and 2 removals
**Date:** 2026-08-06 · **Status:** done

## Goal
Owner request: find sleeveless items in the directory and provide a way to review which ones
to delete.

## What was found
96 published products whose **title** names them sleeveless (`sleeveless|tank|cami|camisole|
halter|strapless|spaghetti|racerback|tube top|bandeau|singlet|vest top`, plus `sans manches`
and `mouwloos` for the French and Dutch feeds).

- By garment: dress 62 · top 24 · abaya 4 · hijab 4 · trousers 1 · set 1
- By brand: merrachi 42 · mariams 20 · veiled 16 · fares 6 — 84 of 96 in four brands
- **20 of the 96 read as layering pieces** ("Sleeveless Underdress", "Inner Tank Top",
  "Sleeveless Layer", "Seamless Slip Dress"). Worn under an abaya or shirt, so they are
  wardrobe staples rather than curation misses. Flagged separately in the tool rather than
  lumped in with the rest.

## The review tool
Built as an Artifact first; Tina has no access to claude.ai, so it was rebuilt as a
**standalone local file**: `sleeveless-review.html` at the repo root, opened with `open
sleeveless-review.html`.

All 96 thumbnails are inlined as base64 (downscaled to 320×420 with `magick`, ~10 KB each,
1.47 MB total), so the page makes **zero external requests** and works with no server and no
network. Marks persist in `localStorage`; "Copy the list" emits the chosen product ids as
JSON. Styled from the house tokens in `globals.css`.

Added to `.gitignore` — 1.5 MB, regenerable, and untracked-but-unignored files are the
`git add -A` hazard §8 warns about.

## Outcome
Tina reviewed and marked **2 of 96** for removal:

| id | item |
|---|---|
| `zora:9157154472099` | The Dreamgirl Halter Neck Top in Ballerina |
| `chi-ka:8236804014241` | Travel Set : Sleeveless Long Jacket and Pants in Blue Jacquard Satin |

Added to `data/exclusions.json.ids` (8 → 10). Per **Invariant 3** this is the permanent path:
a `cut` in `decisions.json` would be overwritten by the next ingest of that brand, whereas
exclusions re-apply on every rebuild.

The other 94 were kept — so the sleeveless keyword is **not** on its own grounds for removal
in this catalogue, which is worth remembering before anyone proposes a bulk rule.

## Verification
```
$ npm run build:data
│ id-pin │ 2 │
Published 10137 products (mixed across 55 brands) | rejected 3043 | review 13

zora:9157154472099   | on site: no | rejected as: id-pin
chi-ka:8236804014241 | on site: no | rejected as: id-pin
published total: 10137 (was 10139 — exactly 2 fewer)

$ npx vitest run   331 passed (14 files)
```

## Notes / follow-ups
- **Detection is title-only.** A sleeveless product whose title does not say so — "Layla Midi
  Dress" — is not in the 96. Product descriptions would close that gap; that pipeline was
  built and reverted on 2026-08-05
  (`docs/log/2026-08-05-product-pages-and-descriptions.md`), and the sanitised description
  text is the input a complete audit would need.
- The 20 layering pieces were all kept. If a sleeveless rule is ever automated, it must
  exempt `under|inner|slip|layer` or it will delete legitimate stock.
