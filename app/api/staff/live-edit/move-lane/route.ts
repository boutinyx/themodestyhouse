import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { setLiveLaneOverride } from '@/lib/liveLaneOverrides';
import { setLiveCut } from '@/lib/liveCuts';
import { LAYERING_SUBTYPE_LABELS, OUTERWEAR_SUBTYPE_LABELS } from '@/lib/specialty';
import type { ForcedLane, LayeringSubtype, OuterwearSubtype } from '@/lib/types';

export const dynamic = 'force-dynamic';

const FORCED_LANES: ForcedLane[] = ['modest-activewear', 'layering-basics', 'outerwear'];
const LAYERING_SUBTYPES = Object.keys(LAYERING_SUBTYPE_LABELS) as LayeringSubtype[];
const OUTERWEAR_SUBTYPES = Object.keys(OUTERWEAR_SUBTYPE_LABELS) as OuterwearSubtype[];
// Validated per-lane, deliberately not merged into one list — a layering
// subtype (e.g. 'under-dress') must never be savable onto an outerwear item
// and vice versa, since lib/products.ts and scripts/build-data.mjs write
// each lane's subtype into its own dedicated field.
const SUBTYPES_BY_LANE: Partial<Record<ForcedLane, string[]>> = {
  'layering-basics': LAYERING_SUBTYPES,
  outerwear: OUTERWEAR_SUBTYPES,
};

export async function POST(req: NextRequest) {
  const blocked = await requireStaffSession();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  const { id, lane, subtype } = (body as { id?: unknown; lane?: unknown; subtype?: unknown }) ?? {};
  if (typeof id !== 'string' || typeof lane !== 'string' || !FORCED_LANES.includes(lane as ForcedLane)) {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  const allowedSubtypes = SUBTYPES_BY_LANE[lane as ForcedLane];
  if (subtype !== undefined && (typeof subtype !== 'string' || !allowedSubtypes?.includes(subtype))) {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  setLiveLaneOverride(id, lane as ForcedLane, subtype as LayeringSubtype | OuterwearSubtype | undefined);
  // Same reasoning as the garment move route: a lane move must un-hide a
  // previously deleted item, so correcting a mistaken delete is one action.
  setLiveCut(id, 'keep');
  return NextResponse.json({ ok: true });
}
