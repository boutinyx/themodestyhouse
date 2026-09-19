import { llmsTxtBody } from '@/lib/agentGuidance';

/**
 * /llms.txt — generated, not hand-maintained.
 *
 * This replaces a static public/llms.txt that had already drifted: it listed
 * 12 lanes while lib/lanes.ts had 14, missing /layering-basics (added three
 * hours after llms.txt shipped) and /outerwear (added 2026-08-13). Both were
 * in sitemap.xml the whole time, so the two files disagreed about what the
 * site is.
 *
 * Be clear-eyed about the value: llms.txt is a proposed convention with no
 * committed consumer. docs/log/2026-08-08-robots-llmstxt-crawlability-audit.md
 * measured this already — Google states it has no effect on Search or AI
 * Overviews, no frontier lab commits to reading it, and Ahrefs found ~3% of
 * llms.txt files ever receive a request. Expected return: zero.
 *
 * The real reason this is a route and not a file: public/ is served with
 * `cache-control: max-age=14400` and is NOT fingerprinted, and unlike an
 * image (§6, §10.21) llms.txt cannot be renamed to bust that cache — its path
 * IS the spec. So every future edit to the static version carried a
 * guaranteed 4-hour stale window with no workaround. A route has none of that,
 * and it cannot drift from LANES because it is derived from it.
 *
 * NOTE: public/llms.txt must stay deleted. A static asset at the same path
 * shadows this route, and the failure is silent — the route still builds and
 * simply never serves.
 */

// Not force-static: the editorial list comes from Ghost (see app/index.md/route.ts).
export const revalidate = 3600;

export async function GET() {
  // The body lives in lib/agentGuidance.ts, shared with /index.md and the
  // Agent Skill, so the three cannot drift apart.
  const body = await llmsTxtBody();

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
