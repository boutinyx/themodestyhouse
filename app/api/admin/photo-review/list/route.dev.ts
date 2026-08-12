import { NextResponse } from 'next/server';
import { loadReview } from '@/lib/rawData';
import { devOnlyResponse } from '@/lib/devOnly';

// LOCAL-ONLY — see app/api/curate/route.dev.ts for the 4-layer guard this
// project uses everywhere under /admin and /api/admin.
export async function GET() {
  const blocked = devOnlyResponse(); // LAYER 3 (NODE_ENV based)
  if (blocked) return blocked;

  // LAYER 4 (sentinel based) guards inside the loader.
  const items = (loadReview() as { why?: string }[]).filter(
    (r) => r.why === 'brand-flagged-photo-issue',
  );
  return NextResponse.json({ items });
}
