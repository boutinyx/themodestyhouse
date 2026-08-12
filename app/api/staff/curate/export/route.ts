import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { getLiveCuts } from '@/lib/liveCuts';

export const dynamic = 'force-dynamic';

// Downloadable snapshot of every live decision, for the deliberate manual
// step (scripts/merge-live-cuts.mjs) that folds these into the git-tracked
// data/decisions.json. See docs/log/2026-08-12-staff-curate.md.
export async function GET() {
  const blocked = await requireStaffSession();
  if (blocked) return blocked;

  const cuts = getLiveCuts();
  const body = JSON.stringify(cuts, null, 2);
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="live-cuts-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
