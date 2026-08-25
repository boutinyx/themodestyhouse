# The dead band above every page's content
**Date:** 2026-08-25 · **Status:** done (staging)

## Goal

Tina: *"remove the excess whitespace above each catagorie when you click on them
and you are inside there is excess whitespace above the search and filter bar.
you need to remove that"*.

## Measured, and the number was not what the code claimed

On `/modest-abayas` at 1440, before:

```
header bottom   89     main top   89     main padding-top  160px
h1 "Abayas" top 249
filter bar top  441
```

**160px of empty band** between the header and the heading on desktop, 128px on
phone. The filter bar did not start until 441px down a 1000px viewport.

The value is `pt-32 md:pt-40` in `app/[lane]/page.tsx`, and the comment in
`app/directory/page.tsx` justified it like this:

> The top padding clears the fixed header, whose bottom edge is at 88px at every
> width.

**Both halves of that were wrong**, which is why the number survived so long:

1. The header is `position: sticky`, **not fixed**. It occupies flow space.
2. Measured, `main`'s top is **89** and the header's bottom is **89** — `main`
   already begins exactly where the header ends.

So the padding was never clearing anything. All 160px of it was decorative. That
comment is now corrected in place rather than left to mislead the next person.

## Scope: eleven pages, not one

`pt-32 md:pt-40` is the **shared page shell**, not a lane-page detail —
`app/directory/page.tsx` documents it as such ("SHELL: max-w-[1220px] + px-8 +
pt-…, the same on every page and on the footer"). It appears on 11 files.

Tina's report was about category pages. Changing only those would have left
`/directory` and `/favourites` — which carry the same search-and-filter bar —
visibly out of step with the lanes, which is the exact class of inconsistency she
has been asking to remove. So it was reduced everywhere the shell is used, and
that widening is stated rather than assumed.

`pt-32 md:pt-40` → **`pt-12 md:pt-16`** (128/160px → 48/64px) in:

`app/[lane]/page.tsx` · `app/directory/page.tsx` (x2, one in the shell comment) ·
`app/designers/page.tsx` · `app/designers/[slug]/page.tsx` ·
`app/editorial/page.tsx` · `app/editorial/[slug]/page.tsx` · `app/faq/page.tsx` ·
`app/favourites/page.tsx` · `app/contact/page.tsx` · `app/legal/LegalPage.tsx` ·
`app/product/[brandSlug]/[shopifyId]/page.tsx`

## Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · build clean.

After, on `/modest-abayas`:

```
desktop  main padding-top 64px   h1 top 153   filter bar top 345  (was 441)
phone    main padding-top 48px   h1 top 177   filter bar top 386  (was 466)
```

Every page on the shell checked for the thing that would actually break — content
colliding with the sticky header now that the cushion is smaller:

```
/directory   pad 64px  gap 64  overlap false
/designers   pad 64px  gap 72  overlap false
/editorial   pad 64px  gap 76  overlap false
/faq         pad 64px  gap 64  overlap false
/favourites  pad 64px  gap 64  overlap false
/contact     pad 64px  gap 76  overlap false
/privacy     pad 64px  gap 76  overlap false
```

`npm run audit:mobile`, both engines:

```
chromium  overflowing 0/9 | a11y 0 | stacked text 0 | broken aspect 0
webkit    overflowing 0/9 | a11y 0 | stacked text 0 | broken aspect 0
```

## A loop that silently did nothing — §10.20, again

The first attempt was a shell loop:

```
FILES=$(grep -rln "pt-32 md:pt-40" app/ --include='*.tsx')
for f in $FILES; do perl -0pi -e '...' "$f"; done
```

Paths like `app/[lane]/page.tsx` and `app/product/[brandSlug]/[shopifyId]/page.tsx`
carry brackets, and unquoted word-splitting mangled them — `Can't open
app/[lane]/page.tsx`. **Zero files were modified**, and `tsc`, `lint` and `build`
all passed afterwards *because nothing had changed*, which reads exactly like
success.

Caught only because the step printed before/after counts (`old remaining: 12`,
`replaced in: 0`) rather than trusting the exit code. Redone in Python, which
does not word-split. Same lesson as §10.20: if a step "had no effect", first
prove it ran — and a green build after a no-op edit is not evidence of anything.
