import { SITE_SECTIONS } from '@/lib/siteSections';

/**
 * WebMCP tools: what a browser agent can call on this site without driving the
 * page by pixels. Registered by components/WebMcpTools.tsx.
 *
 * WHAT WEBMCP IS, as measured rather than as marketed (2026-09-12): a proposed
 * standard, `document.modelContext.registerTool()`, in a Chrome origin trial
 * for versions 149-156. Without an origin-trial token or the
 * `--enable-features=WebMCP` flag, `document.modelContext` is UNDEFINED, so
 * for an ordinary visitor this module registers nothing and costs nothing.
 * It was added because an agent-readiness scan (orank) scores it; its real
 * reach today is Chrome with the trial enabled (orank also says ChatGPT's
 * desktop browser can call WebMCP tools — unverified here).
 * docs/log/2026-09-12-agent-readiness-webmcp-llms.md.
 *
 * FOUR THINGS CHROME 151 DOES THAT THE SPEC PAGE DOES NOT SAY, each measured
 * against the real API in Playwright Chromium 151 before this file was written:
 *   1. inputSchema is NOT enforced. `{}` reached execute() for a tool whose
 *      schema required a field. Every execute below validates its own input.
 *   2. A duplicate name THROWS (`InvalidStateError: Duplicate tool name`), so
 *      registration failures are collected and reported, never assumed away.
 *   3. Aborting the registration's AbortSignal unregisters the tool.
 *   4. execute()'s return value reaches the agent JSON-stringified — but if
 *      execute() THROWS, the agent gets only a generic "UnknownError: Tool was
 *      executed but the invocation failed", and the real message lands on the
 *      page as an uncaught error. So bad input is RETURNED as `{ error }`,
 *      which is the only way the agent learns what to fix.
 * Mocked tests are not evidence the tools register — a stubbed modelContext
 * passes whether or not the browser's does (see the log for the real run).
 *
 * Nothing here writes. Search and open_section navigate this tab to a page any
 * visitor could reach by clicking; get_visible_products and list_sections read.
 * No tool touches favourites, the currency picker, or anything staff-only.
 */

export interface VisibleProduct {
  brand: string;
  title: string;
  /** As displayed — an approximate conversion is marked with ≈ (lib/fx.ts). */
  price: string;
  /** The outbound link the card itself carries, UTM-tagged (lib/outbound.ts). */
  url: string;
}

export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown> | undefined) => Promise<unknown>;
}

export interface WebMcpDeps {
  /** Soft-navigates this tab to a same-origin path and resolves once the new page has rendered. */
  navigate: (path: string) => Promise<void>;
  /** The product cards currently rendered on the page. */
  visibleProducts: () => VisibleProduct[];
  /** location.pathname + location.search */
  currentPath: () => string;
}

export const MAX_QUERY_LENGTH = 100;
export const MAX_PRODUCTS = 100;
const DEFAULT_PRODUCTS = 24;

/** Every tool name, in registration order. lib/llmsFull.test.ts holds /llms.txt to this list. */
export const WEBMCP_TOOL_NAMES = ['search_catalogue', 'list_sections', 'open_section', 'get_visible_products'] as const;

/** A rejected call. Returned, never thrown — see point 4 above. */
export interface ToolError {
  error: string;
}

function fail(error: string): ToolError {
  return { error };
}

function readInput(input: unknown): Record<string, unknown> {
  // Chrome 151 hands execute() an object; a caller going through
  // executeTool() with a malformed string, or with no arguments at all, must
  // get an error that names the problem rather than a TypeError from deep inside.
  return input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
}

export function buildWebMcpTools(deps: WebMcpDeps): WebMcpTool[] {
  const sectionSlugs = SITE_SECTIONS.map((s) => s.slug);

  const tools: WebMcpTool[] = [
    {
      name: 'search_catalogue',
      description:
        'Search The Modesty House catalogue of women\'s modest clothing from independent brands, and show the results in this tab. ' +
        'The query is matched as one phrase against product titles and brand names, so use short terms ("linen dress", "kimono abaya") or a brand name. ' +
        'Search covers everyday clothing only: hijabs, swimwear and activewear are on their own sections — use open_section for those. ' +
        'Call get_visible_products afterwards to read the results.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 1, maxLength: MAX_QUERY_LENGTH, description: 'A product type, style, colour or brand name.' },
        },
        required: ['query'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      async execute(raw) {
        const { query } = readInput(raw);
        if (typeof query !== 'string' || query.trim() === '') {
          return fail('search_catalogue needs a non-empty "query" string.');
        }
        const q = query.trim();
        if (q.length > MAX_QUERY_LENGTH) {
          return fail(`"query" must be at most ${MAX_QUERY_LENGTH} characters.`);
        }
        const path = `/new-in?q=${encodeURIComponent(q)}`;
        await deps.navigate(path);
        return { opened: path, next: 'Call get_visible_products to read the matching products.' };
      },
    },
    {
      name: 'list_sections',
      description:
        'List the sections of The Modesty House — clothing categories (dresses, abayas, hijabs, skirts, swimwear…), New In, the Designers index and the editorial pages — with a one-line description of each. ' +
        'Pass a slug from this list to open_section.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      async execute() {
        return { sections: SITE_SECTIONS.map((s) => ({ ...s, path: `/${s.slug}` })) };
      },
    },
    {
      name: 'open_section',
      description:
        'Open one section of The Modesty House in this tab, for example a clothing category or the Designers index. ' +
        'Call get_visible_products afterwards to read the products it shows.',
      inputSchema: {
        type: 'object',
        properties: {
          slug: { type: 'string', enum: sectionSlugs, description: 'A section slug, as returned by list_sections.' },
        },
        required: ['slug'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      async execute(raw) {
        const { slug } = readInput(raw);
        if (typeof slug !== 'string' || !sectionSlugs.includes(slug)) {
          return fail(`open_section needs "slug" to be one of: ${sectionSlugs.join(', ')}.`);
        }
        await deps.navigate(`/${slug}`);
        return { opened: `/${slug}`, next: 'Call get_visible_products to read the products on it.' };
      },
    },
    {
      name: 'get_visible_products',
      description:
        'Read the product cards currently shown on this page: brand, title, displayed price and the link to buy it on the brand\'s own site. ' +
        'The Modesty House is a directory, not a shop — purchase, shipping, sizing and returns all happen on the brand\'s site. ' +
        'Prices marked ≈ are approximate conversions; the brand\'s own price and currency are authoritative.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: MAX_PRODUCTS, description: `How many cards to return, from the top of the page. Default ${DEFAULT_PRODUCTS}.` },
        },
        additionalProperties: false,
      },
      // Titles and brand names are the brands' own text, scraped from their
      // feeds — exactly what untrustedContentHint exists to flag.
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(raw) {
        const { limit } = readInput(raw);
        let n = DEFAULT_PRODUCTS;
        if (limit !== undefined) {
          if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > MAX_PRODUCTS) {
            return fail(`"limit" must be a whole number from 1 to ${MAX_PRODUCTS}.`);
          }
          n = limit;
        }
        const all = deps.visibleProducts();
        return { page: deps.currentPath(), shownOnPage: all.length, products: all.slice(0, n) };
      },
    },
  ];

  return tools;
}

/**
 * Reads the product cards in `root`. The card's outbound anchor carries
 * `data-surface="product-card"` (components/ProductCard.tsx) and is a SIBLING
 * of the brand, title and price lines, so the text is read from its parent.
 * A card missing any of the three is skipped rather than returned half-empty.
 */
export function readProductCards(root: ParentNode): VisibleProduct[] {
  const out: VisibleProduct[] = [];
  for (const a of root.querySelectorAll<HTMLAnchorElement>('a[data-surface="product-card"]')) {
    const card = a.parentElement;
    const brand = card?.querySelector('.brand-label')?.textContent?.trim();
    const title = card?.querySelector('.card-title')?.textContent?.trim();
    const price = card?.querySelector('.price')?.textContent?.trim();
    if (!brand || !title || !price || !a.href) continue;
    out.push({ brand, title, price, url: a.href });
  }
  return out;
}

/** The subset of the WebMCP ModelContext interface this site uses. */
export interface ModelContextLike {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => unknown;
}

/** For reading `document.modelContext` / `navigator.modelContext`, which lib.dom does not type yet. */
export interface WithModelContext {
  modelContext?: unknown;
}

/**
 * A usable ModelContext, or null. Deliberately takes the VALUE, not the object
 * that holds it: components/WebMcpTools.tsx must spell out
 * `document.modelContext` and `navigator.modelContext` literally. See the note
 * there for why a generic `obj.modelContext` helper cost the orank check.
 */
export function asModelContext(mc: unknown): ModelContextLike | null {
  return mc && typeof (mc as ModelContextLike).registerTool === 'function' ? (mc as ModelContextLike) : null;
}

export interface RegistrationResult {
  registered: string[];
  failed: { name: string; error: string }[];
}

/** Registers each tool independently, so one rejected name cannot take the others down with it. */
export async function registerWebMcpTools(
  ctx: ModelContextLike,
  tools: WebMcpTool[],
  signal: AbortSignal,
): Promise<RegistrationResult> {
  const result: RegistrationResult = { registered: [], failed: [] };
  for (const tool of tools) {
    try {
      await ctx.registerTool(tool, { signal });
      result.registered.push(tool.name);
    } catch (e) {
      result.failed.push({ name: tool.name, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
    }
  }
  return result;
}
