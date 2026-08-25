# Designer Discovery — revisions after first look
**Date:** 2026-08-25 · **Status:** partial (one item held for Tina — see Notes)

## Goal
Tina, reviewing the band on staging, asked for eight changes. Seven are done; the
eighth is ambiguous and is held rather than guessed at (§10.29).

## What changed — `components/DesignerDiscovery.tsx`

1. **Index numbers removed.** *"you can put the 01 02 03 04 05 out ust keep the
   place"* — the row is now name + count. Rows read `Europe 56`, `North America 27`,
   `Middle East 20`, `Asia 5`, `Oceania 5`.
2. **Rows made taller.** `minHeight` 60 → **84px**, padding 18 → 26px.
3. **Five houses, then "see all".** *"lets just show 5 when you open it up and a
   button with see more. because else its too long."* `PREVIEW = 5`; the button
   reads **"See all 56 in Europe"** rather than a bare "See more", so the row never
   hides an unknown quantity, and toggles back to "Show fewer". `showAll` resets
   whenever a different region opens, so it never carries over.
4. **"Designer discovery" eyebrow cut.** The heading says what the band is.
5. **Copy centred on phone.** `items-center text-center lg:items-start lg:text-left`.
   `items-center` is what actually centres the CTA — a flex child ignores
   `text-align` — and `mx-auto` does the same for the capped paragraph measure.
6. **Space between the map and the rows.** 96px at desktop, 64px on a phone.
7. **Map more visible and longer.** Two parts: the map track went
   `1.25fr` → **`1.62fr`** (790px wide at 1440, was 664), and the asset itself was
   regenerated darker and denser.

## New asset: `public/world-dots-v2.svg`
v1 was `#cfc4ae` at 3.2° / r2.2 and read as faint texture. v2 is **`#bcab8d` at
2.7° / r2.4** — 2,078 dots, 70.2 KB raw, **5.5 KB gzipped**. That colour sits
between `--hairline` (#e4ddcf) and `--muted` (#8a7d6b), so the map is legible
without competing with the aubergine pins drawn over it.

**A new filename, not an overwrite** — §6. `public/` is not fingerprinted and
Railway serves it with `max-age=14400`, so new bytes at the old path would be
invisible for four hours to anyone who already loaded the page (§10.21). v1 is
left on disk; it is unreferenced and can be deleted once v2 has been live a day.

## The bug in the middle of this
Item 6 did not work on the first attempt, and the reason is worth keeping:

```jsx
<ul className="mt-16 md:mt-24" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
```

**An inline style beats a class**, so `margin: 0` silently cancelled the `mt-24`
sitting beside it on the same element and the rows stayed flush against the map —
the exact gap being asked for. Nothing errors; the class is simply inert.
Measured `marginTop: 0px` before, `96px` after. Now `marginBottom: 0`, since
Tailwind's preflight already zeroes a `ul` and only the bottom edge needed the
reset.

Caught by measuring the gap rather than looking at the screenshot and assuming the
class had applied — the rendered result was "no gap", which is indistinguishable
from "I forgot to add the margin".

## Verification
```
$ npx tsc --noEmit                     TSC=0
$ npx eslint components/DesignerDiscovery.tsx   LINT=0   (0 problems)
$ npm test                             Test Files 47 passed · Tests 753 passed
```

Read out of a real Chromium render at both widths, not from the source:

| | 1440 | 390 |
|---|---|---|
| row text | `Europe56` … (no index) | same |
| row height | **84px** | **84px** |
| map width | **790px** | 326px |
| eyebrow present | no | no |
| heading `text-align` | `left` | **`center`** |
| map → rows gap | **96px** | **64px** |
| houses shown on open | **5** | **5** |
| button | `See all 56 in Europe` | same |
| after clicking it | **56** shown, button → `Show fewer` | same |

An eslint warning (`'i' is defined but never used`) appeared when the index was
removed and was fixed, not suppressed — the file is at 0 problems.

## Notes / follow-ups
**HELD — item 8.** Tina: *"and change this one into the one we had that says
Houses that just earned the seal. Every label here has passed our review for craft
and design, freshly stamped and added to the house. All designers"*.

That copy is `components/VerifiedSpotlight.tsx:33-45`, which is already live on the
homepage above this band. "This one" has more than one referent and the readings
lead to materially different work:
  (a) swap this band's heading/copy/CTA for the seal wording;
  (b) replace the `VerifiedSpotlight` section with this band;
  (c) just relabel this band's CTA "Explore all designers" → "All designers".

(a) contradicts item 5, where she asked for *"Independent labels. / Global
perspectives. / 113 houses across 39 places…"* to be centred on phone — i.e. that
copy stays. §10.29 is exactly this trap: an ambiguity about a previous state feels
like something you can look up, and the repo holds every past state equally.
Asked rather than picked.

---

## Item 8, resolved — the Verified Spotlight section is replaced
**Status of this file is now: done.**

Asked Tina which of the three readings she meant. She chose **(b): remove the
`VerifiedSpotlight` section and let the Designer Discovery band stand in its
place.** Worth recording that the ambiguity was real — the reading I would have
guessed (c, just relabel the CTA) was not the one she meant, and (a) would have
deleted copy she had asked me to centre four sentences earlier.

### What changed
- `app/page.tsx` — `<VerifiedSpotlight houses={rail.slice(0, 8)} />` unmounted,
  along with its import and the now-dead `const rail = newlyVerified()`.
- `lib/houses.ts` — `newlyVerified()` has **no callers at all** now. Left in place
  with a docstring saying so, rather than deleted, so remounting is one line.
- `components/VerifiedSpotlight.tsx` — **kept, not deleted.** It is a whole layout
  with its own `<style>` block and nothing else on the site resembles it. Zero
  imports now, the same state `components/EditMagazine.tsx` is in (§8).
- Two comments in `app/page.tsx` that asserted things about the spotlight were
  corrected rather than left to rot — one in the heading-size note, one in the
  Edit-banner placement note.

### Resulting homepage order, read out of the DOM
```
Every modest brand. One place.              (hero)
Popular items from brands.
Jersey Hijabs                               (edit banner)
Everyday Lace                               (edit banner)
By category.
Independent labels. Global perspectives.    <- Designer Discovery
Are you a modest fashion house? Apply for the seal.
Reading, not just shopping.
```
This matches the preview she selected exactly. Note the band sits **after** "By
category", which is where it already was — removing the spotlight is what moved it
up the page. If she wants it in the spotlight's literal old slot (before "By
category"), that is a one-line move.

### What went with the spotlight
It was the only place on the homepage carrying the seal copy, and it held an
"All designers" link. Neither is lost outright: `<DesignerDiscovery>` has its own
`Explore all designers` → `/designers` (verified: exactly one such link in `main`),
and the aubergine "Apply for the seal" band still explains the standard. But the
homepage no longer *shows* which houses are newly sealed — that is a genuine
editorial change, not just a layout one, and is Tina's call.

### Verification
```
$ npx tsc --noEmit                          TSC=0
$ npx eslint app/page.tsx lib/houses.ts     LINT=0
$ npm test              Test Files 47 passed · Tests 753 passed
```
From a real Chromium render: `.tmh-verified-sec` is absent, the string "Houses that
just earned the seal" no longer appears anywhere in `document.body.innerText`, the
heading order is as above, and there are **no console errors**. Screenshotted the
junction where the section used to be — the Edit banner runs straight into "By
category" with no gap or orphaned rule.
