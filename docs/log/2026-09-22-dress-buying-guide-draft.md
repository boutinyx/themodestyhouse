# Where to Buy Modest Dresses Online — drafted, fact-checked, published to Ghost as a draft
**Date:** 2026-09-22 · **Status:** partial (draft, awaiting Tina's review to publish)

## Goal
Pulse/GSC research this session found ChatGPT is the site's #1 traffic source, and that
the two existing data-driven "buying guide" posts (`best-abaya-brands-price-tiers`,
`where-to-buy-hijabs-online`) are disproportionately what ChatGPT sends people to. Dresses
get the most ChatGPT-referred category-page traffic (21% of ChatGPT visitors land on
`/modest-dresses`) but had no equivalent guide. Tina asked for one, end to end, using
another agent for feedback if needed.

## What changed
- `content/editorial/where-to-buy-modest-dresses-online.md` — new post, same format/rigor
  as the two precedents: per-house median dress price (USD, converted from each brand's
  native currency), price bands, a real price gap separating an "everyday" market from a
  4-house "atelier" tier, a fabric-price ladder, and a maxi-silhouette note.
- Published to Ghost as **`status: draft`** (not `published`) — visible in Ghost Admin,
  invisible to the Content API / the live site / Google, until deliberately flipped.

## Methodology, and the mistake it corrects
First draft computed medians over every row with `garment === 'dress'`. An independent
fact-check subagent (full transcript in this session) caught that this is looser than what
the site itself calls a dress: `productsForLane('modest-dresses')` strips `isSpecialty()`
(swim, activewear, layering, prayer, jilbab, khimar, undercap, outerwear) before a lane
prints anything. 207 of 2,460 "dress" rows are actually underdresses/slips — one house
(AbayaButh, featured in the first draft) had **zero** real dresses on `/modest-dresses`
despite 70 rows tagged `garment: 'dress'`, all underdresses. The published version recomputes
on the non-specialty set (2,253 real dresses, 65 houses with ≥5 each, 2,209 pieces), matching
what a reader actually sees if they click through — and the corrected numbers produced a
*cleaner* story, not a worse one: the biggest price gap ($77.29, not $68.07) is now
unambiguously the largest gap anywhere in the sorted list, and CHI-KA — the single most
expensive house in the directory on abayas — lands inside the atelier tier here too, instead
of just under it, which is the reconciliation the first draft got backwards.

The same fact-check agent found and I fixed 11 other discrepancies in the first draft:
wrong "largest catalogue" attribution (was Aab, is MERRACHI), a false "priced in GBP"
claim about Inayah (its rows are native USD per Invariant 15 — `brands.ts`'s GBP is the
brand's *expected* currency, not what the feed serves), miscounted sealed/verified houses
(5, not 4 — Veiled and Summer Evenings were omitted), an inverted fabric-spread comparison,
an unstated ≥5-piece cutoff artefact (two 1-dress houses sit inside the price gap; now
disclosed, matching the abaya piece's own precedent for pre-empting that objection), and a
stale "read today" freshness claim — `data/products.json` was last refreshed **2026-09-11**,
not today; see Notes below.

## Verification
- `node scripts/ghost-import.mjs --dry` — converts cleanly, 1,616 words, no dropped words,
  frontmatter passes all checks (dek 211 chars, well under Ghost's 300-char
  `custom_excerpt` limit).
- Independent fact-check subagent recomputed every cited statistic from
  `data/products.json` + `data/fx-rates.json` + `data/brands.ts` from scratch, spot-checked
  20 product URLs, cross-referenced claims against the two precedent articles. All numbers
  in the published version are the corrected ones from that pass.
- Published to Ghost via Admin API as `draft`; confirmed the post exists at
  `https://cms.themodestyhouse.com/ghost/#/editor/post/6ab26a7db4f0b200019e3891` and does
  **not** appear in `GET /ghost/api/content/posts/slug/where-to-buy-modest-dresses-online/`
  (draft posts are excluded from the Content API by design, so `/editorial` and its
  `generateStaticParams` cannot see it — verified this is the correct mechanism to keep it
  off the live site pending review, not merely assumed).

## Addendum — cut for length
Tina, after seeing the first fact-checked draft (1,616 words): "that shit is tooooo long
somebody comes there for a reason not to read a book." Rewrote to 351 words — same verified
numbers (price bands, the $77 gap, the 4-house atelier tier, the fabric note), far less prose
per brand, no methodology essay, no separate fabric-ladder table. Shorter than either
precedent (abaya piece ~745 words, hijab piece ~1,521). Updated the same Ghost draft in place
via `PUT /posts/{id}` rather than creating a second post. Saved as a standing memory
(`feedback_editorial-length`) so future editorial drafts start short rather than getting cut
down after the fact.

## Notes / follow-ups
- **No cover image.** The two unused stock photos in `public/editorial/`
  (`silhouette.jpg`, `mirror-selfie-abayas-3.jpg`) are both abaya-styled, not dresses —
  picking either would mismatch the alt text to the actual image. Left for Tina; the post
  publishes without one (`image`/`imageAlt` are optional on `Post` and in `articleSchema`).
- **To actually publish**: flip `status` to `published` on that Ghost post (via Ghost Admin
  UI, or by re-running the create call with `status: 'published'` against the existing post
  id). Once published it's live on both `staging` and `main`/production simultaneously —
  Ghost is a single shared CMS instance behind both, and the two branches are currently at
  the same commit (`b1ff4f4`), so there is no separate "verify on staging first" step for
  this piece the way there would be for a code change.
- **Unrelated finding, worth a look**: `data/products.json`'s last refresh commit
  (`f45caa9`) is dated 2026-09-11, 11 days before this session (2026-09-22), despite
  `.github/workflows/refresh.yml` being documented as running nightly at 04:10 UTC. Did not
  investigate further (out of scope here, and this session has no `gh` auth) — worth
  checking whether the nightly refresh has actually been running.
- Reused `scripts/ghost-import.mjs`'s helpers (`scripts/lib/ghostAdmin.mjs`,
  `scripts/lib/markdownToHtml.mjs`) via a throwaway one-off script rather than editing
  `ghost-import.mjs` itself, since that script is the idempotent original-migration tool and
  its hardcoded `status: 'published'` is deliberate for that use case.
