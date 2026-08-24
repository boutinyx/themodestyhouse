# Homepage section headings reduced 44px → 34px
**Date:** 2026-08-24 · **Status:** done

## Goal
Tina, pointing at the rail heading: *"Popular items from brands. the titles like
these need to be smaller."*

## What changed
`app/page.tsx` only — font size, nothing else. All **four** homepage section
headings moved together so they stay a matched set rather than the named one
drifting out of step with its siblings:

| heading | before | after |
|---|---|---|
| Popular items *from brands.* | `clamp(28px,4vw,44px)` | `clamp(24px,3vw,34px)` |
| By category. | `clamp(28px,4vw,44px)` | `clamp(24px,3vw,34px)` |
| Are you a modest fashion house? *Apply for the seal.* | `clamp(28px,4vw,46px)` | `clamp(24px,3vw,36px)` |
| Reading, not just *shopping.* | `clamp(28px,4vw,44px)` | `clamp(24px,3vw,34px)` |

44 → 34 on desktop (−23%), 28 → 24 at the phone floor (−14%). The band heading
keeps its existing +2px relationship to the other three. `lineHeight`, colour,
alignment and every surrounding class are untouched. A comment above the first
of the four records the change and lists the others.

**Deliberately NOT changed** — two headings that render at
`clamp(40px,5.6vw,64px)` from their own components' raw `<style>` blocks:
`VerifiedSpotlight`'s "Houses that just earned the seal." and `EditBanner`'s edit
title ("Everyday Lace" at the time of writing). Those are a larger display tier
on full-bleed editorial bands, not members of this set. Raised with Tina rather
than swept in, since shrinking the four makes those two proportionally more
dominant than they were.

## Verification
```
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
TSC=0
$ npx eslint app/page.tsx
LINT=0
$ npm test
 Test Files  46 passed (46)
      Tests  739 passed (739)
```

Computed `font-size` read off every `main h2` in a real Chromium render of the
running dev server at 1440x900 (Playwright), after the change:

```json
[
 { "text": "Popular items from brands.",              "px": "34px" },
 { "text": "Everyday Lace",                           "px": "64px" },
 { "text": "Houses that justearned the seal.",        "px": "64px" },
 { "text": "By category.",                            "px": "34px" },
 { "text": "Are you a modest fashion house? Apply…",  "px": "36px" },
 { "text": "Reading, not just shopping.",             "px": "34px" }
]
```

That output is also the evidence for the "not changed" note above — the two 64px
entries are the ones left alone, and they are visible in the same measurement
rather than asserted from reading the source.

Screenshotted the Popular Items, By category and Reading sections at 1440: the
heading is clearly smaller and sits closer to the rail beneath it, with no
wrapping or collision introduced at that width.

**Not run:** `npm run build`. Another session has `next dev` live on :3000 and a
production build would overwrite the shared `.next` under it (CLAUDE.md §10.28
rule 4).

## Notes / follow-ups
- No size was specified, so 34px is a judgement call — one clear step down rather
  than a timid one. Trivial to nudge further in either direction; it is a single
  `clamp()` repeated four times.
- Not checked at every breakpoint. `npm run audit:visual` (9 widths x 2 engines)
  would cover it properly, but it needs a production build, which is blocked by
  the shared `.next` above. Worth a run next time the tree is free.
