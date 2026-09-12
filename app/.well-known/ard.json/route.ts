import { ardCatalog, DISCOVERY_JSON_HEADERS } from '@/lib/agentGuidance';

/** Agentic Resource Discovery catalog. Lists the Agent Skill only; see lib/agentGuidance.ts for why. */
export const dynamic = 'force-static';

export function GET() {
  return new Response(JSON.stringify(ardCatalog(), null, 2), { headers: DISCOVERY_JSON_HEADERS });
}
