# About page: "What the seal means" and "What gets in" swapped
**Date:** 2026-08-09 · **Status:** done (committed by another session — see below)

## Goal
Tina: *"can you change places witht he What the seal means and the What gets in in the about
page"*.

## What changed
`app/about/page.tsx` only. The two blocks were moved **whole**, each keeping its own ground and
colours — not swapped in content. That matters: the comments on both sections document that
every colour in them is a contrast-driven variant of its background (`--brass` is 3.07:1 on
parchment, `--muted` goes the wrong way on a dark ground, `#e7d3b6` is the lighter brass for the
purple). Swapping the *content* between the bands would have required re-deriving all of it;
swapping the *blocks* keeps each internally correct.

Band rhythm still alternates, so no two same-coloured bands touch:

```
before:  bone -> aubergine "What gets in" -> parchment "What the seal means" -> bone
after:   bone -> parchment "What the seal means" -> aubergine "What gets in" -> bone
```

Both section comments were rewritten, because each described its own position and would
otherwise have been actively wrong: the seal comment opened *"Out of the purple and into a band
of its own"* (it now precedes the purple), and the standard comment said *"the seal band was
already directly beneath it"* (it is now above). The `7 —` / `8 —` numbering was swapped with
them. The one ordering claim inside the copy — the note explaining that *"among the houses"* is
load-bearing because a flat ban would contradict *"Layering, and the high street" one band
below* — is still true, and is in fact now literally one band below.

## Verification
`npx tsc --noEmit` exit 0 · `npx eslint app/about/page.tsx` exit 0.

Built and served in an isolated worktree, order read back from the rendered DOM rather than the
source:

```
One place for modest womenswear      rgb(250, 247, 241)   parchment
Read everything, publish very little rgb(251, 250, 246)   bone
What the seal means                  rgb(250, 247, 241)   parchment
What gets in                         rgb(68, 25, 67)      aubergine
Layering, and the high street        rgb(251, 250, 246)   bone
Start with the directory             rgb(68, 25, 67)      aubergine
```

No page errors. Element screenshots of both bands confirm they read correctly rather than
merely measuring right.

## Notes / follow-ups
- **This was committed and pushed by the OTHER session, not by me.** While the change sat
  uncommitted in the shared checkout, that session ran a commit that staged the whole working
  tree, so the swap went out inside `b5e5705 copy(about): cut the last four paragraphs of "Why
  this exists"` — a message that does not mention it. It is on `origin/main`; nothing further to
  push.
- **Two edits nearly went wrong here and are worth recording.** First, the file changed under me
  between reading it and editing: line-number-based slicing aborted on its own assertion (before
  writing, so nothing was damaged), because that session had committed `2bf5fd5` in between.
  Marker-based slicing on `{/* 7 —` / `{/* 8 —` / `{/* 9 —` is what made it safe. Second, the
  balance assertion counted `<section` occurring **in the prose of a comment** (`"two <section>s
  a screen reader announces separately"`) as a real tag; it now matches only lines whose stripped
  content starts with the tag.
- A snapshot of the pre-swap file and the other session's diff at that moment are in the session
  scratchpad, since neither existed in git at the time.
