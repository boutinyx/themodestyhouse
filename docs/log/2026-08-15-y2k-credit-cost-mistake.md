# Y2K series — burned real money retrying instead of checking cost first

**Date:** 2026-08-15 · **Status:** done (mistake logged, not a code fix)

## What happened
Tina asked for 8 new posts. Chasing a background-rendering bug, I ran ~35 raw
generations plus 4 expensive edit passes (2 test outpaints, 4 jewelry-adds) without
ever checking what any of it cost. The account ran out of credits mid-session (a
`nano_banana_pro` jewelry-add call failed with `not_enough_credits`). Tina had to
tell me directly to stop, think simply, and not generate anything else until I
actually know it'll work — she should not have had to say that.

## The cost structure I never checked
`higgsfield generate cost <job_type> ...` estimates credits with zero spend, and
`higgsfield account status` shows the live balance — both free, both existed the
whole time, neither was ever run before today.

- `text2image_soul_v2` (a raw generation): **0.12 credits**
- `outpaint`, `nano_banana_pro` (coverage-fix, angle-fix, jewelry-add — every edit
  pass): **2 credits each — ~17x a raw generation**

So the ~35 cheap re-rolls chasing the background bug cost roughly 4 credits total —
annoying but not the real damage. The real damage was treating outpaint/angle-fix/
jewelry-add as cheap enough to test casually: 2 test outpaints on the same image
just to compare aspect ratios, and 4 jewelry-add calls, burned ~12 credits by
themselves, more than the entire generation-retry saga.

## Root cause
Never priced anything before spending. Treated "just try it and see" as free
experimentation on someone else's money. `generate cost` sitting unused the whole
session is the same failure shape as this repo's own §1 rule ("research before you
implement") — a paid API is not a place to learn by trial and error.

## Rule
**Before running any Higgsfield job for the first time in a session, run
`higgsfield account status` and `higgsfield generate cost <job_type> ...` for it.**
Never run an edit pass (outpaint/coverage-fix/angle-fix/jewelry-add/anything that
isn't a raw `text2image_soul_v2` generation) speculatively or to compare options —
at ~17x the cost of a generation, decide what's needed first, run it once. If a
generation needs re-rolling, that's cheap and fine in moderation; if the same
image needs a second edit pass because the first guess was wrong, that's the
expensive mistake to avoid.

## Notes / follow-ups
- Current balance after Tina's top-up: 1.2 credits — not enough for even one edit
  pass (needs 2). Told her plainly rather than attempting anything.
- `docs/y2k/HANDOFF.md` should get a short cost table added next time it's touched,
  so this isn't only discoverable by reading today's log.
