# Currency picker: a flag row at the top of the phone menu, and a header-menu look on desktop
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina sent aabcollection.com's phone menu — flag, region, chevron, sitting just under the
close/logo bar and above the hairline that starts the navigation — with: *"i want the
currency thingie in the hamburger menu like this and on desktop a look and feel like the
menu"*. Two changes, one per surface.

## What changed

**`components/MobileNav.tsx`** — the currency control moved from the FOOT of the panel to
the TOP, and from nine wrapped `.chip` buttons to a collapsed disclosure.
- New `currencyOpen` state. The trigger shows the current choice (`<CurrencyFlag>` + the
  existing `CURRENCY_LABEL` string + a `CaretDown` that rotates), so at rest it costs one
  row rather than three lines of chips nobody scrolled to.
- Expanded, it lists all nine currencies as flag + label rows in the same 15px Jost used by
  the subtype rows, with the active one in aubergine/500 — the same active treatment every
  other row in this panel already uses. The approximate-prices note moved with it.
- The block sits inside the scroller, first, with a `border-bottom: 1px solid var(--hairline)`
  — that hairline is what the reference has between the picker and the nav.
- Still plain buttons rather than reusing `<CurrencySwitcher>`: a Base UI Menu popup opened
  from inside a Dialog is both fiddly and a second tap. Every string is reused verbatim
  (§10.18); nothing new was written.

**`components/CurrencySwitcher.tsx`** (desktop header) — restyled to match the header's own
Clothing/Hijabs panels beside it.
- Popup: `background: var(--parchment)` (was `#fff`), square corners (was `rounded-xl`), a
  shallower shadow, `px-4 py-3` (was `p-2`).
- Rows: `.mega-row` (was `.menu-row`) — 14px Jost, uppercase, ink rather than muted, with the
  label wrapped in `<span className="mega-row-label">` so it gets the same sliding underline
  on hover as every row in the Clothing panel.
- The note's horizontal padding went `px-3` → `px-1` to line up with `.mega-row`'s 4px pad.
- Trigger, hover/tap behaviour, `aria-label` and the RadioGroup semantics are all untouched —
  `scripts/interaction-audit.mjs`'s currency check locates by `aria-label*="currency"`, so it
  still points at the same thing.

## Verification
```
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit     # clean, no output
$ npx eslint components/MobileNav.tsx components/CurrencySwitcher.tsx   # clean, no output
$ npm test
 Test Files  46 passed (46)
      Tests  741 passed (741)
```
Playwright probe (Chromium, iPhone 13 + 1440x900) against the running dev server, screenshots
read back rather than assumed:
```
trigger text: $ USD
after pick, trigger text: £ GBP          <- tapping GBP re-labels the trigger, panel stays open
desktop trigger count: 1
popup box { x: 1140, y: 66, width: 260, height: 404 } { bg: 'rgb(250, 247, 241)', radius: '0px' }
row style { ff: 'Jost', fs: '14px', tt: 'uppercase', color: 'rgb(68, 25, 67)', just: 'flex-start' }
```
`rgb(250,247,241)` is `--parchment` and `0px` is the square corner, i.e. the popup is the same
surface as the header panel, not a white popover. Phone screenshots show the collapsed row
(flag + `$ USD` + chevron, hairline beneath it, "Clothing" first below) and the expanded list.

Staging verification: see below.

## Notes / follow-ups
- The desktop popup keeps `sideOffset={10}` from the trigger, same as the compact Hijabs
  popup — so it overlaps the last ~20px of the header band rather than sitting flush under
  it. Both compact menus behave identically, which is why it was left alone; if Tina wants it
  flush like the WIDE panel, that needs anchoring to the header element, not the trigger.
- `CurrencyFlag` renders at a fixed 18x12. Next to 17px Jost on a phone it reads smaller than
  aab's, which uses a larger circular flag. Left as-is — it's the same flag every other
  switcher on the site uses.

## Correction — which commit actually carried this
This work was NOT committed under its own message. Between `git add` and `git commit`, a
concurrent session in this same working tree ran its own commit, and all three files here were
swept into **`9445c31` — "perf(edits): regenerate the jersey heroes at quality 95"**, which was
then pushed to `origin/staging`. That commit's message describes only the WebP quality change;
its diff also contains the whole currency-picker change described above. `staging` is never
force-pushed (§1), so the message stands and this note is the correction. Written up as
CLAUDE.md §10.39 — the mirror image of §10.30, and the rule it produces is: stage and commit in
one command, because the index is shared between sessions and has no lock.

## Follow-up, same day — the selected currency is not listed
Tina: *"you dont have to show the curenccy you have already selected in the lst"*. The phone
list is now `DISPLAY_CURRENCIES.filter((o) => o !== (preference ?? 'USD'))` — eight rows, not
nine. The trigger directly above already names the current choice, so listing it again was a
dead row that read like a choice. The rows' active/selected styling and `aria-pressed` went
with it: every row in the list is now, by construction, a currency you are not in.

Verified on the dev server, Chromium/iPhone 13, reading the rendered rows rather than assuming:
```
trigger: $ USD
rows: ["$ USD"(trigger),"£ GBP","€ EUR","CA$ CAD","A$ AUD","kr DKK","₺ TRY","SR SAR","B$ BSD"]
after GBP, trigger: £ GBP
rows after: ["£ GBP"(trigger),"$ USD","€ EUR","CA$ CAD","A$ AUD","kr DKK","₺ TRY","SR SAR","B$ BSD"]
```
USD absent while USD is selected; GBP absent once GBP is. The DESKTOP menu still lists all
nine — it is a `Menu.RadioGroup`, where the checked row is the thing that tells you which
currency is active, and dropping it would mean giving up the radio semantics. Left alone
pending Tina's word, since her note was about the phone list she was looking at.

## Staging verification
Against `https://themodestyhouse-staging-production.up.railway.app` (the custom domain
`staging.themodestyhouse.com` still does not resolve — the Cloudflare CNAME noted as the only
remaining step in `docs/log/2026-08-24-staging-branch-and-environment.md` is not in place yet,
so this is the deployed staging artifact reached by its Railway hostname). Commit `b33bfcc`,
confirmed an ancestor of `origin/staging`.

```
body bg (css loaded?): rgb(250, 247, 241)      <- §10.24 stylesheet assertion, not a bare number
phone trigger: "$ USD"
phone rows incl trigger: ["$ USD","£ GBP","€ EUR","CA$ CAD","A$ AUD","kr DKK","₺ TRY","SR SAR","B$ BSD"]
  -> list length 8
after EUR, trigger: "€ EUR"
EUR still listed? false
desktop popup: { bg: 'rgb(250, 247, 241)', radius: '0px' }
desktop row: { ff: 'Jost', fs: '14px', tt: 'uppercase' }
```
Screenshot read back, not assumed: flag + `$ USD` + chevron directly under the logo bar, eight
other currencies with their flags, the approximate-prices note, then the hairline and
"Clothing". Matches the reference.

**One harness note, in the §10.20 family.** The deploy-poll loop tested
`grep -q "trigger: \$ USD"` — inside double quotes that `\$` collapses to a bare `$`, which
grep reads as the end-of-line anchor, so the pattern could never match. It logged
`poll N: not yet` three times against a staging build that had ALREADY deployed the change on
poll 1. The output it printed each round was the evidence that it was done. Read what a poll
prints, don't only trust its verdict.
