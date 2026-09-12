import { skillIndex, DISCOVERY_JSON_HEADERS } from '@/lib/agentGuidance';

/** Agent Skills discovery index, v0.2.0. See lib/agentGuidance.ts. */
export const dynamic = 'force-static';

export function GET() {
  return new Response(JSON.stringify(skillIndex(), null, 2), { headers: DISCOVERY_JSON_HEADERS });
}
