# About page — design

**Date:** 2026-08-08 · **Status:** approved, not yet implemented

## Context

`app/about/page.tsx` is a stub: an `h1` and two sentences in a centred `max-w-3xl`
column, no imagery. The route is already wired into `components/Nav.tsx`,
`components/Footer.tsx`, `components/MobileNav.tsx` and `app/sitemap.ts`, so this
is purely a page-content job — no routing work.

Three constraints shaped the design:

1. **Other pages already have jobs.** `/designers` is the vetted index, `/editorial`
   the stories, `/contact?topic=seal` the brand application. About must explain the
   *judgement* behind those rather than duplicate them.
2. **The affiliate disclosure is invisible.** It exists only in
   `content/legal/terms.md` §2. P0-D in `docs/launch-readiness.md` wants a
   disclosure a reader will actually meet. About is where people look for "how does
   this site make money".
3. **The catalogue figures in CLAUDE.md were stale** — corrected in the same session
   this spec was written (34→59 brands, ~5k→~11.1k products, 6→8 blocked brands).
   Then, *during* that session, the nightly refresh (`521591f`, +5 new / 12 delisted)
   moved the product count again: 11,125 → 11,127. A figure that drifts twice in one
   afternoon is not a figure to type into a React file. Hence: computed, never
   hardcoded.

   Note also that `CLAUDE.md` is untracked — excluded via `.git/info/exclude:9` —
   so corrections to it are local to one machine and are not backed by git history.

## Decisions taken

| Question | Decision |
|---|---|
| Page shape | Banded scroll — six full-bleed bands, matching the homepage rhythm |
| Voice | House voice, unnamed. No bio, no portrait, no named curator |
| The seal | Certifies **taste only** — craft and design, not service or shipping |
| Band order | Receipts before the standard: proof, then reasoning |
| Numbers | Houses exact, pieces rounded down (`11,000+`) |
| Rejections | The "8 turned away" count is **not** published |
| Exclusions | Stated plainly in band 4, including the mass-market/budget judgement |
| Disclosure | Terms' hedged "may earn" wording **plus** the seal-independence clause |
| Photograph | `higgsfield-library/13-mashrabiya.jpg` |
| Who writes | Tina writes bands 1 and 2; the factual bands 3–6 are drafted here |

Dropping the rejection count while stating the exclusions plainly is deliberate and
not a contradiction: stating a policy is a different act from advertising a count of
rejected companies. With the count gone, **band 4's exclusions become the page's
credibility beat**, which is why they are stated in full rather than softened.

## Architecture

### `lib/aboutStats.ts` (new)

One exported function, one job: count the things the receipts band displays.

```ts
export type AboutStats = { houses: number; pieces: number; sealed: number };
export function aboutStats(): AboutStats;
```

- `houses` — length of `BRANDS` in `data/brands.ts`
- `pieces` — row count of `data/products.json`
- `sealed` — brands with `badge: 'verified'`

Returns raw integers. Rounding is a **presentation** concern and stays in the page,
so the helper remains trivially testable. Co-located test at `lib/aboutStats.test.ts`.

**Payload discipline:** only these three integers reach the rendered markup. No
product or brand arrays cross into the render — that is the mechanism behind
`/directory` shipping 1.4 MB to draw 24 cards (§8), and this page must not repeat it.

### `app/about/page.tsx` (rewritten)

Server component. No `'use client'` — nothing on the page holds state.

| # | Band | Ground | Content | Author |
|---|---|---|---|---|
| 1 | Statement | parchment | Eyebrow, `h1`, 2–3 line stance | **Tina** |
| 2 | Why this exists | mashrabiya image | ~120-word mission note | **Tina** |
| 3 | Receipts | aubergine | `59 houses · 11,000+ pieces · 5 with the seal` | numbers computed at build |
| 4 | The standard | parchment | What gets in; the edges; what the seal means; → `/designers` | drafted |
| 5 | How this is paid for | bone | Disclosure + seal-independence; → `/terms`, `/privacy` | drafted |
| 6 | Close | aubergine | → `/directory`, → `/contact?topic=seal` | drafted |

**Band 4 states the edges in full:** women's only; apparel only (no perfume, bakhoor,
candles or gift sets); no mass-market or budget labels. Then what the seal certifies —
a judgement about craft and design — and explicitly what it does **not** promise:
shipping, service or returns. That negative clause is load-bearing; without it the
page implies a guarantee the site cannot honour.

**Band 5** condenses `content/legal/terms.md` §2 into plain English and links to the
full text. It keeps the hedged "may earn a small commission at no extra cost to you"
— true whether or not monetization is live, so it needs no edit on the day Skimlinks
is wired up — plus the clause that commission never influences the seal.

### Image plumbing

`higgsfield-library/13-mashrabiya.jpg` (1696×960) → `public/about/mashrabiya.jpg`.

The existing `editorial` job in `scripts/optimise-images.mjs` caps at 900px, which is
too soft for a full-bleed band. Add an `about` job at the hero's widths
(`[640, 1024, 1440, 1920]`, `suffixWidth: true`) and extend `lib/staticImage.ts` with
the matching variant/srcset helpers.

Both steps are mandatory together: `lib/staticImage.test.ts` asserts on disk that
every original has every width, so adding the file without running the script fails
the suite. New file at a new path, never an in-place replacement (§6, §10.21).

## Risks designed around

**Text over a lattice.** Band 2 sets parchment text in the image's dark plum right
side. The contrast ratio must be measured, not assumed; a scrim gets added if it
fails. `npm run audit:mobile` currently reports 0 axe violations and this page must
not be what breaks that.

**Band 2 on a phone.** At 393px, text overlaid on a busy gold lattice is a legibility
trap. Below 820px the band **stacks**: image as a 16:9 block, text beneath on solid
aubergine. No `position: static` in that media query — that is precisely what
reparented the Verified Spotlight captions and stacked four of them on one point
(§10.22).

## Conventions this follows

- Tailwind for layout only; every colour, border and shadow inline as `var(--token)`
- Reuses `.eyebrow`, `.section-heading`, `.btn-pill`, `.aubergine-band`
- **No new raw `<style>` block** — capped at the existing three (§6)
- Phosphor icons from `@phosphor-icons/react/dist/ssr`; no text glyphs
- Internal navigation via `next/link`; no outbound links on this page
- `metadata.description` rewritten to drop "The Tina Aesthetic", which contradicts
  an unnamed house voice

## Verification

- `npm test` — including the new `lib/aboutStats.test.ts`
- `npx tsc --noEmit` (`rm tsconfig.tsbuildinfo` first)
- `npm run lint`
- `npm run audit:mobile` — 0 overflow, 0 violations, 0 small targets
- Full-page renders at iPhone 15 Pro **and** desktop, read by eye — the audit cannot
  see overlap, wrong colour, or a broken image (§10.22)
- Band 2 contrast ratio measured against WCAG AA

## Out of scope

`/designers`, `/contact` and the homepage are untouched. P0-E (affiliate link
rewriting) is not addressed; band 5 discloses the intent, it does not implement it.

## Open dependency

Bands 1 and 2 ship with marked copy slots. The page is not finished until Tina fills
them; no invented brand voice goes in as a placeholder that could be mistaken for
final (§10.18).
