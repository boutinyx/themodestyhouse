# Opened up the scrim on the "Apply for the seal" band
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina, with a screenshot of the band as shipped earlier today: *"can we get the
background picture more visible so the purple satin"*.

## What changed
`app/page.tsx` — one line, the scrim gradient over the satin photograph:

```
- linear-gradient(to right, rgba(68,25,67,0.95) 0%, rgba(68,25,67,0.78) 55%, rgba(68,25,67,0.50) 100%)
+ linear-gradient(to right, rgba(68,25,67,0.88) 0%, rgba(68,25,67,0.76) 62%, rgba(68,25,67,0.05) 100%)
```

Three moves, and the middle one is the one that matters:

- **Mid stop 55% → 62%.** The copy column ends at **56.5% of the viewport at
  1440** (measured, not assumed). Everything to the right of it can go nearly
  clear without touching a single text pixel — so the tail drops 0.50 → **0.05**
  and the whole right-hand fold is now actually a photograph rather than a hint.
- **Left 0.95 → 0.88**, so the weave reads behind the type as well.
- The comment above the div carries the new measurement table.

## Verification — the harness first, then the change
Same method as the first pass: render the band, hide the content, sample the
**brightest** pixel inside each text element's own rect, compute WCAG contrast
against the three colours actually used. Two differences worth noting: it ran
against the **live staging render** (`https://themodestyhouse-staging-production.up.railway.app/`,
which serves `seal-band-satin-1440.webp`), and it was **validated before it was
believed** (§10.28 rule 1) —

- Re-measuring the *shipped* gradient reproduced the committed numbers to the
  second decimal: `heading 7.74 · steps 6.24 · numerals 5.87`.
- The known-bad control, flat 0.62, still comes back **4.03 FAIL** on the step
  text, matching the 4.06 recorded in the first pass.
- A deliberately absurd control, flat 0.05, fails everything (1.58 / 1.20 / 3.94).
- Stylesheet-loaded assertion on every page before any pixel is read (§10.24).

One correction found while validating: my first cut measured the steps against
the `<span>` rect (text only) and got 7.16 where the log said 6.24. The original
had measured the whole `<li>` — the wider, more conservative box. Kept the `<li>`
so the numbers stay comparable, and reported both.

Worst case across **390 / 820 / 1440**, AA threshold 4.5:

| scrim | heading | steps | numerals | |
|---|---|---|---|---|
| .95/.78/.50 @55% | 7.74 | 6.24 | 5.87 | *previous* |
| .90/.70/.30 @55% | 6.24 | 5.13 | 5.73 | pass |
| .95/.80/.05 @62% | 5.43 | 6.82 | 5.91 | pass |
| **.88/.76/.05 @62%** | **5.38** | **6.11** | **5.73** | **pass ← shipped** |
| .85/.72/.05 @62% | 5.31 | 5.52 | 5.66 | pass |
| *flat 0.62* | *5.25* | ***4.03*** | *5.18* | *FAIL (control)* |
| *flat 0.05* | *1.58* | *1.20* | *3.94* | *FAIL (control)* |

Per width for the shipped value: `390 5.38 / 6.54 / 5.73` ·
`820 7.72 / 6.57 / 5.76` · `1440 7.74 / 6.11 / 5.73`.

**The binding case is the heading at 390**, not the desktop view — on a phone the
copy is full-width and runs into the light tail. That is what stops this going
lighter still, and it is why the ramp cannot simply be flattened.

- `npx tsc --noEmit` exit 0 · `npx eslint app/page.tsx` exit 0.
- Band screenshotted at 1440 and 390 for each candidate before choosing.

## Notes / follow-ups
- Only the gradient changed. The image, the variants and `.aubergine-band`
  (which `/about` shares) are untouched.
- The measurement scripts were scratch, run from the repo root so they could
  resolve `playwright`, and removed afterwards.
