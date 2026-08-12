# Fix filter pills squaring off after being clicked
**Date:** 2026-08-12 · **Status:** done

## Goal
Tina flagged a screenshot of the "Base-Layer Tops" filter pill on
`/layering-basics` with sharp rectangular corners instead of the pill shape
every other chip has, saying "the pill becoming a rectangle still happens" —
implying she'd seen it before this session too.

## Root cause
`.chip` and `.btn-pill` (`app/globals.css`) both set
`border-radius: var(--radius-button)` (999px, a true pill). A separate,
generic rule further down —

```css
a:focus-visible, button:focus-visible, [role="button"]:focus-visible, ... {
  outline: 2px solid var(--aubergine);
  outline-offset: 2px;
  border-radius: 4px;   /* <- the actual bug */
}
```

— sets a flat 4px radius on ANY focused button/link/role=button, meant as a
sane default for plain elements that don't already define their own shape.
It wins over `.chip`'s 999px by CSS specificity math regardless of source
order (`button:focus-visible` and `.chip` are both one class-level selector
each — `button:focus-visible` also carries a type selector, but that's a
*lower* specificity tier, so it doesn't help `.chip` win; they're
effectively tied and cascade order would decide, except `.chip` never even
gets a `:focus-visible` variant to compete — the flat rule simply always
applies once focus-visible is true).

The existing `html[data-input-modality="mouse"] ...:focus-visible { outline:
none }` rule (added earlier to stop a stray focus RING appearing after a
mouse-driven Base UI menu selection — the exact scenario the code comment
next to it describes: Base UI returns DOM focus to the trigger via a raw
`element.focus()` call after closing, which the browser can genuinely treat
as `:focus-visible` even under mouse modality) only ever reset `outline`.
It never touched `border-radius`, so the 4px corners survived that override
completely — meaning EVERY filter chip on the site squares off immediately
after you pick an option from it, not just this one instance.

## Verification of the root cause (before touching real code)
Built an isolated, self-contained HTML file with the exact CSS rules copied
verbatim from `app/globals.css`, served over a throwaway local HTTP server
(not `file://`, which the browser tool rejects), specifically to avoid
touching the project's shared `.next` build directory — another session was
concurrently working in this same repo and had left it in a broken state
(`next dev` failed with `Cannot find module '.../turbopack]_runtime.js'`
from a concurrent build/dev-server collision), so anything requiring a real
Next.js build was off the table for verification without risking further
collision.

Using a REAL, OS-level trusted click (via the browser tool's `left_click`,
not a JS-triggered synthetic `.click()`, which Chrome's `:focus-visible`
heuristic treats differently) on a `.chip`-styled button, then reading
`getComputedStyle` and `.matches(':focus-visible')` directly:
```
Before fix: { borderRadius: "4px", matches: true, modality: "mouse" }
After fix:  { borderRadius: "999px", matches: true, outline: "none" }
```
Both readings have `matches: true` — genuinely focus-visible, exactly the
state Tina's screenshot was taken in — confirming both the bug and that the
fix resolves it without touching the outline-suppression logic at all.

## What changed
- **`app/globals.css`** — added `.chip:focus-visible, .btn-pill:focus-visible
  { border-radius: var(--radius-button); }` right after the existing
  mouse-modality outline override, restoring the pill's own shape. Higher
  specificity than the generic `button:focus-visible` rule (two class-level
  selectors beat one class-level + one type-level), so it wins regardless of
  source order and fixes BOTH mouse and keyboard focus, not just the
  mouse case the adjacent override handles.

## Verification
```
npx tsc --noEmit    # clean for my change (2 pre-existing errors in
                     # app/api/staff/live-edit/*.test.ts — from the OTHER
                     # concurrent session's in-progress work, not touched by
                     # this CSS-only change; confirmed via `git status`
                     # that app/globals.css is the only file I modified)
npm test              # 36 files, 592 tests passed, no regressions
npm run lint            # 0 errors (1 pre-existing unrelated warning)
```
`npm run build` was deliberately NOT run this pass — the shared `.next`
directory was mid-collision from the concurrent session at the time. Given
this is a pure CSS rule addition with zero JS/React surface, and the
isolated-harness verification above already directly confirmed the exact
computed-style outcome (not just a visual screenshot check), a full
production build adds little additional confidence here relative to the
risk of colliding with the other session's build. Worth a real `npm run
build` + live click-through once that session's work settles, as normal
due diligence, but not blocking.

## Notes / follow-ups
- This affects every `.chip`/`.btn-pill` on the site, not just the Layering
  Basics Type filter — Category/Brand/Sort/Occasion(-when-restored)/Type on
  every lane and `/directory`, plus any `.btn-pill` CTA button anywhere,
  would all have shown the same squared-corner flash after a mouse-driven
  selection. One shared root cause, one shared fix.
- Other classes with their own custom `border-radius` on potentially-
  focusable elements (`.rail-arrow`, `.product-card`, `.tmh-cat-card`) were
  NOT audited or touched in this pass — out of scope for what was reported.
  If any of those turn out to have the same issue, it's the identical fix
  pattern (`<selector>:focus-visible { border-radius: <the class's own
  value>; }`).
