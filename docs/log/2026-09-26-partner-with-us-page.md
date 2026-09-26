# Add /partner-with-us — paid onboarding link
**Date:** 2026-09-26 · **Status:** done

## Goal
Tina wanted a private, non-indexed, premium-looking page to send directly to brands
she's already vetted (starting with Fajr Noor) — a $99 one-time onboarding package
(directory listing + designers page + blog post + Instagram feature + affiliate),
distinct from the free "Sign your brand up" path everyone else uses.

## What changed
- `lib/contactTopics.ts` — added a `partner` topic ("Partner application"), separate
  from `seal`, so the inbox can tell the free listing flow from the paid one apart on
  sight.
- `components/ContactForm.tsx` — added an optional `defaultMessage` prop (uncontrolled
  `defaultValue` on the textarea) so a page can prefill a question template.
- `app/partner-with-us/page.tsx` — new page. Not linked from nav/footer, not in
  `app/sitemap.ts` (which is an explicit map, not filesystem-driven, so simply not
  adding it is sufficient), `robots: { index: false, follow: true }` — same pattern as
  `/brand-terms` and `/favourites`. Reuses `ContactForm` + the existing `/api/contact` →
  Resend pipeline wholesale — no new backend. A submission arrives in the same inbox
  (`CONTACT_TO_EMAIL`) as every other contact-form message, subject
  `[Partner application] {name}`, with `reply_to` set to their email — replying to it
  replies straight to the brand, same as every other topic.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/partner-with-us/page.tsx components/ContactForm.tsx lib/contactTopics.ts app/contact/page.tsx` — 0 problems.
- `npm test` — 1 pre-existing, unrelated failure (`lib/colourLeads.test.ts`, a stale
  `data/colour-leads.json` id from catalogue drift) and 3 skipped; 1326 passed. Not
  caused by this change — nothing touched here overlaps colour data.
- `npm run lint` — 412 pre-existing problems, all in untracked `launch-film/`,
  `videos/founder-story/` (vendor-bundled GSAP) and `scripts/gsc-report.mjs`; none in
  files this change touched.
- Rendered `/partner-with-us` in a real browser (Playwright, 1000×1400, full page):
  correct `<meta name="robots" content="noindex, follow">`, header/footer render
  normally, $99 tier and question template render, form is wired to the `partner` topic.

## Notes / follow-ups
- **Flagged, not resolved:** `app/brand-terms/page.tsx` states plainly that "placement
  is not for sale" and CLAUDE.md §7/the /about page make the same commitment about the
  editorial seal. This page's $99 is scoped as a fee for onboarding *work* and a content
  push, not for the editorial inclusion decision (that stays free/unconditional for
  everyone) — but the wording on `/brand-terms` doesn't yet draw that distinction
  explicitly, so a brand that pays here and later reads `/brand-terms` could read the two
  as contradictory. Worth a short wording pass on `/brand-terms` before this is used at
  scale — Tina's call on the exact phrasing, since it borders on the FTC-disclosure
  question already open in `docs/launch-readiness.md` (P0-D).
- The page is discoverable only by direct URL: `https://themodestyhouse.com/partner-with-us`.
