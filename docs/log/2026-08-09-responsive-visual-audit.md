# Full responsive + visual audit, and the fixes it found

**Date:** 2026-08-09 · **Status:** done

## Goal

Tina's ask: drive the whole site with Playwright, look at every page visually, and make
sure it is responsive and looks right on desktop, tablet and phone — all of it, not a
sample.

The existing `npm run audit:mobile` answered one question well (is the phone layout
broken) at one width, on nine of the twenty-six routes. It could not see a tablet at all,
and tablets are where this site's two disagreeing breakpoints collide: hand-written CSS in
`globals.css` breaks at **820px**, Tailwind's `md:` at **768px**, so anything between them
gets the desktop hand-written layout and the phone Tailwind layout at the same time.

## What changed

### New tooling

- **`scripts/visual-audit.mjs`** — every route × nine widths × two engines (312 page
  renders). Beyond the mobile audit's checks it adds: general text-on-text collision (not
  only the exact-same-point signature), images that failed to load, images squashed out of
  their natural proportions, text under 10px, content clipped by an `overflow: hidden`
  ancestor, console errors, failed requests, and a **stylesheet-loaded assertion on every
  single page**. `OUT=` writes to a separate directory so a second pass cannot destroy the
  first.
- **`scripts/interaction-audit.mjs`** — the parts of the site that only exist after a tap:
  the phone menu, the filter dropdowns, quick view, the currency picker, a populated
  favourites page, the hero search, the contact form. Nothing in a static render can see
  any of these, and one of the two worst defects below was only visible here.
- **`scripts/contact-sheet.mjs`** — phone/tablet/desktop side by side per route.

### Defects fixed

**1. The header printed its own wordmark through the navigation on every tablet.**
`components/Header.tsx`. The desktop nav switched on at `md:` (768px), but the row needs
~800px to lay out — crest, wordmark, five nav items, favourites, currency. The wordmark has
no ellipsis and the block was shrinkable, so it simply overflowed its box: measured at 768
and 819px, "THE MODESTY HOUSE" and "PRODUCTS" drawn on top of each other, the hairline
between crest and wordmark squeezed to nothing, and the currency glyph clipped by the
pill's own right edge. An iPad in portrait is 768 or 820. Now `lg:` (1024), where it fits,
with the full-screen phone menu covering tablets; the crest block is `shrink-0`.

**2. The Style-It picker ran off the right of the screen at 768px.**
`components/StyleIt.tsx`. Its two-column grid also started at `md:`. The card's min-content
is 575px (two 34px arrows, a 170px frame and a 148px dress frame with their gaps, a divider
and padding), which left the copy column 129px: the heading broke one word per line, the
"Style me" pill wrapped inside itself, and the card pushed the homepage into horizontal
scroll — 822px of content in 768. Now: stacked below 1024 (the fluid phone layout, capped
at 400px and centred), two-column with the mix pair from 1024, and the dress column back at
1280 where its hand-tuned geometry has the room it was tuned for. No desktop number changed.

**3. Verified Spotlight: desktop-size cards carrying phone-size captions, stranded left.**
`components/VerifiedSpotlight.tsx`. The type was restated at an 820px media query on the
assumption that below 820 the stage is phone-sized. It is not — the stage is
`max-width: 560px`, so from ~600 to 820px it is at full desktop size while still being
handed the phone's 17px/8px. Measured on an iPad: 238px cards with 8px captions. And in one
column the capped stage sat hard left with 227px of empty parchment beside it.
Fixed with a **container query** (`container-type: inline-size` on `.tmh-stage`, type in
`cqi` with `clamp()` pinned to the two already-signed-off endpoints), so the type scales
with the fan itself at every width instead of stepping at a breakpoint the fan does not
share. The stage is now centred, and the "cluster is left of centre" nudge became
`translateX(4.75%)` — the same 17px at 358px wide, and still correct at 560.

**4. The filter dropdowns could not be opened on any Apple device.**
`components/IndexPanel.tsx`. The panel was revealed by `hidden group-hover:block
group-focus-within:block`. A touch screen has no hover, and Safari deliberately does not
move focus to a `<button>` on click, so neither half ever fired. Driven under WebKit at
390px and 819px, tapping "Category" did nothing at all — the filters on `/directory` and on
all twelve lane pages were unreachable on every iPhone and iPad. Chromium hid it, because
its emulated tap does focus the button. Rebuilt on the Base UI `Menu` primitive already
used by the header nav and the currency switcher, as a `RadioGroup`: pointer, touch,
keyboard, Escape, outside-click, and collision-aware positioning (which also fixes the
panel running off the right edge of a phone).

**5. `.nav-link` leaked into two dropdowns and broke both.** `app/globals.css`,
`components/IndexPanel.tsx`, `components/CurrencySwitcher.tsx`. `.nav-link` is built for
the horizontal header: `display: inline-flex` and `justify-content: center`. On a full-width
menu row that centres every option, and `w-full` on an inline-level box in a shrink-to-fit
popup *inflates* the popup — the Category filter, seven options none longer than "All
category", opened a **603px-wide** panel. Both call sites carried a Tailwind
`justify-start` and both still rendered centred: Tailwind v4 emits utilities inside
`@layer utilities`, and an unlayered rule like `.nav-link` beats any layered one regardless
of specificity or source order. New `.menu-row` class owns the properties outright. Panel
is now 190px with left-aligned rows. (Third time this class has leaked into a vertical
list; `MobileNav` stopped using it for the same reason.)

**6. Every form field on the site zoomed the page on iOS.** `app/globals.css`. iOS Safari
zooms when a field under 16px takes focus and there is no way back. The contact form was
14px, the index console 15px, the newsletter pill 13px; only the hero search was safe, and
only because a comment there had already worked it out. A `@media (pointer: coarse)` floor
of 16px, with `!important` — verified necessary: these fields set `fontSize` in inline
`style={{}}` per the house convention, and inline beats any non-`!important` rule.

**7. The Style-It garments flashed empty every 2.6 seconds.** `components/StyleIt.tsx`.
Each cutout is `loading="lazy"`, so it is not fetched until the shuffle first shows it, and
a swapped `src` renders nothing until the new file arrives. Measured on a production build:
30–300ms of empty frame per first showing, so for the first half-minute on the page the
picker regularly showed a caption with no garment above it — two audit screenshots caught
exactly that. Now warmed on an idle callback after first paint. No extra bytes: the autoplay
walks the whole set within ~30s anyway. The dress column is only warmed above 1280 where it
is actually displayed.

**8. The footer sign-up field was 66px wide on a phone.** `components/Footer.tsx`. The pill
lives in a half-width footer column: the button took 95px of 163 and the field was left
showing "Your er". The column is now `col-span-2` below `md`.

**9. The About page's prose bands were 1219px wide.** `app/about/page.tsx`. Three bands were
written as `${INNER} max-w-3xl` — two max-width utilities on one element. That is two
declarations of the same property, so the winner is whichever Tailwind emits later, not
whichever is written last: `max-w-[1220px]` won and the 768px measure was dead. About 150
characters a line against the 65–75 a reader can track. The cap now goes on its own nested
element.

**10. Quick view cut off its own "Shop at …" button.** `components/QuickView.tsx`. The panel
is capped at 90vh and `overflow: hidden`; on a phone it is one column — a 256px photograph,
brand, a title up to three lines, price and two stacked buttons — so the overflow was cut,
and what sits at the bottom is the only thing the modal exists to offer. The text column now
scrolls (`min-h-0` is what allows it; a grid item's default `min-height: auto` refuses to
shrink past its content). Also `90dvh` not `90vh`, and `role="dialog"` /
`aria-modal` / `aria-labelledby`, which it had none of.

**11. `sizes` described grids that do not exist.** `components/ProductCard.tsx`,
`app/designers/page.tsx`. The product grid is 2-up under 768 and 3-up above; `sizes` said
2-up under 820 and 4-up above, so between 820 and ~1300px the browser was asked for a
quarter of the viewport to fill a third of it and picked a variant ~25% too small — soft
product photographs at exactly the widths most people browse at. Both now describe their
real regimes.

**12. Page shells did not line up with the footer.** Grid pages were `max-w-6xl px-5`, the
footer and homepage `max-w-[1220px] px-8`, so a page's content edge sat 22px inside the
footer's at 1440px and 12px inside it on a phone — two boxes stacked directly on top of one
another and not aligned. Header clearance was three different values (pt-28 / pt-32 /
pt-40). Every page shell is now `max-w-[1220px] px-8 pt-32 md:pt-40`.

**13. The homepage had no `<main>`** and two of its three section headings collided with
their "All …" link on a phone ("All stories" wrapped to two lines and printed into the
descender of the italic "shopping."). Both now use the treatment Tina already chose for the
Editor's Picks header: beside the heading from `md` up, under the content on a phone.

**14. The hero was taller than the screen on iOS.** `height: 100vh` is the URL-bar-collapsed
height. Now a `.hero-vh` class with a `100vh` → `100svh` fallback pair, which cannot be
written in a React `style={{}}` object because a property can only appear once there.

**15. `/privacy` printed literal backticks.** `components/Markdown.tsx`. The minimal
markdown parser handled links, bold and italic but not `` `code` ``, and privacy.md uses it
twice — for the favourites localStorage key and the Shopify CDN host. Both rendered with the
backticks visible on a live legal page. Added, styled as a tinted chip in the UI font rather
than introducing a fourth typeface for two spans.

**16. The Subject dropdown was an unstyled native control on every iPhone.**
`components/ContactForm.tsx`. The shared `field` style sets `borderRadius: 12` and
`padding: '11px 14px'` but never `appearance: none` — and **WebKit discards both on a
menulist `<select>` without it**. Measured at 390px: the Subject field rendered 23px tall
against its siblings' 43px, square corners against their 12px radius, text inset 9px against
their 19px, and the native double-chevron stepper. Chromium honoured all of it, so the form
looked right in every Chromium check and wrong on the whole of iOS. Now `appearance: none`
with a drawn caret. Verified: 48px in both engines, matching the field above it.

**17. Form controls rendered in the browser's default sans.** `app/globals.css`. Controls do
not inherit `font-family` — every UA stylesheet gives them their own — so "General enquiry"
was the one piece of body-weight text on `/contact` not in the house typeface, sitting in the
middle of the form. One `input, select, textarea, button { font-family: inherit }`.

**18. `/designers` tiles got SMALLER as the window got wider.** The grid stepped 3-up
straight to 5-up at `lg`, so tiles measured 237px at 819 and **178px at 1024** — narrower
than on a 430px phone. A 4-up step at `lg` makes it 225px, and the sequence now climbs:
150 / 165 / 185 / 220 / 238 / 225 / 215.

**19. `/about` sat on a different grid from the header and footer.** Its bands put the gutter
on the full-bleed `<section>` and the max-width on the child, so the child was 1220px centred
*inside* the already-padded area: at 1440 the page body ran 110→1330 while the footer ran
142→1298. Every band, card and rule hung 32px outboard of the furniture above and below it,
on both sides, at every desktop width. Padding moved inside the max-width; body and footer
now both start at exactly 142.

**20. The editorial list rows were `display: inline` on phones.** `app/editorial/page.tsx`.
A `<Link>` renders an `<a>`, and the `block` class was only in the no-image branch — so below
`md` the rows were inline boxes and their `padding: 28px 0` and `border-top` did nothing
vertically. Measured at 390px: 8px between one row's "Read →" and the next row's photograph
against 19–21px *inside* a row, so every element sat closer to the wrong neighbour and the
divider rules were invisible.

**21. Two footer rules ended in different places.** The disclosure block carried
`maxWidth: 720` on the element that also drew the hairline, so the rule stopped at the text
measure while the identical rule 115px below it ran the full width — 720 vs 1156 at 1440.
The rule now spans the column and only the text is capped.

**22. The homepage Edit section had a 350px void.** `app/page.tsx`. `posts.slice(1, 4)`
yields one story from the two that exist, so a 110px card sat beside a 460px feature with the
right half of the section empty. The grid now stays single-column below two side stories, and
returns to the intended two-column composition the moment a third post is published.

**23. The favourites empty state was a dead end.** It told the shopper to tap a heart "on any
piece" and gave no route to a piece, leaving 165px of bare parchment above a footer filling
two thirds of the screen. Added a pill to `/directory` — label reused verbatim from the
button that closes `/about`, not newly written (§10.18).

**24. Text glyphs replaced with Phosphor** (CLAUDE.md §6) in Style-It (`✦ ❚❚ ▷`), the
editor's rail (`‹ › ✦`), the spotlight badge, `/designers` (badges and `← Previous` /
`Next →`), the editorial index and post (`Read →`, `← The Edit`), the filter chip caret
(`▾`), and two hand-drawn `<svg>`s (the hero search magnifier and the nav chevron). Also
corrected the header crest's `width`/`height` to its real 240×337 so the reserved box is
the right shape before the file lands.

### Audit-harness corrections (the audit lied twice before it told the truth)

- **The collision check reported 43 findings, most of them false.** An *inline* element that
  wraps across lines reports the union of its line boxes, so two `<strong>`s on different
  lines of one paragraph read as 100% overlapped — that was every "collision" on /privacy
  and /terms. And a *rotated* element reports its axis-aligned bounding box, which inflated
  a 17px heading in the fanned cards to 46px and made it overlap its own subtitle. Both
  classes are now excluded, as `brokenAspect` already did for transforms.
- **The tap-target check flagged inline links in prose.** WCAG 2.5.8 exempts a target "in a
  sentence"; axe applies the exception and this did not.
- **A run crashed at 77 of 312 pages** on `route.abort: Route is already handled` and wrote
  no report for the 77 that had completed. Both arms of the interceptor now swallow the
  close race.
- **The interaction audit had no stylesheet assertion**, and a whole WebKit desktop pass was
  reported as horizontal overflow, a missing modal and a 1372px-wide dropdown — every one of
  them an artefact of a page rendered with no CSS at all (CLAUDE.md §10.24). It now asserts,
  retries once, and throws. It earned its keep immediately: the very next run failed all 48
  rows because a concurrent session had rebuilt `.next` under the running server.
- **Both audits routed every request through `route.fetch()` in Chromium too.** That
  interception exists only so WebKit stops honouring HSTS over plain-http localhost;
  Chromium exempts localhost already. Under five parallel contexts some of those re-fetches
  lost the race and were aborted, leaving product photographs and Style-It cutouts BLANK in
  the screenshots. I chased two of those blanks as site defects before the harness turned
  out to be the cause — a clean, un-intercepted browser rendered both correctly. Now
  WebKit-only.
- **The route-list is the thing that notices a deleted page.** The only genuinely new finding
  in the final 312-page run was 36 rows of `404` on `/style/elegant`, `/style/streetwear`
  and `/style/maximalist` — which is correct: a concurrent session retired the aesthetic
  pages (commit 4882496) while this work was in progress, and did it cleanly (no dangling
  links anywhere). The list has been updated.

## Verification

- `npm run build` — clean.
- `npm test` — **407 passed, 20 files**.
- `npx eslint app components lib scripts` — clean. (`npm run lint` reports one warning in
  `.fontprobe.tmp.mjs`, a scratch file belonging to a concurrent session, not to this work.)

**Full matrix, before → after.** Before: 312 renders (26 routes × 9 widths in Chromium, ×3 in
WebKit). After: 276, because a concurrent session retired the three `/style/*` routes
mid-flight. Counts are findings, not pages:

| | overflow | text overlap | broken aspect | tap target | image | a11y | no-CSS |
|---|---|---|---|---|---|---|---|
| before | 3 | 43 | 0 | 272 | 0 | 5 | 0 |
| after  | **0** | **0** | **0** | **0** | **0** | 5 | **0** |

Of the 43 "overlaps" before, 33 were false positives the harness has since learned to
exclude (inline and rotated boxes); 10 were real.

**5 of 276 rows have any finding at all**, and all five are the same homepage item: axe's
`target-size` on `.p2`, which fails on the *spacing* between the deliberately overlapping
fanned cards, and the 9px floor on that card's caption. Both are the composition, not a
defect.

The screenshots behind all of this were ~1.2 GB and have been deleted; `.audit/` is
gitignored scratch, not an artefact. Regenerate any of it with
`OUT=.audit/x npm run audit:visual` against a `next start` build.

**Interaction audit** — 48 states (8 per viewport × 3 viewports × 2 engines): **zero rows
with a finding**, every one `ok` or a legitimate `skipped`, in both engines. Before, the same
run reported the filter panel never opening under WebKit.

**Targeted probe across 360/390/430/768/819/1000/1023/1024/1280/1440/1920, both engines:**

- header wordmark/nav overlap **0px at every width** (was 54px at 768, 51px at 819)
- horizontal overflow **none at any width** (was 822>768, 823>819, 433>430)
- desktop nav and phone menu are mutually exclusive at every width, switching at exactly 1024
- fan caption meta **≥9px everywhere** (was 8px on phones, 8.94px at 820–1220)
- filter panel **opens on tap in WebKit** (was: never), **190px wide, left-aligned**
  (was 603px, centred)
- contact/newsletter/search fields **16px** under iPhone 13 emulation (was 13–14px)
- quick view's "Shop at …" button reachable at 360×640 (was cut off)
- `/about` prose measure **768px** (was 1219px)
- `/privacy` renders two `<code>` elements and **zero literal backticks** (was two)
- Style-It: **0 blank frames in 20 samples** taken immediately after a shuffle, in a clean
  un-intercepted browser (was 30–300ms of empty frame on every first showing)

### How the findings were gathered

Two passes, deliberately different in kind:

1. **Measurement** — the two scripts above, over the full matrix. Good at anything with a
   number attached (overflow, box geometry, contrast, computed styles), blind to whether a
   page *looks* finished.
2. **Looking** — a twelve-agent fan-out over the same screenshots, each agent assigned a
   route group and told to slice the full-page PNGs into native-resolution strips rather than
   read a 6000px image whole. 91 candidate findings, each then handed to an independent
   verifier told to default to *refuted* and to go and look at the pixels: **65 confirmed, 9
   refuted**. The refutations mattered — one agent reported the editorial articles running
   93–95 characters a line, and measuring the actual first line box gave **73**, which is
   inside the range it should be. That one would have been a pointless change to Tina's
   typography.

Everything the sweep confirmed and this log does not list as fixed was already fixed by the
measurement pass before the sweep reported it.

## Notes / follow-ups

- `components/IndexBar.tsx`, `components/BrandCard.tsx`, `components/BrandMarquee.tsx`,
  `components/MagnifierHero.tsx`, `components/EditMagazine.tsx` and
  `components/ProductGrid.tsx` are **not imported anywhere**. The first two still carry
  `▾`, `✦` and `View →` glyphs; they were left alone rather than edited as live code.
  Worth deleting or wiring up — Tina's call.
- The filter dropdowns' "all" option reads **"All category" / "All aesthetic" / "All
  occasion" / "All brand"** — generated as `All ${label.toLowerCase()}`, so it is singular
  where it should be plural. Not changed: it is user-facing copy (§10.18).
- The fanned brand cards still trip axe's `target-size` on the homepage. The rule fails on
  *spacing* between overlapping targets, and the overlap is the composition. Left as is.
- `lib/stylePieces.ts` still shows Bershka and PrettyLittleThing in the Style-It picker on
  the homepage of a curated modest directory. Pre-existing (§8), flagged again because the
  audit screenshots put it in front of me.
- **`/modest-swimwear` publishes a conventional two-piece bikini** — "Bikini - Azure",
  LANUUK, £78, a bra top and briefs on a bare-armed, bare-midriff model — directly under the
  lane's own line "Full-coverage swimsuits and burkinis for the beach and pool", beside real
  burkinis. Same lane runs "Maternity Swim Pants - Black" shot on a model in a sleeveless
  spaghetti-strap bodysuit. This is a curation call, not a layout one, so it is flagged
  rather than acted on — but it is on the one lane where modesty is the whole proposition.
- The filter dropdowns' "all" option reads **"All category"**, singular. See above; copy.
- The newsletter pill's 20px overhang into the footer gutter is unchanged — it is the
  documented optical alignment of the placeholder against the eyebrow above it, and the
  overhang is called out in the component as the deliberate cost.
- Two other sessions were running `next dev` in this working copy throughout. One rebuilt
  `.next` underneath a running `next start`, which invalidated an entire audit pass (165 of
  234 rows served 500s for their own chunks). The visual audit's stylesheet assertion is
  what caught it; without that it would have read as ~40 new defects.

---

## Follow-on, same day — four things Tina caught after the first push

The audit above was pushed as `1858059`. Everything below came from Tina looking at the
result on a real iPhone and a real desktop, which found things 276 automated renders did not.
That is the honest summary of this session: the matrix caught the structural breakage, and
the owner's eye caught the last few pixels.

**`b12f52e` — the header icons were not centred, and the sign-up pill sat 20px left.**
The menu button was 2.2px above the favourites heart. The heart is a direct flex item and
centred on the pill's y=53; the menu button sat in a `block` wrapper, which puts an
inline-flex control in a LINE BOX — it then aligns on a text baseline and reserves descender
space that has no text in it, and centred on y=50.8. Every wrapper in that row is `flex` now.
The sign-up pill carried `marginLeft: -20`, an old deliberate trade (align the PLACEHOLDER
with the eyebrow, at the cost of the pill hanging into the gutter). On a phone the overhang
is the only thing you see. Its edge now sits on the column. The brass button was also
floating — 36.5px inside a 42px pill — which **was caused by this session's own iOS fix**:
forcing inputs to 16px made the input taller than the button and `items-center` centred the
shorter one. `items-stretch`.

**`b0b4df4` — the heart, again, this time on its ink.** Tina: still not centred. It was, by
box, exactly — and that is why it was hard to see. Phosphor's heart glyph is not vertically
centred inside its own viewBox: screenshotted at DPR 4 and trimmed to the drawn pixels, ink
centre 54.00 against a 53.00 box, in both weights, phone and desktop. Hamburger and currency
disc both measure 0.00. `translateY(-1px)` restored — the third time that nudge has moved,
because a previous pass removed it on a **bounding-box** measurement that was correct and
irrelevant. The comment now records the method, not the verdict.

**`0296517` — the Edit-grid collapse was reverted, at Tina's instruction.** Item 22 above
fixed a real 350px void, but paid for it by taking her feature photograph from 674px to
1156px and turning the second story into a full-width 110px letterbox. A vertical gap traded
for a horizontal one, and widening the hero on the homepage is composition, not a defect fix.
It should have been raised, not shipped. The comment left behind records that the gap is
known, measured and accepted, and that **the answer is a third post, not a breakpoint**.

**`9040f03` — the Style-It pieces sit side by side on a tablet.** Tina's ask. Stacked, the
card was a 400px column 779px tall in an 819px row with ~184px of dead parchment either side.
From 768–1023 the two slots are a row and the card fills the width, so its left edge lines up
with the copy, the shop link and the buttons. Measured at 819: 400x779 → 755x402, section
height 1253 → 876. Below 768 unchanged (stacked, 208x225). From 1024 they stack again because
the card moves into the right-hand grid column. Frames capped at 240px from `md` so a 1023px
tablet does not balloon the garments past their desktop size.

## And the harness lied a fourth time — caught by someone else

A concurrent session fixing the currency menu (`08cb573`,
`docs/log/2026-08-09-currency-switcher-hover.md`) found three defects in
`scripts/interaction-audit.mjs`, which this session wrote:

1. **The currency check had never run, on any pass.** Its locator matched the trigger by
   TEXT, and the trigger renders `{preference ?? null}` — no text at all on the default
   "As listed". Every run logged `skipped (not present at this width)`. Now matched on
   `aria-label`, which exists in both states.
2. **The reporter could not represent a failing check.** It built its line from a hard-coded
   list of keys and printed `ok` when none matched, so new assertions setting a `PROBLEM`
   field passed silently on code that had the bug — confirmed with a negative control against
   the unfixed component. This is §10.26 reproduced *inside* the harness written to catch it.
3. **No viewport was both touch and >=1024px.** `tablet-819` is touch but below `lg`, so it
   never sees the desktop header; `desktop-1440` is wide but not touch. The iPad-landscape
   combination that §10.25 is *about* was untested. `ipad-1366` added.

So three "clean" interaction results reported in this entry were weaker than stated: the
currency row was never exercised, and a failing assertion could not have surfaced. The
page-level matrix in `scripts/visual-audit.mjs` is unaffected — its checks are counted, not
keyed.
