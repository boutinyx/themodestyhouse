# Edit banner: underlined "See our picks", and the dek removed
**Date:** 2026-08-24 · **Status:** done — on staging, awaiting Tina's approval to merge

## Goal
Tina, on staging: *"Shop the edit i want this underlined instead of a border. and change it
into see our picks"* and *"Not saved for the occasion. i want gone"*.

## What changed

### The call to action — `components/EditBanner.tsx`
`Shop the edit` was a `.btn-pill`: a filled, uppercase Marcellus button, the site's loudest
control, overridden to a parchment background so it would show against the photograph. Over a
full-bleed campaign image that reads as a form element pasted onto the picture. It is now an
underlined text link reading **See our picks**, keeping the pill's typographic treatment
(Marcellus, uppercase, `--track-label`) so it still reads as a control rather than as prose.

The underline sits on a `<span>` around the words, **not on the `<a>`**. The anchor is an
`inline-flex` row with the Phosphor `ArrowRight` in it, so decorating the anchor would draw
the rule under the flex gap and then stop dead at the icon — `text-decoration` does not paint
across a replaced SVG child. Underlining the text span keeps the rule under the words only.

The arrow stays: it was there before, and this request was about the border, not the icon.

### The dek — `lib/edits.ts`, `EditBanner.tsx`, `app/edits/[slug]/page.tsx`
`dek: 'Not saved for the occasion.'` is deleted from the Everyday Lace record, and
`Edit.dek` becomes **optional**. Both surfaces that render it — the homepage banner and the
edit page's own hero — now guard on it, so an edit with no dek shows title + eyebrow only
rather than an empty `<p>` holding a `mt-4` of dead space.

Making the field optional rather than setting it to `''` is deliberate: an empty string still
type-checks as present, so the next edit added would look like it was *supposed* to have a
dek and someone forgot. `dek?:` says the line is genuinely optional.

Nothing else reads `edit.dek` — `seoDescription` is a separate field, so the meta description
and the JSON-LD are untouched. (`p.dek` in `app/editorial/*` and `app/llms.txt` is the
POST type in `lib/posts.ts`, a different type entirely.)

## Verification
- `npx tsc --noEmit` — exit 0. This is the check that matters for the optional field: every
  reader of `edit.dek` had to be found and guarded, and the compiler is what enforces that,
  not a grep.
- `npx vitest run` — 46 files, 741 tests, all passing.
- On staging: banner CTA text, absence of the old label, and absence of the dek string on
  both `/` and `/edits/everyday-lace` — counts below.

## Notes / follow-ups
- No other edit exists yet, so "an edit with no dek" is currently every edit. When a second
  one is added, decide whether the dek comes back for it rather than inheriting this absence
  by default.
