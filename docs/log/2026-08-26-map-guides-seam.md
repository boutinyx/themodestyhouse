# The gap between the map and the guides
**Date:** 2026-08-26 · **Status:** done (staging)

## Goal

Tina: *"make space between map & guide smaller"* — the seam between the Designer
Discovery map band and the editorial cards below it.

## Measured first

The two sections sit flush (`gap_section_boxes: 0`); the space is entirely their
own padding meeting:

```
            map section pb   guides pt   last region row -> feature card
phone       40px             40px        81px
desktop     80px             80px        217px
```

Desktop's extra ~57px is the guides section's own "All stories" row plus its
`mb-8` — that row is desktop-only, which is why the two numbers are not simply
double.

## What changed

Both sides of the seam halved, so neither block ends up lopsided:

- `components/DesignerDiscovery.tsx` — `py-10 md:py-20` → `pt-10 md:pt-20 pb-5 md:pb-10`
- `app/page.tsx` (the Edit section) — `py-10 md:py-20` → `pt-5 md:pt-10 pb-10 md:pb-20`

Only the facing edges moved. The map's top padding and the guides' bottom padding
are untouched — the gap above the map and below the cards was not the complaint.

```
            before   after
phone       81px     41px
desktop     217px    137px
```

## Two slips, both mine, both caught

**1. A JSX comment where JSX cannot go.** The note explaining the change was
inserted between `return (` and `<section>`, which makes two children of a return
that takes one — `TS1005: ')' expected`. Rewritten as a `//` comment above the
`return`. Same family as §10.27: the comment explaining a change is code too.

Worth noting the *shape* of that failure: the build broke, so the dev server kept
serving the PREVIOUS build, and the re-measurement dutifully printed the old
81/217 numbers. A stale-but-plausible measurement is exactly what §10.20 warns
about — the numbers looked like "the change did nothing" rather than "the build
failed".

**2. An audit that reported a cliff that was not there.** The first
`audit:mobile` after the fix came back `a11y 3` (chromium) / `a11y 4` +
`overflowing 1/9` + `broken aspect 1` (webkit), including `html-has-lang` —
the `<html>` element supposedly missing a `lang` attribute.

Nothing about a padding change can remove `lang` from `<html>`, so the harness
was checked before the finding was believed: the server was healthy on the spot
(`200`, `<html lang="en-GB">`, chunks `200`), and `.next/BUILD_ID` had been
rewritten mid-run. **Another session rebuilt `.next` underneath the audit** —
§10.28 rule 4, `.next` is shared and two builds fight.

Re-run against an isolated build in a private worktree on its own port:

```
chromium  overflowing 0/9 | a11y 1 | stacked text 0 | broken aspect 0
webkit    overflowing 0/9 | a11y 1 | stacked text 0 | broken aspect 0
```

The remaining `a11y 1` is the seal band's brass pill at 3.03:1 — pre-existing and
from another session.

**The transferable bit:** while a second session is live, an audit run against the
shared `.next` is not evidence either way. Build into a worktree and serve it on
its own port, or the result is a coin toss.

## Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · build clean · gaps re-measured in
WebKit at 390 and 1440 · `audit:mobile` clean in both engines on an isolated
build.
