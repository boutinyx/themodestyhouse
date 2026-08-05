import { NextResponse } from 'next/server';
import { loadRaw, loadDecisions } from '@/lib/rawData';
import { devOnlyResponse } from '@/lib/devOnly';

// LOCAL-ONLY — see app/api/curate/route.dev.ts.
export async function GET() {
  const blocked = devOnlyResponse(); // LAYER 3 (NODE_ENV based)
  if (blocked) return blocked;

  // LAYER 4 (sentinel based) guards inside each loader.
  return NextResponse.json({ items: loadRaw(), decisions: loadDecisions() });
}
