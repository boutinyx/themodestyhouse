# Seven engagement goals — the rest of Tina's dashboard, wired

**Date:** 2026-08-31 · **Status:** done

## Goal

Tina created the second batch of goals in Pulse and sent two screenshots:
`about_step_open`, `image_zoom`, `load_more`, `nav_open`, `rail_scroll`,
`region_filter`, `subtype_click` — the "worth it once there's volume" list from
the Playwright sweep, all declared in the dashboard and emitted by nothing.

Seventeen goals now. All seventeen exist in code; sixteen of the seventeen exist
in her dashboard — see the follow-up.

## What changed

| goal | properties | fired from |
|---|---|---|
| `about_step_open` | question | `HowBlocks` on `/about`, via the same `goal` prop `/faq` uses |
| `image_zoom` | brand, garment, product, title | the quick-view photograph |
| `load_more` | lane, depth | both grids' Load more |
| `nav_open` | group | `NavMenu.openNav` + the phone drawer's `Dialog.Root` |
| `rail_scroll` | rail, direction | `PopularShowcase.scrollBy` |
| `region_filter` | region | `DesignerDiscovery`, on OPEN only |
| `subtype_click` | lane, value | the delegated listener in `OutboundTracking` |

Choke points again, not call sites:

- **`nav_open` goes through one `openNav()`.** Two things open a header group —
  the hover-driven `onValueChange` and the Trigger's own `onClick`, which is the
  touch path (§10.50) — and routing both through one function means a tap is not
  counted twice and a hover is not missed. Closing is not a goal.
- **`subtype_click` is delegated**, in the listener that already handles
  outbound clicks. The `?type=` links are rendered by server components; an
  onClick would drag them into the RSC payload. The href IS the signal, so
  nothing needed annotating, and it is parsed as a `URL` rather than split by
  hand so an extra parameter cannot become a wrong dimension.
- **`load_more`'s `depth` is the count AFTER the tap** (48 on the first one).
  Reporting the count before would make every "how deep do people go" answer
  wrong by a screen.
- **`rail_scroll` reuses `surface`**, the name the rail already carries for
  outbound clicks (`popular-showcase` / `abaya-picks`), rather than inventing a
  second name for the same thing.

`content/legal/privacy.md` §2's *Which controls you use* bullet lists all seven,
and `lib/legal.test.ts` — which reads the goal names out of `lib/pulse.ts` — now
requires seventeen disclosures.

## Verification

```
npx tsc --noEmit                       → exit 0
npx eslint app components lib scripts  → exit 0
npm test                               → 1033 passed, 1 failed (the pre-existing
                                          everyday-lace pick, red on main too)
BASE=http://localhost:3207 npm run audit:outbound → ALL PASS, both engines

rail_scroll      chromium  ok {"rail":"popular-showcase","direction":"right"}
region_filter    chromium  ok {"region":"Europe"}
nav_open         chromium  ok {"group":"Clothing"}
subtype_click    chromium  ok {"lane":"/modest-hijabs","value":"undercap"}
load_more        chromium  ok {"lane":"/directory","depth":"48"}
image_zoom       chromium  ok {"brand":"niswa","garment":"dress","product":"niswa:10217348399402",…}
about_step_open  chromium  ok {"question":"We read the houses directly"}
   … identical for webkit, alongside the fifteen earlier lines …
```

The audit now drives **fifteen of the seventeen** goals. The two it does not are
`newsletter_signup` and `contact_submit`, which fire only on a real API
acceptance — running them would email Tina a fake sign-up and a fake enquiry on
every run — and they are covered at the unit level, where the assertion that
matters (neither can carry an address, a name or a message) actually lives.

**Negative control (§10.28 rule 1):** `trackGoal` made a no-op, full rebuild →
all seven new checks report `PROBLEM no <goal> emitted`, both engines. Restored →
ALL PASS.

**Three harness faults, each caught before it was believed (§10.26).** Every one
of them presented as a dead control on the site.

1. `getByRole('button', { name: /^Europe\d*$/ })` matched nothing: the region
   row's accessible name joins the name and its count with a SPACE — "Europe 58"
   — so the anchored form could never match.
2. `a[href*="?type="]` unscoped waited 15 s on a hidden row. **All four wide nav
   panels are mounted at once and cross-fade on opacity** (NavMenu.tsx, and the
   reason `audit:visual` reports ~180 false overlaps per desktop viewport), so
   every one of those links reports a non-empty box to Playwright while three
   panels' worth are unclickable. The retarget to `footer a[href*="?type="]`
   then matched **zero** elements — they are not in the footer at all. The check
   now opens the panel that owns them and clicks from there, which is the only
   route a real visitor has either.
3. A `?type=` link NAVIGATES, which would tear the page down before the queue
   could be read. The goal is emitted from a CAPTURE-phase listener, so the
   harness suppresses only the navigation with a bubble-phase `preventDefault` —
   strictly after the site's own listener has run. The site is untouched and the
   event is exactly the one production sends.

## Verified on staging

`8487126`, deployed ~140 s after the push, confirmed by a discriminator present
with the change and absent without it — "scrolling one of the homepage rails" in
`/privacy` §2. `BASE=https://themodestyhouse-staging-production.up.railway.app
npm run audit:outbound` → **ALL PASS**, 15 goals × 2 engines, identical values to
the local run.

As before, staging loads the real Pulse script, so the run sent a handful of
genuine events per goal under `data-domain themodestyhouse.com`.

## Follow-up for Tina

**`newsletter_signup` is the one goal in the code with no goal in the dashboard.**
It is not in either screenshot — alphabetically it would sit between *Nav Open*
and *Outbound Click*, and that row is absent. The footer form emits it on every
accepted sign-up; Pulse will not display it until the name exists.
