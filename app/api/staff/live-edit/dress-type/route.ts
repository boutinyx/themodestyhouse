import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { setLiveDressType } from '@/lib/liveDressTypes';
import { setLiveCut } from '@/lib/liveCuts';
import { DRESS_SUBTYPE_LABELS } from '@/lib/specialty';
import type { DressSubtype } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Derived from the label map rather than written out again, so a fourth dress
// type can never be addable in the menu and rejected here — the two would drift
// silently and look like a broken button.
const DRESS_SUBTYPES = Object.keys(DRESS_SUBTYPE_LABELS) as DressSubtype[];

export async function POST(req: NextRequest) {
  const blocked = await requireStaffSession();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  const { id, subtype } = (body as { id?: unknown; subtype?: unknown }) ?? {};
  if (typeof id !== 'string' || typeof subtype !== 'string' || !DRESS_SUBTYPES.includes(subtype as DressSubtype)) {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  setLiveDressType(id, subtype as DressSubtype);
  // Same reasoning as the garment-move and lane-move routes: setting a type on
  // an item must un-hide a previously deleted one, so correcting a mistaken
  // delete is a single action rather than two.
  setLiveCut(id, 'keep');
  return NextResponse.json({ ok: true });
}
