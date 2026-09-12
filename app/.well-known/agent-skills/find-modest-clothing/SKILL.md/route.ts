import { skillMarkdown, MARKDOWN_HEADERS } from '@/lib/agentGuidance';

/** The site's one Agent Skill. Listed, with its digest, in ../index.json. */
export const dynamic = 'force-static';

export function GET() {
  return new Response(skillMarkdown(), { headers: MARKDOWN_HEADERS });
}
