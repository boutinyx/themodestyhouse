/**
 * The URLs of the site's agent-facing files. Import-free on purpose: next.config.ts
 * reads HOMEPAGE_AGENT_LINKS, and the config cannot resolve the `@/` alias or
 * pull in lib/agentGuidance.ts's filesystem imports.
 */
export const MARKDOWN_HOME_PATH = '/index.md';
export const SKILL_NAME = 'find-modest-clothing';
export const SKILL_PATH = `/.well-known/agent-skills/${SKILL_NAME}/SKILL.md`;
export const SKILL_INDEX_PATH = '/.well-known/agent-skills/index.json';
export const ARD_PATH = '/.well-known/ard.json';

/** RFC 8288 `Link` header value for the homepage. */
export const HOMEPAGE_AGENT_LINKS = [
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  `<${MARKDOWN_HOME_PATH}>; rel="alternate"; type="text/markdown"`,
].join(', ');
