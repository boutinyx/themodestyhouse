# About: the "Why this exists" eyebrow removed
**Date:** 2026-08-09 · **Status:** done (uncommitted)

## Goal
Tina: *"Why this exists can this little sentence be gone"*.

## What changed
`app/about/page.tsx` only.

- Deleted `<div className="eyebrow">Why this exists</div>` from the mission band.
- **Dropped the `mt-5` from the first mission paragraph with it.** That margin existed to
  separate the prose from the eyebrow; left behind it would read as an unexplained gap under the
  headline rather than as spacing. The first paragraph now takes no top margin and the band's
  own padding carries the rhythm.
- Updated two comments that referenced the eyebrow by name and would otherwise have been wrong:
  section 1's note explaining why its `pb` is cut from 64/96 to 20/28 (the tight padding is
  still right — it is now the first paragraph, not a label, sitting close under the headline),
  and section 8's note citing *"the same trade she made for 'Why this exists'"* about running
  full-width past the 65–75 character measure.

Nothing else moved. The band still renders conditionally on `MISSION.length`.

## Verification
`npx tsc --noEmit` exit 0 · `npx eslint app/about/page.tsx` exit 0.

Built and served in an isolated worktree (the shared `.next` is contested — §10.28), then read
back from the rendered page rather than the source:

```
"Why this exists" absent from rendered text: true
headline -> first paragraph: { h1Bottom: 215, paraTop: 243, gap: 28 }
page errors: none
```

Screenshot at 1280px confirms the "About" headline runs straight into the two mission
paragraphs with no leftover gap.

## Notes / follow-ups
- **Uncommitted.** Note that the previous About change was swept into the other session's
  `b5e5705` because that session commits the whole working tree; the same may happen here.
- The two remaining occurrences of the phrase in this file are both explanatory comments, not
  rendered text.
- Unrelated and pre-existing: the mission paragraphs run the full 1156px of `INNER`, about 180
  characters a line against the 65–75 the `MEASURE` comment names. The comment says this is a
  deliberate trade Tina made, so it is left alone — flagged only because removing the eyebrow
  makes the long measure the first thing on the page.
