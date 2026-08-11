import { NextResponse } from 'next/server';
import { saveGarmentOverride } from '@/lib/rawData';
import { devOnlyResponse } from '@/lib/devOnly';
import { GARMENT_VALUES } from '@/lib/tag';

// LOCAL-ONLY — see app/api/curate/route.dev.ts.
export async function POST(req: Request) {
  const blocked = devOnlyResponse(); // LAYER 3 (NODE_ENV based)
  if (blocked) return blocked;

  const { id, garment } = await req.json();
  if (typeof id !== 'string' || !GARMENT_VALUES.includes(garment)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  saveGarmentOverride(id, garment); // LAYER 4 (sentinel based) guards again
  return NextResponse.json({ ok: true });
}
