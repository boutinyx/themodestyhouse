import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { setLiveGarmentOverride } from '@/lib/liveGarmentOverrides';
import { setLiveCut } from '@/lib/liveCuts';
import { GARMENT_VALUES } from '@/lib/tag';
import type { Garment } from '@/lib/types';

export const dynamic = 'force-dynamic';

// 'other' is a held-for-review state, never a destination a human picks —
// the picker only offers the 8 garments that actually publish.
const MOVABLE_GARMENTS = GARMENT_VALUES.filter((g) => g !== 'other') as Garment[];

export async function POST(req: NextRequest) {
  const blocked = await requireStaffSession();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  const { id, garment } = (body as { id?: unknown; garment?: unknown }) ?? {};
  if (typeof id !== 'string' || typeof garment !== 'string' || !MOVABLE_GARMENTS.includes(garment as Garment)) {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  setLiveGarmentOverride(id, garment as Garment);
  // A move is an unambiguous "this belongs, visibly, right here" — clear
  // any prior delete so a corrected item never stays hidden after being
  // recategorised. See docs/log/2026-08-12-inline-staff-editing.md.
  setLiveCut(id, 'keep');
  return NextResponse.json({ ok: true });
}
