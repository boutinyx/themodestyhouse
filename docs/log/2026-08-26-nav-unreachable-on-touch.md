# The header menu was unreachable on every iPad, and the search check had been dead
**Date:** 2026-08-26 · **Status:** done

## Goal
`npm run audit:interaction` had two long-standing failures. Tina: *"fix what
needs to be fixed"*. They turned out to be opposite kinds of problem — one a
real user-facing bug, one a dead check — and the first job was telling them
apart.

## 1. REAL BUG — the whole nav menu was dead on touch at desktop widths

**Symptom:** `nav-dropdown-open — NAV PANEL DID NOT OPEN` at `ipad-1366` only,
both engines. Established as pre-existing first (§10.38 rule 1) by running the
identical audit against **production**, which reproduced it exactly.

Probed on production, both engines:

```
chromium ipad-1366    visible=true el=A href=/directory navigated=false panelsOpen=0
chromium desktop-1440 visible=true el=A href=/directory navigated=false panelsOpen=1
webkit   ipad-1366    visible=true el=A href=/directory navigated=false panelsOpen=0
webkit   desktop-1440 visible=true el=A href=/directory navigated=false panelsOpen=1
```

Tapping "Clothing" **did nothing at all** — no panel, and no navigation either.
Every iPad-sized touch device gets the desktop header (the mobile nav is
`lg:hidden`), so the entire Clothing / Hijabs / Basics menu was unreachable on
all of them. §10.25, again.

`components/NavMenu.tsx` already contained the explanation, as a comment about
`nativeButton`: *"groups without an href stay buttons, which is what makes them
openable by tap."* Clothing, Hijabs and Basics all carry an href, so all three
render as a `<Link>` and were hover-only. And the trigger's
`onClick={closeAllAndSuppressReopen}` set `suppressReopen`, which then vetoed
the open that Base UI's synthesised hover would otherwise have produced — so
the tap was absorbed and nothing happened at all.

### The second half, which the first fix exposed

Making the tap open the panel was not enough: the panel opened, and then its
links did not navigate. Traced:

```
pointerdown@SPAN  link=/directory
pointerup@SPAN    link=/directory
touchend@SPAN     link=/directory
click@BODY        link=-            <- the click never reached the link
```

Three explanations were ruled out by measurement rather than reasoning:

- **Not a close-before-click race.** The panel was still open at click time —
  the click fired at 55 ms, the panel did not close until 222 ms.
- **Not the Floating UI safe-polygon lock** documented further up that file.
  `document.body.style.pointerEvents` was `""` at pointerdown, pointerup,
  touchend AND click.
- **Not the harness.** An ordinary header link ("Designers") and an ordinary
  footer link ("/faq") both navigate correctly on tap under the identical
  emulation. §10.26 says suspect the harness first; this time it was tested and
  cleared.

The cause is that **every `touchend` destroys the touch pointer and produces a
full synthetic `pointerleave` / `mouseleave` cascade**, which Base UI's hover
machinery reads as "the pointer left" and acts on — pulling the panel out from
under the tap between the finger lifting and the click landing. The
`pointermove` closer compounds it: the mouse-compat move that follows a
touchend reports a **stale** position, so it also scheduled a 150 ms close.

**Fix:** on a device with no hover, hover-driven state changes are ignored
entirely. Two vetoes, both reading `matchMedia('(hover: none)')` **at the
moment of the event** rather than from cached state — §10.34's lesson about
this exact component is that an override here must be driven by current live
truth:

- `NavigationMenu.Root`'s `onValueChange` returns early.
- The `pointermove` closer returns early.

The Trigger's own `onClick` sets `navValue` directly, so nothing is lost: tap
to open, tap again to close, tap outside to dismiss, and close-on-scroll all
still work, and they become the only things that move this state.

### Verified, on a real build, by geometry taps

```
1. tap trigger        -> panels: 1            (was 0)
2. tap "All Clothing" -> /directory           (was: stayed put)
3. tap trigger twice  -> panels: 0            toggles shut
4. tap outside        -> panels: 0            dismisses
5. tap "Abayas" row   -> /modest-abayas       (was: stayed put)
```

Step 5 first appeared to fail because the probe looked for a row called
"Dresses"; the row is called **"Modest Dresses"**. The check was wrong, not the
code — the row list was printed and the tap redone by geometry.

## 2. DEAD CHECK — `hero-search-typed` had never tested anything real

**Symptom:** `FAILED: locator.click: Timeout 30000ms exceeded` at all four
viewports in both engines. Also reproduced identically against production.

It targeted `.glass-search input` — `components/HeroSearch.tsx`, which has
**zero importers**. The homepage's search became the *header* search and nobody
moved the check with it. That is the **fourth** time a check in this file has
died to a rename or a removal (§10.29, §10.32 twice, §10.38).

The feature itself is fine — verified before touching the check, at all four
viewports in both engines:

```
chromium/webkit x mobile-390 / tablet-819 / ipad-1366 / desktop-1440
  {"visibleTriggers":1,"clicked":true,"inputVisible":true,"typed":"abaya"}
```

**Fix:** the check is now `header-search-typed`. It opens the real control by
its trigger — the field does not exist until then, which is exactly the class
of state this audit is for (§10.25) — and asserts the field **accepts input**,
not merely that it appeared, so a field that opens but is inert cannot read as
`ok`.

**Negative control run before trusting it** (§10.28 rule 1): with the trigger's
`aria-label` deliberately broken, the check reports `NO VISIBLE SEARCH
TRIGGER`. Restored, it reports `ok`.

## Verification

```
npx tsc --noEmit   # 0
npx eslint …       # 0
npm test           # 50 files, 844 tests pass
BASE=… npm run audit:interaction   # 0 problems, 4 viewports x 2 engines
```

Every check `ok` or legitimately `skipped`, both engines. In particular
`nav-dropdown-open` is now `ok` at **ipad-1366**, where it has never passed,
and `filter-dropdown-after-tap` still opens at every viewport.

## Notes / follow-ups

- `components/HeroSearch.tsx` is dead code — zero importers — and so is the
  `.glass-search` block in `globals.css`. Left in place rather than deleted:
  removing a component is Tina's call, and `components/EditMagazine.tsx` is
  already tracked in CLAUDE.md §8 as a known unused component. Worth doing both
  together, deliberately.
- The `(hover: none)` split means a hybrid laptop with both a trackpad and a
  touchscreen reports `hover: hover` and keeps the mouse behaviour, which is
  correct — it is the presence of a hovering pointer that matters, not the
  presence of touch.
