import { createHash } from 'node:crypto';
import { getPosts } from '@/lib/posts';
import { SITE_SECTIONS } from '@/lib/siteSections';
import { WEBMCP_TOOL_NAMES } from '@/lib/webmcp';
import { SKILL_NAME, SKILL_PATH, SKILL_INDEX_PATH } from '@/lib/agentPaths';

/**
 * Everything the site tells AI agents about itself, in one place, so the five
 * files that say it cannot disagree:
 *
 *   /llms.txt                                    llmsTxtBody()
 *   /index.md                                    llmsTxtBody(), as text/markdown
 *   /.well-known/agent-skills/<name>/SKILL.md    skillMarkdown()
 *   /.well-known/agent-skills/index.json         skillIndex(), digest of the SKILL.md bytes
 *   /.well-known/ard.json                        ardCatalog(), pointing at the skill
 *
 * Moved out of app/llms.txt/route.ts on 2026-09-13, when the second consumer
 * appeared. docs/log/2026-09-13-agent-discovery-files.md.
 *
 * NOTHING HERE IS BRAND COPY (§10.18). Every sentence is a plain functional
 * statement about what the site does, taken from lib/faq.ts, the page code or
 * the WebMCP tools. The one-paragraph description is the one /llms.txt already
 * carried. If a sentence ever needs to be persuasive, it is not this file's to write.
 *
 * Server-only: getPosts() reads the filesystem (§5, Invariant 10).
 */

export const SITE_ORIGIN = 'https://themodestyhouse.com';

/** Frontmatter `description`. The Agent Skills spec caps it at 1024 characters. */
export const SKILL_DESCRIPTION =
  "Find women's modest clothing (dresses, abayas, hijabs, skirts, tops, trousers, co-ord sets, outerwear, swimwear, activewear) " +
  'across many independent brands using The Modesty House directory at themodestyhouse.com, and get the link to buy each piece on the brand\'s own site.';

const INTRO = `The Modesty House is a curated women's modest-fashion directory: independent
Shopify storefronts, filtered to an aspirational, well-designed edit. It is
not a shop — there is no cart or checkout. Every product links out to the
brand's own site to complete a purchase.`;

function link(label: string, path: string, desc: string) {
  return `- [${label}](${SITE_ORIGIN}${path}): ${desc}`;
}

export function whenToUseSection(): string {
  return `## When to use this site

Use The Modesty House when someone wants to:

- Find women's modest clothing (dresses, abayas, hijabs, skirts, tops, trousers, co-ord sets, outerwear, swimwear, activewear) across many independent brands in one place.
- Compare what different modest brands offer in one category, and at what price.
- Find modest-fashion brands: the Designers index lists each house that has a page.
- Get a link to a specific piece on the brand's own site, to buy it there.

Do not use it for:

- Buying, checkout, order status, shipping, sizing or returns. There is no cart; each brand handles these on its own site.
- Menswear, perfume, bakhoor, candles or gift sets. These are excluded.
- A guaranteed live price or stock level. The catalogue is re-read nightly, so the brand's own product page is authoritative.`;
}

export function howToUseSection(): string {
  return `## How to use it

- Search: \`${SITE_ORIGIN}/new-in?q=<words>\` matches product titles and brand names as one phrase. It covers everyday clothing; hijabs, swimwear and activewear have their own sections below.
- Browse a category: open its section URL below.
- One brand: \`${SITE_ORIGIN}/designers/<brand-slug>\`. Every brand with a page, and its slug, is listed in [llms-full.txt](${SITE_ORIGIN}/llms-full.txt).
- In a browser that supports WebMCP, every page registers these tools: ${WEBMCP_TOOL_NAMES.map((n) => `\`${n}\``).join(', ')}.
- The same guidance as an Agent Skill: [${SKILL_NAME}](${SITE_ORIGIN}${SKILL_PATH}), listed in [agent-skills/index.json](${SITE_ORIGIN}${SKILL_INDEX_PATH}).`;
}

function sectionsList(): string {
  // lib/siteSections.ts: New In, every lane (driven off LANES), and the three
  // index pages — the same list the WebMCP tools hand to a browser agent.
  return SITE_SECTIONS.map((s) => link(s.title, `/${s.slug}`, s.description)).join('\n');
}

const ATTRIBUTION =
  "Product links are outbound affiliate links (`rel=\"sponsored\"`) to the listed brand's own storefront — price and availability are the brand's, not ours, and should be attributed to the brand, not to The Modesty House.";

export function llmsTxtBody(): string {
  // Editorial posts, newest first — getPosts() is already sorted, and this is
  // the one part of the site that is original long-form writing, so it is the
  // part most worth pointing an answer engine at.
  const posts = getPosts()
    .map((p) => link(p.title, `/editorial/${p.slug}`, p.dek || 'Editorial from The Modesty House.'))
    .join('\n');

  return `# The Modesty House

> The archive for everything modest. A curated index of modest brands and pieces.

${INTRO}

${whenToUseSection()}

${howToUseSection()}

## Sections

${sectionsList()}

## Editorial

${posts}

## Notes

- ${ATTRIBUTION}
- Editorial coverage (The Edit) is original and independently written.
- Full machine-readable listings: [sitemap.xml](${SITE_ORIGIN}/sitemap.xml).
- Everything above, with the content inlined instead of linked: [llms-full.txt](${SITE_ORIGIN}/llms-full.txt).
`;
}

export function skillMarkdown(): string {
  return `---
name: ${SKILL_NAME}
description: ${JSON.stringify(SKILL_DESCRIPTION)}
---

# Find modest clothing with The Modesty House

${INTRO}

Site: ${SITE_ORIGIN}

${whenToUseSection()}

${howToUseSection()}

## Sections

${sectionsList()}

## Rules

- ${ATTRIBUTION}
- Prices marked ≈ are approximate conversions. The brand's own price and currency are authoritative.
- Link to the product page on the brand's site; do not describe The Modesty House as the seller.
`;
}

export function sha256Digest(text: string): string {
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
}

/** Agent Skills discovery index, v0.2.0 (github.com/cloudflare/agent-skills-discovery-rfc). */
export function skillIndex() {
  return {
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: [
      {
        name: SKILL_NAME,
        type: 'skill-md',
        description: SKILL_DESCRIPTION,
        url: SKILL_PATH,
        // Of the exact bytes the SKILL.md route serves — lib/agentGuidance.test.ts
        // fetches that route and re-hashes it, so a skill edit cannot ship a stale digest.
        digest: sha256Digest(skillMarkdown()),
      },
    ],
  };
}

/**
 * Agentic Resource Discovery catalog (agenticresourcediscovery.org/spec).
 *
 * It lists the ONE agentic resource this site really has a document for: the
 * skill. ARD's types are MCP server cards, A2A agent cards, AI registries and
 * skills; we have no MCP server or A2A agent, and an entry for one would
 * advertise something that does not exist (§1). No `trustManifest` either —
 * that needs a cryptographic identity the site does not have.
 *
 * `specVersion`: the spec text defines only `entries` and calls other top-level
 * members transport-defined, but orank rejected the catalog on staging as
 * "invalid: missing specVersion". 0.91 is the current revision (published
 * 2026-08-26, per turva.dev's ARD guide; the spec repo was not reachable to
 * confirm the string format).
 */
export function ardCatalog() {
  return {
    specVersion: '0.91',
    entries: [
      {
        identifier: `urn:air:themodestyhouse.com:skill:${SKILL_NAME}`,
        displayName: 'The Modesty House — find modest clothing',
        type: 'application/ai-skill+md',
        url: `${SITE_ORIGIN}${SKILL_PATH}`,
        description: SKILL_DESCRIPTION,
        representativeQueries: [
          'find a long-sleeve maxi dress from an independent modest fashion brand',
          'which modest fashion brands sell kimono abayas',
          'where can I buy a chiffon hijab online',
          'show me modest swimwear from independent brands',
        ],
        tags: ['modest-fashion', 'womenswear', 'abayas', 'hijabs', 'directory'],
      },
    ],
  };
}

export const MARKDOWN_HEADERS = {
  'content-type': 'text/markdown; charset=utf-8',
  'cache-control': 'public, max-age=3600',
};

export const DISCOVERY_JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=3600',
  // Public, static, credential-free discovery documents: an agent running in a
  // browser page on another origin has to be able to read them.
  'access-control-allow-origin': '*',
};
