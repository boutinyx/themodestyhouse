import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { GET as GET_LLMS } from '../app/llms.txt/route';
import { GET as GET_INDEX_MD } from '../app/index.md/route';
import { GET as GET_SKILL } from '../app/.well-known/agent-skills/find-modest-clothing/SKILL.md/route';
import { GET as GET_SKILL_INDEX } from '../app/.well-known/agent-skills/index.json/route';
import { GET as GET_ARD } from '../app/.well-known/ard.json/route';
import { SKILL_NAME, SKILL_PATH, HOMEPAGE_AGENT_LINKS, MARKDOWN_HOME_PATH } from './agentPaths';
import { SITE_SECTIONS } from './siteSections';
import { WEBMCP_TOOL_NAMES } from './webmcp';

/**
 * The agent-facing files (lib/agentGuidance.ts). The failures these guard
 * against are the quiet ones: a digest that no longer matches the skill after
 * someone edits a sentence (a client verifying it would reject the skill), a
 * route path that no longer matches the URL the index advertises, and the files
 * drifting apart from each other.
 */

describe('/index.md', () => {
  it('serves the same body as /llms.txt, as markdown', async () => {
    const md = await GET_INDEX_MD();
    expect(md.headers.get('content-type')).toMatch(/^text\/markdown/);
    const body = await md.text();
    expect(body.startsWith('# The Modesty House')).toBe(true);
    expect(body).toBe(await (await GET_LLMS()).text());
  });
});

describe('Agent Skill', () => {
  it('has a spec-valid name, and the route lives at the path the index advertises', () => {
    // 1-64 chars, lowercase alphanumerics and single hyphens, no leading/trailing hyphen.
    expect(SKILL_NAME).toMatch(/^(?!-)(?!.*--)[a-z0-9-]{1,64}(?<!-)$/);
    expect(SKILL_PATH).toBe(`/.well-known/agent-skills/${SKILL_NAME}/SKILL.md`);
    // The import above is app/.well-known/agent-skills/find-modest-clothing/SKILL.md,
    // so a renamed skill without a moved route fails here rather than 404ing live.
    expect(SKILL_NAME).toBe('find-modest-clothing');
  });

  it('opens with frontmatter naming the skill and a description under 1024 characters', async () => {
    const res = await GET_SKILL();
    expect(res.headers.get('content-type')).toMatch(/^text\/markdown/);
    const body = await res.text();
    const fm = body.match(/^---\nname: (.+)\ndescription: (.+)\n---\n/);
    expect(fm, 'frontmatter').not.toBeNull();
    expect(fm![1]).toBe(SKILL_NAME);
    const description = JSON.parse(fm![2]) as string;
    expect(description.length).toBeGreaterThan(40);
    expect(description.length).toBeLessThanOrEqual(1024);
    for (const n of WEBMCP_TOOL_NAMES) expect(body, n).toContain(n);
    for (const s of SITE_SECTIONS) expect(body, s.slug).toContain(`/${s.slug})`);
  });

  it('is listed in index.json with a digest of the exact bytes the route serves', async () => {
    const res = await GET_SKILL_INDEX();
    expect(res.headers.get('content-type')).toMatch(/^application\/json/);
    const index = JSON.parse(await res.text());
    expect(index.$schema).toBe('https://schemas.agentskills.io/discovery/0.2.0/schema.json');
    expect(index.skills).toHaveLength(1);
    const [skill] = index.skills;
    expect(skill).toMatchObject({ name: SKILL_NAME, type: 'skill-md', url: SKILL_PATH });
    const served = Buffer.from(await (await GET_SKILL()).arrayBuffer());
    expect(skill.digest).toBe(`sha256:${createHash('sha256').update(served).digest('hex')}`);
  });
});

describe('/.well-known/ard.json', () => {
  it('lists only the skill, with the fields ARD requires', async () => {
    const ard = JSON.parse(await (await GET_ARD()).text());
    expect(ard.specVersion).toBe('0.91');
    expect(ard.entries).toHaveLength(1);
    const [e] = ard.entries;
    expect(e.identifier).toMatch(/^urn:air:themodestyhouse\.com:[a-z-]+:[a-z0-9-]+$/);
    expect(e.type).toBe('application/ai-skill+md');
    expect(e.url).toBe(`https://themodestyhouse.com${SKILL_PATH}`);
    expect(e.displayName).toBeTruthy();
    expect(e.representativeQueries.length).toBeGreaterThanOrEqual(2);
    expect(e.representativeQueries.length).toBeLessThanOrEqual(5);
    // Exactly one of url / data.
    expect('data' in e).toBe(false);
  });
});

describe('homepage Link header', () => {
  it('points at the sitemap, llms.txt and the markdown twin', () => {
    expect(HOMEPAGE_AGENT_LINKS).toContain('</sitemap.xml>; rel="sitemap"');
    expect(HOMEPAGE_AGENT_LINKS).toContain('</llms.txt>; rel="describedby"');
    expect(HOMEPAGE_AGENT_LINKS).toContain(`<${MARKDOWN_HOME_PATH}>; rel="alternate"; type="text/markdown"`);
  });
});
