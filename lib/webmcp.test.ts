import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildWebMcpTools,
  asModelContext,
  registerWebMcpTools,
  WEBMCP_TOOL_NAMES,
  MAX_QUERY_LENGTH,
  type ModelContextLike,
  type WebMcpDeps,
  type WebMcpTool,
} from './webmcp';
import { SITE_SECTIONS } from './siteSections';
import { LANES } from './lanes';
import { GET as GET_LLMS } from '../app/llms.txt/route';

/**
 * These cover the tools' own logic. They do NOT prove the tools register in a
 * browser — a stubbed modelContext passes whether or not Chrome's does. That was
 * verified against real Chromium with the WebMCP feature on; see
 * docs/log/2026-09-12-agent-readiness-webmcp-llms.md.
 */

function deps(overrides: Partial<WebMcpDeps> = {}) {
  const navigate = vi.fn(async () => {});
  const d: WebMcpDeps = {
    navigate,
    visibleProducts: () => [],
    currentPath: () => '/modest-dresses',
    ...overrides,
  };
  return { d, navigate };
}

function tool(tools: WebMcpTool[], name: string) {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`no tool ${name}`);
  return t;
}

describe('WebMCP tool definitions', () => {
  it('builds exactly the tools WEBMCP_TOOL_NAMES declares, in order', () => {
    expect(buildWebMcpTools(deps().d).map((t) => t.name)).toEqual([...WEBMCP_TOOL_NAMES]);
  });

  it('uses names Chrome accepts, with no duplicate (a duplicate throws at registration)', () => {
    const names = buildWebMcpTools(deps().d).map((t) => t.name);
    for (const n of names) expect(n).toMatch(/^[A-Za-z0-9_.-]{1,64}$/);
    expect(new Set(names).size).toBe(names.length);
  });

  it('gives every tool a description and an object input schema', () => {
    for (const t of buildWebMcpTools(deps().d)) {
      expect(t.description.length, t.name).toBeGreaterThan(40);
      expect(t.inputSchema.type, t.name).toBe('object');
    }
  });

  it('marks only the two reading tools read-only, and flags scraped brand text as untrusted', () => {
    const tools = buildWebMcpTools(deps().d);
    expect(tools.filter((t) => t.annotations?.readOnlyHint).map((t) => t.name)).toEqual(['list_sections', 'get_visible_products']);
    expect(tool(tools, 'get_visible_products').annotations?.untrustedContentHint).toBe(true);
  });
});

describe('search_catalogue', () => {
  it('navigates to the same URL the header search uses, encoded', async () => {
    const { d, navigate } = deps();
    const out = await tool(buildWebMcpTools(d), 'search_catalogue').execute({ query: '  linen & silk dress ' });
    expect(navigate).toHaveBeenCalledWith('/new-in?q=linen%20%26%20silk%20dress');
    expect(out).toMatchObject({ opened: '/new-in?q=linen%20%26%20silk%20dress' });
  });

  // Chrome 151 does not enforce inputSchema (measured), so execute is the only
  // guard — and it RETURNS the error, because a thrown one never reaches the agent.
  it.each([
    [undefined],
    [{}],
    [{ query: '' }],
    [{ query: '   ' }],
    [{ query: 42 }],
    [{ query: 'x'.repeat(MAX_QUERY_LENGTH + 1) }],
  ])('rejects %j without navigating', async (input) => {
    const { d, navigate } = deps();
    const out = await tool(buildWebMcpTools(d), 'search_catalogue').execute(input as never);
    expect(out).toEqual({ error: expect.stringMatching(/query/) });
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('list_sections / open_section', () => {
  it('offers every lane, so a new lane is reachable the moment it is routable', async () => {
    const tools = buildWebMcpTools(deps().d);
    const listed = ((await tool(tools, 'list_sections').execute({})) as { sections: { slug: string; path: string }[] }).sections;
    for (const lane of LANES) expect(listed.map((s) => s.slug), lane.slug).toContain(lane.slug);
    for (const s of listed) expect(s.path).toBe(`/${s.slug}`);
    const schema = tool(tools, 'open_section').inputSchema as { properties: { slug: { enum: string[] } } };
    expect(schema.properties.slug.enum).toEqual(SITE_SECTIONS.map((s) => s.slug));
  });

  it('opens a listed section', async () => {
    const { d, navigate } = deps();
    await tool(buildWebMcpTools(d), 'open_section').execute({ slug: 'modest-abayas' });
    expect(navigate).toHaveBeenCalledWith('/modest-abayas');
  });

  it.each([[{ slug: 'directory' }], [{ slug: '../staff' }], [{}], [undefined]])('refuses %j without navigating', async (input) => {
    const { d, navigate } = deps();
    expect(await tool(buildWebMcpTools(d), 'open_section').execute(input as never)).toEqual({ error: expect.stringMatching(/slug/) });
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('get_visible_products', () => {
  const cards = Array.from({ length: 30 }, (_, i) => ({ brand: 'Aab', title: `Piece ${i}`, price: '≈ $40', url: `https://example.com/${i}` }));

  it('returns 24 by default, with the page and the total shown', async () => {
    const { d } = deps({ visibleProducts: () => cards });
    const out = (await tool(buildWebMcpTools(d), 'get_visible_products').execute({})) as { page: string; shownOnPage: number; products: unknown[] };
    expect(out.page).toBe('/modest-dresses');
    expect(out.shownOnPage).toBe(30);
    expect(out.products).toHaveLength(24);
  });

  it('honours a valid limit and rejects an invalid one', async () => {
    const { d } = deps({ visibleProducts: () => cards });
    const t = tool(buildWebMcpTools(d), 'get_visible_products');
    expect(((await t.execute({ limit: 3 })) as { products: unknown[] }).products).toHaveLength(3);
    for (const limit of [0, 101, 2.5, '5']) expect(await t.execute({ limit }), String(limit)).toEqual({ error: expect.stringMatching(/limit/) });
  });
});

describe('registration', () => {
  it('accepts only an object that can register a tool', () => {
    const a: ModelContextLike = { registerTool: () => {} };
    expect(asModelContext(a)).toBe(a);
    for (const bad of [undefined, null, {}, { registerTool: 'no' }]) expect(asModelContext(bad)).toBeNull();
  });

  // The precedence (document first, navigator only as fallback) lives in
  // components/WebMcpTools.tsx, spelled literally so the minified bundle still
  // says `document.modelContext`. This asserts the source says so; the built
  // bundle was checked separately (docs/log/2026-09-12-agent-readiness-webmcp-llms.md).
  it('names document.modelContext and navigator.modelContext literally, document first', () => {
    const src = readFileSync(fileURLToPath(new URL('../components/WebMcpTools.tsx', import.meta.url)), 'utf8');
    const code = src.replace(/\/\/.*$/gm, '');
    const doc = code.search(/\(document as [^)]*\)\.modelContext/);
    const nav = code.search(/\(navigator as [^)]*\)\.modelContext/);
    expect(doc, 'document.modelContext').toBeGreaterThan(-1);
    expect(nav, 'navigator.modelContext').toBeGreaterThan(doc);
  });

  it('reports a rejected tool and still registers the rest', async () => {
    const seen: string[] = [];
    const ctx: ModelContextLike = {
      registerTool: async (t) => {
        if (t.name === 'list_sections') throw Object.assign(new Error('Duplicate tool name'), { name: 'InvalidStateError' });
        seen.push(t.name);
      },
    };
    const res = await registerWebMcpTools(ctx, buildWebMcpTools(deps().d), new AbortController().signal);
    expect(res.failed).toEqual([{ name: 'list_sections', error: 'InvalidStateError: Duplicate tool name' }]);
    expect(res.registered).toEqual(seen);
    expect(res.registered).toHaveLength(WEBMCP_TOOL_NAMES.length - 1);
  });

  it('passes the abort signal, which is what unregisters the tools', async () => {
    const signals: (AbortSignal | undefined)[] = [];
    const ctx: ModelContextLike = { registerTool: (_t, o) => void signals.push(o?.signal) };
    const controller = new AbortController();
    await registerWebMcpTools(ctx, buildWebMcpTools(deps().d), controller.signal);
    expect(signals.every((s) => s === controller.signal)).toBe(true);
  });
});

describe('/llms.txt agent guidance', () => {
  it('has a when-to-use section and names exactly the registered tools', async () => {
    const body = await (await GET_LLMS()).text();
    expect(body).toContain('## When to use this site');
    expect(body).toContain('## How to use it');
    const line = body.split('\n').find((l) => l.includes('registers these tools'));
    expect(line, 'tool line').toBeDefined();
    const named = [...line!.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]);
    expect(named).toEqual([...WEBMCP_TOOL_NAMES]);
  });

  it('still lists every section', async () => {
    const body = await (await GET_LLMS()).text();
    for (const s of SITE_SECTIONS) expect(body, s.slug).toContain(`(https://themodestyhouse.com/${s.slug})`);
  });
});
