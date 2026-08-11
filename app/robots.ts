import type { MetadataRoute } from 'next';

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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/'] },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/', disallow: ['/admin/', '/api/'] })),
    ],
    sitemap: 'https://themodestyhouse.com/sitemap.xml',
    host: 'https://themodestyhouse.com',
  };
}
