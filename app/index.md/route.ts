import { llmsTxtBody, MARKDOWN_HEADERS } from '@/lib/agentGuidance';

/**
 * /index.md — the site root as markdown, for agents that ask for a page with
 * `.md` appended or look for a markdown file at the root.
 *
 * The same body as /llms.txt, which already is the markdown description of the
 * site root. It is advertised from the homepage with
 * `<link rel="alternate" type="text/markdown">` and a `Link` header.
 *
 * Deliberately NOT content negotiation on `/` (`Accept: text/markdown` → markdown).
 * Cloudflare caches the homepage HTML for an hour and ignores `Vary: Accept`
 * on HTML, so whichever variant was cached first would be served to everyone:
 * markdown to visitors, or HTML to agents (docs/log/2026-08-26-cloudflare-html-caching.md).
 * A separate URL has no such failure. The dot in the path also keeps it out of
 * the page-cache rule, same as /llms.txt.
 */
export const dynamic = 'force-static';

export function GET() {
  return new Response(llmsTxtBody(), { headers: MARKDOWN_HEADERS });
}
