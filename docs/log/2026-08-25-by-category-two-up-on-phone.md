# "By category" goes two-up on a phone (and I fixed the wrong thing first)
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina: *"in my iphone the catagories are in one big line can we fix that"*, then,
after my first attempt: *"still nothing. do you think if we put the pictures in
the ratio the images on the homepage it'll work? to put 2 2 2 next to eachother"*.

## I fixed the wrong component first
I read "categories" as the **icon strip** under the hero
(`components/CategoryQuickLinks.tsx`) and shipped a 2x2 wrap for it —
`docs/log/2026-08-25-category-strip-wraps-on-phone.md`. That was a real bug (it
was a horizontal scroller hiding Hijabs entirely off-screen at 390px) and the fix
stands, but it was not what she was looking at.

The word "pictures" in her second message is what settled it: the icon strip has
no pictures. She meant the **"By category" photo grid**, and "2 2 2" is six
cards — which is exactly `CATEGORY_SHOWCASE`'s length, not the strip's four.

**What I should have done:** asked which of the two she meant before building
anything, since the homepage has two things a person would call "the
categories" and only one of them has pictures. Instead I picked the reading that
fit the first message and spent a round on it.

## The actual cause
`app/globals.css` had, since the grid was built:

    @media (max-width: 480px) { .tmh-showcase-grid { grid-template-columns: 1fr; } }

So on any phone the six cards became a **single column** — each nearly a full
screen tall at the `3 / 4.4` card ratio, so the section read as an endless
vertical line. That is the "one big line".

## What changed
The `max-width: 480px` single-column rule is gone. Two columns now hold all the
way down; the `max-width: 820px` 3→2 step is untouched.

**Her other suggestion — changing the picture ratio to make two fit — turned out
not to be needed**, and that was measured rather than assumed: at 390px each card
is 188px wide and 337px tall including its caption, which is comfortable. So the
`3 / 4.4` ratio stays and phone and desktop remain one design.

## Verification
Both engines, four widths, from a detached worktree on port 3213 (the shared
`.next` had been clobbered repeatedly by a concurrent session — §10.28 rule 4):

| width | columns | rows | card | page h-overflow |
|---|---|---|---|---|
| 390 | 2 | 3 | 188x337 | 0 |
| 375 | 2 | 3 | 181x326 | 0 |
| 820 | 2 | 3 | 375x612 | *pre-existing, see below* |
| 1440 | 3 | 2 | 381x621 | 0 |

Chromium and WebKit identical at every width. `npx tsc --noEmit` clean,
`npm run lint` clean, 781 tests pass.

## Notes / follow-ups
- **The `SHOP …` overlay labels are tight, but they do fit.** My first check
  flagged three as "CLIPPED"; the threshold was wrong — it treated "within 4px of
  the card edge" as clipping. Re-read against the actual bounds: at 360px,
  "Shop Co-ord Sets" is 170px in a 173px card and "Shop Activewear" 172px in
  173px. Inside, but with 1–3px of clearance, so a longer category label in
  future WILL clip. Not changed here; worth a `clamp()` on
  `.tmh-showcase-shop`'s font-size when someone next touches it.
- The 73–121px horizontal page overflow at 820px is the footer, not this grid
  (the grid's own `scrollWidth` equals its `clientWidth`). Confirmed pre-existing
  by running the same audit against **production** earlier today, which
  reproduces it identically.

## Follow-up — whitespace at the right screen edge

Tina, with a screenshot of the working 2x2 grid: *"its working now but im missing
some whitespace on the right side"*, and, asked which whitespace she meant, *"on
the right side of the screen edge"*.

**Measured her own screenshot rather than an emulator**, because "the right side
looks tighter" is exactly the kind of claim an emulated viewport can get wrong.
Sampling the JPEG (1179x2556 — iPhone 14/15 Pro, 393pt at 3x) for the first and
last non-background pixel across two rows:

    row y=1000: card block x 12..1169 -> left 12px, right 9px   (device px)
    row y=1900: card block x 12..1166 -> left 12px, right 12px

i.e. **4pt each side, already symmetric** — the 9 vs 12 is the yacht photo's own
bright content reaching nearer its edge, not a layout difference. Confirmed
independently against staging in WebKit at 393pt: section padding `4px / 4px`,
grid gaps 4 and 4, and every `SHOP …` label centred to within 0.1px in its card.

So this is not a bug being corrected. It is more room on the right because she
asked for it, and the result is deliberately asymmetric on phones:

    px-1 md:px-8   ->   pl-1 pr-4 md:px-8

The left stays at 4px on purpose. She asked for the opposite in August — *"they
need to be also less space ont he edges of the screen"* — which is why this was
`px-1` at all, so widening both would have walked that back without being asked.
`md:` and up is untouched.

After, both engines: phone `left 4 / right 16`, cards 184px, no document
overflow; desktop `142 / 142`, cards 381px — unchanged.

**Likely what she was actually reacting to**, worth recording since it is
untouched: in the right-hand column "SHOP CO-ORD SETS" has only **6.3px** of
clearance inside its card while "SHOP DRESSES" opposite it has **31.3px**, so
that side reads jammed regardless of the page margin. She was offered a fix for
the labels and chose the screen edge instead.

### And 16px was too much

*"now its too much."* `pr-4` -> `pr-2`, i.e. 16px -> 8px.

Then *"1px more"* — `pr-2` -> `pr-[9px]`.

The useful thing to record is the bracket, not the number: **4px read as none,
16px as too much, 8px close, 9px right.** Landed by eye across three passes, so
it is not a value to round off or tidy later, and the comment in `app/page.tsx`
says so.

`pr-[9px]` is an **arbitrary value on purpose** — Tailwind's scale steps 8px to
12px, and she asked for one pixel. Snapping it back onto the scale would undo the
last round.
