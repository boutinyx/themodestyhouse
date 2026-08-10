# Cut LumosModesty, left-align the Products dropdown, add a currency control to the footer
**Date:** 2026-08-10 · **Status:** done

## Goal
Three things Tina asked for in one message:
1. Remove LumosModesty's products from the site.
2. The Products dropdown in the header keeps its two columns, but the rows are
   left-aligned instead of centred (screenshot supplied).
3. Put the currency control in the footer too, and flags are allowed there.

## What changed

### 1. LumosModesty is cut
- `data/brands.ts` — the `lumos` record removed, so nothing fetches the feed again.
- `data/exclusions.json` — `"lumos"` appended to `brands`, which is what actually
  drops the rows at publish time and keeps them dropped. This is the established
  procedure for a cut brand (CLAUDE.md §7) and the reason a cut brand cannot come
  back by accident: re-adding it to `brands.ts` alone is a silent no-op.
- `data/products.json` / `data/rejected.json` — republished.

The raw rows are untouched, per Invariant 12 — nothing is deleted, the brand is
filtered at the publish boundary.

The publish REFUSED the first time, correctly:

```
Error: products.json NOT written — 1 brand(s) collapsed:
  lumos: 161 -> 0 (-100%)
```

That is `brandDropViolations` (`lib/lifecycle.ts`) doing its job — a dead feed and
an intended cut look identical to it. Re-run with `ALLOW_LARGE_DIFF=1`, which is
the documented escape hatch for an intended collapse.

### 2. Products dropdown: rows left-aligned
`components/NavMenu.tsx` — the panel's rows were `className="block nav-link …"`.
`.nav-link` is the horizontal-header class and sets `justify-content: center`, so
every option centred inside its grid column and the two columns read as two
ragged stacks. Tailwind cannot override it (`block`, `justify-start`, `text-left`
all live in `@layer utilities`, and an unlayered rule beats any layered one) —
which is exactly why `.menu-row` exists. The rows now use `.menu-row`, the same
class as the currency menu and the filter dropdowns. No CSS was added.

This is the **fourth** time `.nav-link`'s header-specific rules have leaked into a
vertical list (MobileNav, the filter dropdowns, the currency menu, now this).

### 3. Currency control in the footer
- `components/CurrencyFlag.tsx` (new) — US / UK / EU flags as inline SVG, and
  Phosphor's `Globe` for "As listed", which is not a country. Inline SVG rather
  than 🇺🇸🇬🇧🇪🇺 because no shipped Windows font carries regional-indicator pairs:
  Chrome and Firefox on Windows render the letters "US", "GB", "EU". Emoji are
  also unstyleable — size, radius and the rim against the dark footer would all
  be decided by the platform's emoji font.
- `components/FooterCurrency.tsx` (new) — Base UI `Menu`, the same primitive as
  the header control and the filter dropdowns, not a fourth hand-rolled one. It
  reads and writes the one `CurrencyProvider` context, so the header control
  follows it instantly and they cannot drift. Differences from the header
  version, all deliberate and commented in the file: opens on **click/tap** (a
  hover-opened popup at the foot of the page would fire at whatever the pointer
  rested on while scrolling past), `side="top"`, and its own dark-footer colours.
- `components/Footer.tsx` — rendered in the last row, before Privacy · Terms.
- `app/globals.css` — `.footer-currency-trigger`, which owns the trigger's colour
  and hover/open states. The colour is in CSS and not inline **because an inline
  `color` would beat the `:hover` and `[data-popup-open]` rules**.

### 4. The audit that should have caught #2 — it had been dead for a day
`scripts/interaction-audit.mjs`:
- **`nav-dropdown-open` never ran.** Its locator was
  `getByRole('button', {name: /styles/i})` — the "Styles" group, deleted with the
  `/style/[vibe]` pages on 2026-08-09. Nothing matched it after that, so it
  logged `skipped (desktop nav hidden at this width)` at every width in both
  engines, *including 1440 where the nav is plainly visible*. §10.28 rule 3: a
  check that skips every run is a check you do not have. It now targets
  "Products" (a link, not a button, since the group carries an href), opens it by
  hover on a mouse and by tap without one, and asserts the rows are left-aligned
  by measuring where the **text** starts — the boxes are stretched to the column
  either way, so only the glyph position distinguishes centred from left.
  The panel is found **structurally** (the portalled `<nav>` outside the header),
  not by the row's class, so the check cannot break the next time a class is
  renamed — which is precisely §10.29.
- **New `footer-currency` check** — opens the new control at all four viewports in
  both engines, and asserts: the menu opens on tap, every option carries a flag,
  the popup lands **inside the viewport** (it opens upwards from the last row of
  the page, so falling off the bottom edge is its specific failure mode), and
  choosing GBP actually changes the trigger.
- **`PROBE` now skips `[data-base-ui-focus-guard]`.** Base UI parks two 1x1
  `role="button"` guards at (-1,-1) around every open popup; they are tabbable, so
  they passed every filter and were reported as two `CLIPPED control` findings on
  every WebKit run that opened a portalled menu. §10.26 — a whole category
  failing at once, in one engine only, is the harness.

## Verification

**Data.** Exactly 161 rows removed, all of them lumos, nothing else touched:

```
$ ALLOW_LARGE_DIFF=1 npm run build:data
wrote data/products.json and cached 4537 translations

$ python3 -c "…compare HEAD:data/products.json with the new file…"
old brands 108 new brands 107
gone: ['lumos']   added: []
ids removed 161   ids added 0
[('lumos', 161)]
```

Published total 20,783 → **20,622** across **107** brands.

**Static checks.**

```
$ npx tsc --noEmit      → exit 0
$ npm test              → Test Files 21 passed (21) · Tests 420 passed (420)
$ npm run lint          → 1 warning, in `.fontprobe.tmp.mjs`, an UNTRACKED scratch
                          file belonging to another session. Nothing of mine.
```

**Interaction audit**, against a production build served from an isolated git
worktree on :3399 (`.next` is shared with the dev servers this machine is running
— §10.28 rule 4), 4 viewports x 2 engines:

```
nav-dropdown-open  ipad-1366     chromium  ok      footer-currency  mobile-390    chromium  ok
nav-dropdown-open  desktop-1440  chromium  ok      footer-currency  tablet-819    chromium  ok
nav-dropdown-open  ipad-1366     webkit    ok      footer-currency  ipad-1366     webkit    ok
nav-dropdown-open  desktop-1440  webkit    ok      footer-currency  desktop-1440  webkit    ok
```

(`nav-dropdown-open` skips at 390 and 819, where the desktop nav genuinely is not
rendered. That is a real skip, not the dead one it replaced.)

**Negative control — the new checks were run against the OLD code first**
(§10.28 rule 1). Reverted `NavMenu.tsx` and `Footer.tsx` in the worktree, deleted
the two new components, rebuilt, re-ran:

```
nav-dropdown-open  desktop-1440  chromium  NAV ROWS NOT LEFT-ALIGNED — text starts at
                                           [["627",[643,678,639,682,688]],["809",[866,853,827,821]]]
nav-dropdown-open  desktop-1440  webkit    NAV ROWS NOT LEFT-ALIGNED — …
footer-currency    every viewport, both engines  FAILED: no .footer-currency-trigger
```

Five different text-left positions in one column is the defect in Tina's
screenshot, measured. The first version of the check failed for the WRONG reason
here — it selected `a.menu-row`, which does not exist on the old code, so it
reported "NAV PANEL DID NOT OPEN". That is why the selector is structural now.

**A separate probe** (scratchpad) additionally confirmed on the same build that
picking GBP in the footer updates the header control to GBP, that the footer menu
opens upward and inside the viewport, and that it closes after the choice —
chromium and webkit, desktop-1440 and ipad-1366, 0 problems / 4 runs.

## Notes / follow-ups
- `npm run lint` exits non-zero on `.fontprobe.tmp.mjs`, which belongs to another
  session working in this tree at the same time. Left alone deliberately —
  deleting another session's scratch file is exactly the §10.30 mistake in
  reverse. It must go before lint is green again.
- The phone now offers currency in two places: the burger panel's chips and the
  footer. Intentional — the footer control is site furniture at every width — but
  worth a look at whether the panel copy still earns its place.
- `decisions.json` keeps ~161 orphaned `lumos:` keys, and `data/archetypes*.json`
  keeps its lumos entries. Consistent with the existing drift documented in §8;
  no pruning step exists for any cut brand.
