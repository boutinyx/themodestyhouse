import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { setLiveCut } from '@/lib/liveCuts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const blocked = await requireStaffSession();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  const { id, decision } = (body as { id?: unknown; decision?: unknown }) ?? {};
  if (typeof id !== 'string' || (decision !== 'keep' && decision !== 'cut')) {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  setLiveCut(id, decision);
  return NextResponse.json({ ok: true });
}
