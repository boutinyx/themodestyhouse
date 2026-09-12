import { LANES } from '@/lib/lanes';

/**
 * The site's top-level destinations, in one place: New In, every lane, and the
 * three index pages.
 *
 * Extracted from app/llms.txt/route.ts on 2026-09-12 because a SECOND consumer
 * appeared — the WebMCP tools (lib/webmcp.ts), which hand the same list to a
 * browser agent. Two copies would be the drift /llms.txt already suffered once
 * as a static file (12 lanes listed while lib/lanes.ts had 14).
 *
 * Client-safe on purpose: it imports only lib/lanes.ts, which components/Nav.tsx
 * already ships to the browser. Do NOT add a Node-only import here (§5,
 * Invariant 10) — the WebMCP component would stop building.
 */

export interface SiteSection {
  /** The URL path segment, without the leading slash. Also the WebMCP enum value. */
  slug: string;
  title: string;
  description: string;
}

export const SITE_SECTIONS: SiteSection[] = [
  { slug: 'new-in', title: 'New In', description: 'The latest pieces added, from a selected group of houses.' },
  // Driven off LANES, so a new lane appears here the moment it is routable —
  // the same source app/sitemap.ts uses, for the same reason.
  ...LANES.map((l) => ({ slug: l.slug, title: l.title, description: l.intro })),
  { slug: 'designers', title: 'Designers', description: 'A curated index of modest brands, vetted for craft and taste.' },
  { slug: 'editorial', title: 'The Edit', description: 'Stories, edits and styling from The Modesty House.' },
  // /about is deliberately absent from SEO_COPY (lib/seoCopy.test.ts's
  // STATIC_PATHS excludes it), so its description is the same literal
  // app/about/page.tsx sets — kept in step by hand, not invented here.
  {
    slug: 'about',
    title: 'About',
    description: 'What The Modesty House does, the problem it solves, how it solves it, and who is behind it.',
  },
];
