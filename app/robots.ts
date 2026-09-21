import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { isProductionHost, PRODUCTION_ORIGIN } from '@/lib/deployEnv';

// The affiliate model only pays out on a click-through, so an AI answer that
// cites a brand and links out is worth exactly as much as a Google click —
// there is no reason to block the crawlers that feed AI Overviews, ChatGPT,
// Perplexity, etc. All of these already fall under the `*` allow rule below;
// listing them explicitly is a hedge against a future narrower `*` rule
// silently catching them too, and documents the decision.
const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'Claude-User',
  'PerplexityBot',
  'Google-Extended',
  'CCBot',
];

/*
 * Reading the Host header makes this route dynamic (it can no longer be
 * emitted as a static file at build time), which is exactly what we want: one
 * build artifact is deployed to both production and staging, so the answer
 * cannot be baked in at build time — it has to be decided per request, from
 * the hostname the request actually arrived on. See lib/deployEnv.ts for why
 * the host and not an env var.
 *
 * This is only half the guard. The other half is the blanket `X-Robots-Tag:
 * noindex, nofollow, noarchive` in next.config.ts, which covers every response
 * off a non-production host, not just this one file. robots.txt asks a crawler
 * not to FETCH; X-Robots-Tag tells it not to INDEX what it fetched anyway —
 * they are different instructions and staging wants both.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host');

  if (!isProductionHost(host)) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/'] },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/', disallow: ['/admin/', '/api/'] })),
    ],
    sitemap: [`${PRODUCTION_ORIGIN}/sitemap.xml`, `${PRODUCTION_ORIGIN}/sitemap-images.xml`],
    host: PRODUCTION_ORIGIN,
  };
}
