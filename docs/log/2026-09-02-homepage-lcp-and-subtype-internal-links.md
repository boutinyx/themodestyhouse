# The homepage took 15 seconds on a phone, and the 16 new pages were linked from nowhere
**Date:** 2026-09-02 · **Status:** done — merged and live

## Goal
Tina: *"fix everything"*, after I listed what the day's GSC/Pulse work had NOT covered.
Two of those items turned out to be defects rather than judgement calls.

## 1. The 16 new subtype pages had zero internal links

Measured on production, the morning after shipping them:

```
page            type= hrefs emitted    to the NEW lanes
/                       10                    0
/modest-tops            10                    0
/modest-abayas          10                    0
/new-in                 10                    0
/designers              10                    0
```

The 10 belong to the specialty lanes and come from `components/MobileNav.tsx`, which is
server-rendered and in the HTML for every visitor. The six new lanes have no flyout, so
nothing anywhere pointed at their `?type=` pages. §8 states the consequence directly: *a
sitemap entry gets a page crawled; internal links are what pass ranking signal.* I put 16
pages in the sitemap and gave them nothing.

**Fixed in the existing "Also browse" row** at the foot of each lane — the module that
already exists for internal linking, below the grid, where `lib/laneAnswers.ts` already
puts contextual links.

**This is not the chip row Tina removed on 2026-08-26** (*"i said get rid of this shit"*).
That was a `<nav>` of filled `.chip` filter controls ABOVE the grid duplicating the Type
dropdown. This is a text-link row below it, and it introduces **no new words**: every
label is either a lane title or a subtype label already shipped that morning.

On a subtype page the parent lane is included and the current subtype excluded, so each of
the 16 links to its siblings and back up rather than being a leaf a crawler reaches once.

## 2. The homepage LCP on mobile is 15.3 seconds

**Measured, not modelled.** Lighthouse put it at 4.4 s; three runs under real CDP
throttling (1.6 Mbps, 150 ms RTT, 4× CPU) against the live host gave 15,324 / 15,304 /
15,368 ms. §10.43 is exactly why the modelled figure was not trusted — two changes were
once shipped to remove a delay that did not exist.

This is the page **73% of visitors land on** and **75% of visitors view on a phone**.

### The hero is not the problem

```
hero request start   300 ms      <- discovery is fine, fetchpriority="high" already set
hero request end  15,296 ms
33 other images start at 1,607 ms
34 images · 2,785 KB · 3,196 KB total page
```

It finishes at 15,296 ms because 2.8 MB of other images start at 1,607 ms and it takes a
**fair share** of a 200 KB/s pipe rather than priority. A preload would change nothing —
the image was never late to be discovered.

### Why `loading="lazy"` was not already handling it

44 of the 47 `<img>` carry it. **35 of them loaded with no scrolling at all**, including
the category tiles **4.4 screens down**:

- Chrome's lazy-load distance threshold **scales with the effective connection type** — the
  slower the phone's connection, the more it fetches eagerly, which is backwards for
  exactly the user who can least afford it.
- 12 of them sit in horizontal rails, where a tile scrolled off to the **right** is still
  vertically inside the viewport margin and so is never treated as far away.

### The fix

`content-visibility: auto` on every top-level homepage section after the first, scoped by
a `.home-sections` class on `<main>` so no other page is affected by a measurement nobody
has made for it.

`~ section` rather than `:nth-child(n+3)` — the cut is "every section after the first",
which survives a section being added or removed. Measured identical (7,796 vs 7,800 ms;
the second section is a 72 px spacer with no images).

## Verification

**A/B on deployed staging, against itself** — same host, same deploy, only the rule
differing. Comparing staging to production would confound it: production is behind
Cloudflare and staging is not (§10.43 rule 2).

```
rule OFF (control)   LCP 15,168 ms   CLS 0   3,921 KB   sections-deferred  0
rule ON  (shipped)   LCP  7,940 ms   CLS 0   2,028 KB   sections-deferred 10
                     ---------------------------------------------------------
                     7,228 ms faster · half the bytes · CLS unchanged
                     page height 7,615 px in both — layout identical
```

**The first version of this A/B was void and reported a 156 ms win.** Its control did not
take — `sections-deferred 10` in *both* arms, i.e. it compared the rule against itself. The
`MutationObserver`-only injection silently failed on staging where it had worked on
production. The check now asserts `sections-deferred === 0` in the control arm and says so
out loud when it does not (§10.28: a success path indistinguishable from "did not run").

**No reader ever sees a blank image.** Scrolling the whole page at reading pace:

```
PRODUCTION (no rule)   47 imgs · 5 blank  — 5 off-screen horizontally, 0 visible
STAGING    (rule on)   47 imgs · 23 blank — 23 off-screen horizontally, 0 visible
```

All 23 are rail tiles scrolled off to the right, which is precisely the bandwidth being
reclaimed. Swiping a rail loads them: found the scroller structurally (an element whose
`scrollWidth` exceeds its `clientWidth`) and swiped it to 2,351 of 2,741 — **3 of 16 tiles
loaded before, 16 of 16 after**. An earlier version of that check reported "13 still blank"
with `scrollLeft=0`; its selector had not matched the scroll container, so nothing had been
swiped (§10.26).

**`npm run audit:visual` on `/`, both engines, three viewport classes — run against this
build AND against unchanged production:**

```
                     overflow  overlap  aspect  tap  img  a11y  errors  no-css
chromium/mobile   →      0        0        0     9    0     3      0       0
chromium/desktop  →      0       36        0     6    0     4      0       0
webkit/desktop    →      0        9        0     0    0     1      0       0
```

**Byte-identical totals on every counter in both runs.** Every finding it reports — the
desktop `overlap` (the four cross-fading nav panels, §4), the `color-contrast` on
`.btn-pill`, the tap targets — pre-dates this change and is present on production.

Also: `npx tsc --noEmit` clean, `npm run lint` exit 0.

### One measurement that proved nothing, recorded because it looked convincing

The same A/B run against a **local production build** showed no difference at all
(7,624 vs 7,628 ms) and only 13 images loading in either arm. The rule was verified to be
active there — 10 sections with computed `content-visibility: auto`, and the compiled CSS
contains the rule — so the null result was the *environment*: against loopback, Chrome's
lazy-loading behaves correctly and there was nothing left to save. A localhost run cannot
reproduce this defect, and had it been the only check, the fix would have looked useless.

## Live in production

Merged as `1230b47`. Origin confirmed current before purging (§10.47) — cache-busted reads
showed `home-sections` on `<main>` appear at +2.0 min — then `purge_everything`, then
IndexNow (160 URLs, HTTP 200).

Re-measured on production with the **same method and the same conditions** as this
morning's baseline, on the same host, which is the only comparison that means anything:

```
                     LCP        bytes     images loaded   CLS
this morning     15,324 ms   3,192 KB          35          0
now               7,784 ms   1,668 KB           8          0
                 ---------------------------------------------
                  7,540 ms faster · 48% fewer bytes
```

Runs: 8,164 / 7,752 / 7,784 ms. `sections deferred: 10`, so the rule is live.

Internal links confirmed on `/modest-tops`: 4 — `?type=blouse`, `?type=shirt`,
`?type=tshirt`, `?type=tunic`. Was 0.

## Notes / follow-ups
- **7.9 s is better, not good.** ~2 MB still loads before the hero completes, most of it
  JavaScript rather than images now. The next honest targets are the 368 KB hero itself and
  the payload — both separate measurements.
- The two edit heroes are 504 KB and 207 KB. Left alone deliberately: a concurrent session
  set them to quality 95 on purpose (`perf(edits): regenerate the jersey heroes at quality
  95`) and silently re-encoding another session's deliberate choice is §10.40.
- CrUX has **no field data** for this domain — below Google's reporting threshold — so
  every number here is lab-measured under emulation, and real-world LCP is unknown.
