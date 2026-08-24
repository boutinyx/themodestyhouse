# Marketing audit — mechanical quick wins fixed
**Date:** 2026-08-13 · **Status:** partial

## Goal
Act on `docs/MARKETING-AUDIT.md`'s Quick Wins list (10 items). Fixed everything that
was a code/copy correction of an existing, verifiable fact. Deliberately skipped
anything that would require inventing a fact about Tina or the business (a name, a
photo, an operational promise) — per CLAUDE.md §10.18, that's hers to write, not
something to fabricate on her behalf.

## What changed

1. **FAQ Q8 + footer disclaimer currency contradiction** (`app/faq/page.tsx`,
   `components/Footer.tsx`) — both said "we don't convert or mark up," which stopped
   being true 2026-08-12 when the currency switcher defaulted to an approximate USD
   conversion (ADR-0002 supersession). Rewritten to match what `lib/fx.ts` actually
   does: approximate by default, marked with ≈, never marked up.
2. **Seal wording unified** across `components/VerifiedSpotlight.tsx`, the homepage
   "For Designers" 3-step block, and `/about` — was worded three different ways
   ("craft, sizing and ethics" / "craft, sizing and ethics" / "craft and design").
   Standardized on `/about`'s wording, the one place the standard is actually
   defined; dropped "sizing" and "ethics" since neither is evidenced anywhere.
3. **Visible outbound-link cue on product cards** (`components/ProductCard.tsx`) —
   added a small `ArrowUpRight` badge, bottom-right of the image, `aria-hidden` +
   `pointer-events-none` so it never competes with the full-card anchor for the
   click. Top corners were already taken by quick-view/favourite.
4. **Hero subheadline swapped** from "The archive for everything modest" (aggregation
   framing) to Tina's own sentence from `/about`'s MISSION block — "So this is a
   curator, not a catalogue." — verbatim, only line-broken for the hero. Metadata
   (SEO title/OG) untouched; this was the visible on-page H1 only.
5. **Quick-view/favourite buttons bumped to 40px on mobile** (were 32px, under the
   audit's 40-44px recommendation and WCAG 2.2 SC 2.5.8 territory) — now a flat 40px
   at every width.
6. **Per-page Open Graph/Twitter tags** — every route sharing `SEO_COPY` (and
   `/about`, `/contact`, which don't) previously set only title/description, so
   `openGraph`/`twitter` fell through to `app/layout.tsx`'s generic card at every
   share. Added `buildMetadata()`/`pageMetadata()` helpers to `lib/seoCopy.ts` and
   switched every consumer (`/`, `/directory`, `/[lane]`, `/faq`, `/editorial`,
   `/designers`, `/about`, `/contact`) to use them. Verified with a live Playwright
   check — each route now returns its own `og:title`/`og:description`/`og:url`.
7. **`/directory`'s H1** — was the bare word "Products" (zero-keyword, mismatched
   against its own `<title>`). Now "Modest Clothing", matching the Title Case
   noun-phrase pattern every lane h1 already uses.
8. **`/contact` now shows the disclosed email** (`hello@themodestyhouse.com`, already
   public in `content/legal/privacy.md`/`terms.md`) as a direct mailto, not just the
   form.

## Explicitly not done — needs Tina
- Naming a real person + photo on `/about`; bylining the two editorial posts.
  (Asked; Tina said not now.)
- Newsletter: a concrete "what arrives, how often" promise, and moving a signup band
  above the footer on lane pages. (Asked; Tina said skip for now.)
- The `/seal` page (Strategic item, not a Quick Win) — bigger scope, not attempted here.

## Update — reply-time promise added
Tina gave the real figure (2 business days). `/contact`'s intro now reads "...we'll
reply to the address you give, usually within 2 business days." Re-verified clean:
`tsc --noEmit` and `npm run lint` both pass with no new issues.

## Verification
- `npx tsc --noEmit` — clean.
- `npx vitest run` (repo root, excluding the unrelated locked worktree
  `.claude/worktrees/jiggly-hugging-honey/`) — 75 files / 1238 passed, 0 failures.
- `npm run lint` — 0 errors (1 pre-existing warning in untracked `.fontprobe.tmp.mjs`,
  not touched by this change).
- Live Playwright pass against `next dev` on an unused port (3199, confirmed no other
  process listening first): screenshotted `/`, `/faq`, `/directory`, `/contact`, and a
  product card; expanded FAQ Q8 and confirmed the new copy renders; confirmed
  `og:title`/`og:description`/`og:image`/`og:url` differ per route; grepped rendered
  HTML to confirm all three seal-copy surfaces now match.

## Notes / follow-ups
- `components/FilterableGrid.tsx` shows as modified in `git status` but was not
  touched by this work — it's another session's in-progress fix (outerwear subtype
  re-sync), left alone per the shared-worktree rule in CLAUDE.md §10.30.
- If/when Tina supplies a name+photo for `/about`, `PEOPLE` in `app/about/page.tsx`
  is already built to receive it (empty array, renders nothing until populated).
