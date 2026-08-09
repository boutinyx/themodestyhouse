# About: closing band removed, "Apply for the seal" moved into the seal section
**Date:** 2026-08-09 · **Status:** done

## Goal
Tina, with a screenshot of the closing aubergine band: *"i want this gone but keep the pill with
apply for seal and add it to What the seal means"*.

## What changed
`app/about/page.tsx` only.

- **Deleted section 10 — CLOSE** (27 lines): the aubergine band with "Start with the directory"
  and its two pills. The "Browse the directory" pill went with it, per the ask. The page now
  ends on the conditional PEOPLE band.
- **Moved "Apply for the seal" into the seal band**, on a row with the existing "See the
  houses" link — pill first as the primary action, text link second. The link lost its own
  `mt-7`; the row carries the spacing now.

## The one substantive decision: the pill could not keep its colour
The pill was `--brass` (#a98a5b) on the aubergine band. The seal band's ground is `#f0e8d9`.
Measured before moving it:

| pill fill | vs `#f0e8d9` ground | label on the pill |
|---|---|---|
| `--brass` `#a98a5b` | **2.66:1 — FAIL** (WCAG 2.2 SC 1.4.11 wants 3:1 for a control's boundary) | `--ink` 5.15:1 |
| `#826430` (this band's own brass) | **4.52:1 — pass** | `--parchment` 5.15:1 · `--ink` 3.03:1 fail |
| `--brass-ink` `#8a6a33` | 4.12:1 — pass | `--parchment` 4.69:1 |
| `--aubergine` | 11.77:1 | `--parchment` 13.40:1 |

Moved as-is, the pill would have had no discernible edge against the band. It now uses
**`#826430`** — the brass this band already uses for its `SealCheck` icon and "The seal" eyebrow
— with `--parchment` text. Note the text colour had to flip with the fill: `--ink` on `#826430`
is 3.03:1 and fails AA at the pill's 12px.

This is also what the token itself says: `--brass` is commented in `globals.css:153` as
"accent — badges/graphic only, **never buttons**". The same conclusion from the other end.

`#826430` is a literal rather than a token because the band's existing comment already
establishes that its colours "exist for this one band; promoting them would imply a second light
ground the rest of the site does not have".

## Verification
`npx tsc --noEmit` exit 0 · `npx eslint app/about/page.tsx` exit 0.

Built and served in an isolated worktree, read back from the rendered page:

```
"Start with the directory" on page: false
"Browse the directory" on page    : false
"Apply for the seal" on page      : true
pill: { href: "/contact?topic=seal",
        fill: rgb(130, 100, 48),      // #826430
        color: rgb(250, 247, 241),    // --parchment
        sectionHeading: "What the seal means",
        sectionBg: rgb(240, 232, 217) }  // #f0e8d9
page errors: none
```

Screenshot of the band confirms it reads correctly.

## Notes / follow-ups
- One assertion in the edit script reported a false failure: it checked that "Start with the
  directory" was gone from the file, but the replacement comment *quotes* that phrase to explain
  where the pill came from. Same class as the earlier check that counted `<section>` written in
  a comment's prose as a real tag — a substring test over source cannot tell code from the
  commentary about it. The rendered-text check above is what actually settles it.
- **`app/page.tsx:181` still uses a `--brass` pill** for the same "Apply for the seal" CTA on the
  homepage. Whether that one passes depends on its own ground and was not measured here — worth
  a look, since it is the same token the comment says never to use for buttons.
- The page no longer has a closing call to action. That is what was asked for; flagging only
  because the last thing on the page is now the (currently empty, therefore unrendered) PEOPLE
  band, so in practice it ends on "Where this is going".
