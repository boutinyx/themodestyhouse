import { NextResponse } from 'next/server';
import { loadReview, loadGarmentOverrides } from '@/lib/rawData';
import { devOnlyResponse } from '@/lib/devOnly';

// LOCAL-ONLY — see app/api/curate/route.dev.ts for the 4-layer guard this
// project uses everywhere under /admin and /api/admin.
export async function GET() {
  const blocked = devOnlyResponse(); // LAYER 3 (NODE_ENV based)
  if (blocked) return blocked;

  // LAYER 4 (sentinel based) guards inside each loader.
  const items = (loadReview() as { why?: string }[]).filter((r) =>
    ['signal-conflict', 'weak-signal', 'unclassified'].includes(r.why || ''),
  );
  return NextResponse.json({ items, overrides: loadGarmentOverrides() });
}
