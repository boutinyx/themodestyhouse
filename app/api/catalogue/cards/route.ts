import { NextResponse } from 'next/server';
import { cardSliceFor, CatalogueMovedError, type CardSource } from '@/lib/catalogueCards';

/**
 * Card data for a set of row indices — the server half of the index/card split
 * (lib/compactCatalogue.ts).
 *
 * POST rather than GET because the request is a list of up to 240 row indices;
 * as a query string that is a long, unbounded URL for no benefit. It is not
 * cacheable per-URL either way, and Cloudflare bypasses /api/* by rule
 * (docs/log/2026-08-26-cloudflare-html-caching.md), which is correct here.
 */
export const dynamic = 'force-dynamic';

interface Body {
  source?: CardSource;
  rows?: number[];
  rowCount?: number;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!body.source || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: 'source and rows are required' }, { status: 400 });
  }

  try {
    return NextResponse.json(cardSliceFor(body.source, body.rows, body.rowCount));
  } catch (e) {
    if (e instanceof CatalogueMovedError) {
      // 409 rather than 400: the request was well-formed, the world moved. The
      // client reloads rather than retrying — every row index it holds is now
      // stale, so a retry would fetch the WRONG products under the right
      // titles, which nothing downstream could detect.
      return NextResponse.json({ error: 'catalogue moved', reload: true }, { status: 409 });
    }
    throw e;
  }
}
