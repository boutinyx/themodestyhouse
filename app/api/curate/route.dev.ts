import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { saveDecision } from '@/lib/rawData';
import { devOnlyResponse } from '@/lib/devOnly';

// LOCAL-ONLY. `route.dev.ts` is only registered as a route when next.config.ts
// is in PHASE_DEVELOPMENT_SERVER, so this file is not part of any build. The
// guards below are layers 3 and 4, for the case where layer 1 is bypassed.
//
// Route handlers are dynamic by default since Next 15, so this guard genuinely
// runs per request. No `force-dynamic` needed.
export async function POST(req: NextRequest) {
  const blocked = devOnlyResponse(); // LAYER 3 (NODE_ENV based)
  if (blocked) return blocked;

  const { id, decision } = await req.json();
  if (typeof id !== 'string' || (decision !== 'keep' && decision !== 'cut')) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  saveDecision(id, decision); // LAYER 4 (sentinel based) guards again
  return NextResponse.json({ ok: true });
}
