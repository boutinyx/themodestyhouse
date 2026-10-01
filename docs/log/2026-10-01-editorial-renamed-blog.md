# Editorial section renamed from "The Edit" to "Blog"
**Date:** 2026-10-01 · **Status:** done on staging, awaiting Tina's approval for main

## Goal
Tina: "change the edit name when you click on editorial to blog", and "in the header it can stay as editorial".

## What changed
"The Edit" -> "Blog" wherever it names the /editorial section:
- `app/editorial/page.tsx` — the page heading.
- `app/editorial/[slug]/page.tsx` — the "← Blog" back link, the eyebrow over the other-posts list, the
  BreadcrumbList name.
- `components/Footer.tsx` — the footer link to /editorial.
- `lib/seoCopy.ts` — the /editorial `<title>`.
- `lib/siteSections.ts` (feeds /llms.txt and the WebMCP `list_sections` tool) and `lib/agentGuidance.ts`.

Deliberately NOT changed: the header nav ("Editorial", per Tina); "The Edits" / `lib/edits.ts` eyebrows
("The Edit · Autumn 2026") and the homepage banner, which belong to the separate /edits campaign pages; and the
footer newsletter heading "The Edit, in your inbox", which is newsletter copy, not a link to this section —
flagged to Tina.

## Verification
tsc clean; eslint clean on the six files; vitest 1326 passed, 1 failed (`lib/colourLeads.test.ts`, the same
unrelated data failure as in `2026-10-01-inoma-titles-and-meta.md`). Staging check: see session report.
