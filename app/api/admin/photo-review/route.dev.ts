import { NextResponse } from 'next/server';
import { dismissPhotoReview, excludeProduct } from '@/lib/rawData';
import { devOnlyResponse } from '@/lib/devOnly';

// LOCAL-ONLY — see app/api/curate/route.dev.ts.
export async function POST(req: Request) {
  const blocked = devOnlyResponse(); // LAYER 3 (NODE_ENV based)
  if (blocked) return blocked;

  const { id, action } = await req.json();
  if (typeof id !== 'string' || (action !== 'dismiss' && action !== 'exclude')) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // LAYER 4 (sentinel based) guards inside each write.
  if (action === 'dismiss') dismissPhotoReview(id);
  else excludeProduct(id);
  return NextResponse.json({ ok: true });
}
