import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { clearLiveCuts } from '@/lib/liveCuts';
import { clearLiveGarmentOverrides } from '@/lib/liveGarmentOverrides';
import { clearLiveLaneOverrides } from '@/lib/liveLaneOverrides';
import { clearLiveDressTypes } from '@/lib/liveDressTypes';

export const dynamic = 'force-dynamic';

// Wipes the live-edit queue (docs/log/2026-08-15-clear-live-edits-button.md).
// Before this route, the "N pending" count in ReviewTray only ever reset on
// a redeploy — the queue lives on the running container's gitignored
// filesystem, which a redeploy rebuilds from git and therefore wipes as a
// side effect, but nothing let staff clear it on demand once its contents
// had already been merged into the tracked files via
// scripts/merge-live-edits.mjs. Intentionally no partial-clear option: the
// four stores are always merged together, so there's no case where
// clearing one without the others is correct.
export async function POST() {
  const blocked = await requireStaffSession();
  if (blocked) return blocked;

  clearLiveCuts();
  clearLiveGarmentOverrides();
  clearLiveLaneOverrides();
  clearLiveDressTypes();
  return NextResponse.json({ ok: true });
}
