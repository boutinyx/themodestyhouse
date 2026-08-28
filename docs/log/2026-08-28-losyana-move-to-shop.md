# Losyana moved to losyana.shop, with the affiliate code wired in
**Date:** 2026-08-28 · **Status:** done — awaiting Tina's curation pass

## Goal
Tina: *"okay were going forward with the shop add the ones that are the same change the
pictures. add new ones to replace the ones that we couldnt find. then put in the affiliate
evrywhere & then you put all the items in curate/staff and i will check them."*

Follow-on from `2026-08-28-losyana-affiliate-wrong-store.md`: her GoAffPro code is issued on
`losyana.shop`, and every product we published pointed at `losyana.nl` — a different Shopify
store where the code sets nothing.

## What the comparison said, before deciding

`losyana.nl` 807 products · `losyana.shop` 1001 · **zero shared Shopify ids**. Of the 622
Losyana products we published:

```
the SAME item (title or handle)   398   64.0%
same range, different colourway   175   28.1%
  ------------------------------------------
range exists on .shop             573   92.1%
nothing like it on .shop           49    7.9%
```

An earlier pass reported 224 missing. That was wrong and worth recording: `.nl` lists plain
**"Tenerife"** where `.shop` lists **"Tenerife – white"** and **"Tenerife – ivory"**. Spot
checks found Instant Hijab (11 on `.shop`), Vela Jersey (23), premium khimar set (20) all
present as ranges. Matching on the exact title understated availability by 28 points; only
matching on the base name before the dash gave the real figure.

## What changed

**`data/brands.ts`** — `homepage` and `feedUrl` to `losyana.shop`. Currency stays EUR,
confirmed from the storefront's own `priceCurrency` rather than assumed.

**`lib/affiliates.ts`** (new) — hostname → affiliate query params, `losyana.shop` →
`{ref: 'dsgnnfgp'}`. A separate file rather than a field on `data/brands.ts` because
`withUtm()` runs in client components, so anything it imports is bundled and shipped;
importing 112 brand records with their `description` prose to read one field is Invariant
16's mistake in a new place.

**`lib/outbound.ts`** — `withUtm()` applies affiliate params **before** its `utm_source`
early return. That return exists so we never overwrite someone else's campaign tag, which
is a rule about attribution; whether we get paid is a different question. Existing keys are
never overwritten, and a URL we do not touch is still returned byte-identical.

**`lib/edits.ts`** — ten hand-picked ids re-picked (see below).

## The re-ingest

`ALLOW_LARGE_DIFF=1 npm run refresh -- losyana`. The override is required and expected: every
id changes at once, so `brandDropViolations` sees the brand lose 100% of its rows.

```
fetched 871 | +871 new | 0 updated | -775 delisted | 0 filtered | 0 returned
Published 18917 products across 109 brands
```

871 of the feed's 1001 survive `normalizeProduct` (the rest lack an image, hit `EXCLUDE`, or
tag as `garment: 'other'`); 826 of those publish after exclusions, stock and the non-apparel
veto. The 775 `.nl` rows are **delisted, not deleted** — Invariant 12, reversible.

**"Change the pictures" needed no separate step.** Images are chosen by `pickImage()` at
ingest and frozen on the raw row (§8), so re-ingesting from `.shop` replaced every image
with that store's own photography as a side effect of the fetch.

## What the tests caught that I had not

`lib/edits.test.ts` failed: `jersey-hijabs` and `fall-essentials` hand-pick Losyana products
by id, and ten of those ids no longer existed. This is the cost of an id change that no
amount of reading the diff would have surfaced — the edits are hand-curated and nothing else
references them.

Six of the eight `fall-essentials` picks found the **identical colourway** on the new store
(Instant Hijab olive / army green / bordeaux, Vela Jersey bordeaux / pistachio, the legacy
shirt olive). Four could not and are marked inline as placeholders for Tina:

| was | now | why |
|---|---|---|
| Premium Jersey – sky blue | Premium Jersey – Platinum | the new store stocks nine plain Premium Jerseys, not one is blue |
| Vela Jersey – light beige | Vela Jersey – taupe | nearest of the 19 Vela Jerseys |
| Instant Hijab – coffee | Instant Hijab – cappuccino | no coffee in the range |
| Vela Jersey – espresso | Vela Jersey – coffee | no espresso in the range |

**Two further failures were NOT from this change.** `zahraa:7389671391319` (Yusra Knit Pant –
Taupe) and `les-atelier:15725952008565` (Nora Modal Longsleeve Cacao Brown) were already
dead at `origin/main`: 328 picks, 2 unresolvable, verified by running the same assertion
against `git show HEAD:lib/edits.ts` and `HEAD:data/products.json`. **`lib/edits.test.ts` was
already red on main.** Both re-picked to the nearest survivor to get the gate green, marked
inline as pre-existing and as placeholders.

## Verification

**Affiliate, on rendered pages, with controls** — the assertion is by HOST, not by count. A
first version asserted "all 7 outbound links on a Losyana product page carry the ref" and
failed at 1/7; the other six were *related products from other brands*, which correctly must
not carry it. The check was wrong, not the code.

```
saw 2 losyana.shop links, all tagged
saw 19 other-brand links, none tagged
/designers/losyana — 25 outbound links, 25 carry ref=dsgnnfgp, 0 point at losyana.nl,
                     all keep rel="...sponsored"
/designers/veiled  — 25 links, 0 carry a ref        (negative control)
```

Sample: `https://losyana.shop/?ref=dsgnnfgp&utm_source=themodestyhouse.com&utm_medium=referral&utm_campaign=directory&utm_content=brand-page`

**Data** — 826 published, `{"losyana.shop": 826}` hosts, 0 on `losyana.nl`. Images from the
`.shop` CDN.

**Suite** — `npx tsc --noEmit` 0 · `npx eslint .` 0 · **939 tests pass** (6 new in
`lib/outbound.test.ts`, including the negative control that `losyana.nl` is NOT tagged and
that an existing `ref` is never overwritten) · `npm run audit:outbound` ALL PASS.

## What Tina sees in /staff/curate

Both routes reach the new items, because the curate list reads **published** products —
which is why they default to `keep` and publish before review rather than after:

- **Recently added** — 909 items with `firstSeen: 2026-08-28`, of which **826 are Losyana**
  (the rest are that day's ordinary arrivals across 19 other houses).
- **Review a brand** → type `losyana` — all **826**.

## Notes / follow-ups
- The 49 products with no counterpart on `.shop` are gone from the site: the premium linen
  pants and blazer, opera blazer, Amalfi Linen Dress, Costa Mare Set, Fringles Linen Abaya,
  satin poésie, denim pants, Dubai Kimono.
- The four placeholder edit picks and the two pre-existing ones are Tina's to confirm.
- `losyana.nl` rows are delisted, not deleted, so the move is reversible by pointing
  `data/brands.ts` back and re-running the refresh.
