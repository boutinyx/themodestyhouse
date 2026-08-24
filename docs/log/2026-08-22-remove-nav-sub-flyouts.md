# Removed the header nav's sub-flyouts
**Date:** 2026-08-22 · **Status:** done

## Goal
Tina, with a screenshot of the small white popout holding BLAZERS / VESTS:
*"needs to go all of these sub thingies"*.

Two rows in the Clothing panel carried them — "Blazers & Vests" (→ Blazers, Vests) and
"Cardigans & Sweaters" (→ Cardigans, Sweaters). Both are gone.

## What changed

**`components/Nav.tsx`** — the `subItems` on those two rows, and the
`BLAZER_VEST_SUBTYPES` / `CARDIGAN_SWEATER_SUBTYPES` lists that fed them. The
`OUTERWEAR_SUBTYPE_LABELS` import went with them; `lib/specialty.ts` still exports it
for the lane pages' Type filter and `MobileNav`.

**`components/NavMenu.tsx`** — the whole flyout implementation:
- the `subItems` field on `NavItem`, and the `it.subItems ? … : …` branch in
  `renderItemsGrid`. Every row in a panel is now a plain `<Link>`.
- the nested `Menu.Root` / `Trigger` / `Portal` / `Positioner` / `Popup` / `Item` tree,
  and with it the `Menu` import, `useRouter`, and the `lastPointerType` ref that
  existed only so that one row could tell a mouse click from a touch tap.
- the `[data-nav-subflyout]` clause in both the pointermove closer and the
  click-outside closer.

**What deliberately STAYED**, and this is the part worth reading before anyone
"cleans it up": the controlled `navValue` + `elementFromPoint` closer machinery. It was
built for the flyouts, but it is not dead code — since 2026-08-21 the `wide` panel is
also DOM NavigationMenu does not control (a plain absolutely-positioned sibling inside
the header row, not Base UI's own Popup), so hovering it has the same shape the flyout
did. Deleting it would reproduce "the panel closes before I can reach it" on
Clothing/Hijabs/Basics themselves. The comment block there was rewritten to say that,
and to keep the three failed cuts from §10.34/§10.36 — each of which looked fixed on the
obvious manual pass.

**`scripts/interaction-audit.mjs`** — §10.32 rule 1 (delete a feature, grep `scripts/`
too). Two changes:
- the entire `2b. outerwear nav flyout` block is deleted. It tested a feature that no
  longer exists, and `outerwear-flyout-navigate` was already the subject of §10.38.
- `nav-dropdown-open` **repaired, and it now genuinely runs** — see below.

## Verification

`npx tsc --noEmit` — exit 0. `npm run lint` — exit 0. `npm run build` — compiled
successfully. `npm test` — 1317 passed; the 2 failures are in another session's
worktree (`.claude/worktrees/jiggly-hugging-honey/`), unrelated.

Playwright against a `next start` build on :3211, at 1440x900, stylesheet asserted
loaded first:

```
panel open ->  subflyouts: 0   role="menu": 0   nonLinkRows: []
               rows: All Clothing, Modest Dresses, …, Blazers & Vests,
                     Cardigans & Sweaters, Jackets & Coats, …  (24)
after hovering "Blazers & Vests" (900ms, well past the old 150ms open delay):
               subflyouts= 0   roleMenus= 0
click "Blazers & Vests" -> /blazers-vests   panelStillOpen= false
```

`nonLinkRows: []` is the second half of the win: those two rows used to be non-link
`Menu.Trigger` divs — the reason they needed a pointer-type-gated `onClick` to navigate
at all (§10.34's "i cant click on hijabs and scarfes now and also not outterwear"). They
are ordinary anchors now.

**The repaired `nav-dropdown-open` check.** It had TWO independent reasons it could not
have run since 2026-08-21, and I found the second only because fixing the first exposed
it:
1. It located the trigger by the text **"Products"**. That trigger was renamed
   "Clothing" on 2026-08-21. Measured: `header Products text count 0`.
2. Its panel-finder looked for a `<nav>` **portalled outside the header**. The wide
   panel stopped being Base UI's floating Popup that same day and became an
   absolutely-positioned sibling *inside* the header row.

It now finds the panel structurally — an absolutely-positioned, currently-visible block
with ≥4 links — selecting on nothing this change introduced (§10.32 rule 2). Negative
control run before trusting it (§10.28 rule 1): nav closed → 0 panels found; Clothing
open → exactly 1, with 12 links; Hijabs open → exactly 1, with 4.

Result: `nav-dropdown-open  desktop-1440  chromium  ok` and `webkit  ok`, where it read
`skipped (desktop nav hidden at this width)` before — at a width where the nav is plainly
visible. That is the third time this one check has died to a rename, and the second time
its skip message asserted something false about the page.

## Notes / follow-ups

**A real defect the repaired check immediately surfaced, which this change did not
cause:** `nav-dropdown-open  ipad-1366  NAV PANEL DID NOT OPEN`, both engines. Confirmed
by hand in a touch WebKit context at 1366x1024 — tapping "Clothing" leaves
`aria-expanded="false"` on all three triggers and opens nothing.

The cause is written down in `NavMenu.tsx` already: a group WITH an `href` renders its
trigger as `<Link>` so a click can navigate, and the comment right there notes that
"groups without an href stay buttons, which is what makes them openable by tap."
Clothing, Hijabs and Basics all have hrefs. So on any touch device wide enough to get
the desktop header — an iPad — the three dropdown panels are unreachable. This is
CLAUDE.md §10.25 in a new place, and it has been true since 2026-08-21; it was invisible
only because the check that would have caught it was dead for the two reasons above.

I have left the check FAILING rather than softening it, because it is reporting a true
thing. Fixing it is a real interaction decision (first tap opens / second tap navigates,
or a separate caret hit-area) and is Tina's call, not something to fold silently into a
removal task.

**Not touched, deliberately:** the `?type=` subtype pages themselves. The flyouts were
one way in; the lane pages' own Type filter, the phone menu's inline subtype rows
(`MobileNav`, an accordion — never a popout, so not one of the "sub thingies" in the
screenshot) and the 10 `?type=` sitemap entries all still reach them.

Also still open and pre-existing: `hero-search-typed` fails at every viewport in both
engines because `.glass-search` no longer exists on the homepage (measured:
`glass-search count 0`), and `HORIZONTAL OVERFLOW` at `tablet-819` in WebKit across
several checks. Both belong to other in-flight work on this branch.
