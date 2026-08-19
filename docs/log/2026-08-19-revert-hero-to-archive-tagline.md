# Reverted the homepage hero back to "the archive for everything modest"

**Date:** 2026-08-19 · **Status:** done

## Goal
Tina, from two screenshots: "what has happened with the webiste why are
some older ui visible. we made it the archie for everyhting modesty
right." Read as: the homepage hero was showing "So this is a curator, not
a catalogue" and she expected "the archive for everything modest."

## Investigation
Nothing was reverted or broken — the hero was rendering exactly what's in
the code. The "curator, not a catalogue" copy is genuinely current: it
shipped in `9bbe0c8` ("copy: ship the seven visible changes from the
2026-08-13 batch"), whose own message says it was "written by an earlier
session and never committed. Shipped now at Tina's explicit instruction"
— i.e. a change she herself asked to ship, the same day as this report.

But the swap was only ever applied to the homepage hero (and predates it
on `/about`, unrelated — see below). It never propagated everywhere else,
so the site was quoting two different taglines at once:
- Still "the archive for everything modest": `app/layout.tsx`'s sitewide
  `<title>`/meta-description default, `public/llms.txt`, and an unused,
  never-imported `MagnifierHero` component + `hero-archive.jpg` asset left
  from an even older hero design.
- "A curator, not a catalogue": the homepage hero (until this revert),
  and `/about`'s mission paragraph (present since 2026-08-09, independent
  of the 2026-08-13 hero change).

Presented both taglines and asked which one should be the site's single
consistent one. Tina chose "the archive for everything modest."

## Fix
Reverted `app/page.tsx`'s hero `<h1>` to its exact pre-`9bbe0c8` text and
markup:
```
The archive for
<br />
<span className="italic">everything</span> modest.
```
`app/layout.tsx` and `public/llms.txt` needed no change — they never
stopped saying "archive."

**Deliberately did NOT touch `/about`'s MISSION paragraph** ("So this is a
curator, not a catalogue. A place where modest brands get a stage...").
That's Tina's own verbatim words from 2026-08-09, explicitly marked
untouchable in the file itself (§10.18: "nothing here may invent a line of
it or tidy one"). It was never "archive" copy to begin with — it's a
mission statement about the site's editorial stance, a different thing
from the hero's marketing tagline, and reverting the tagline doesn't make
her own mission sentence wrong or inconsistent.

## Verification
- `npx tsc --noEmit` — clean.
- `npx vitest run --exclude '**/.claude/**'` — 709/709 passing.
- `npx eslint app/page.tsx` — clean.
- Real browser (`next dev` + a live screenshot): hero renders "The archive
  for / everything modest." correctly, no layout breakage from the
  different text length (this exact copy was live before, so no surprise
  there).

## Notes / follow-ups
- Left the unused `MagnifierHero` component and `hero-archive.jpg` asset
  alone — they weren't asked about specifically and deleting dead code
  wasn't part of this request. Worth a separate cleanup pass if Tina wants
  it.
- If this flips again, the actual lever is `app/page.tsx`'s hero `<h1>`
  only — everything else already agrees with "archive."
