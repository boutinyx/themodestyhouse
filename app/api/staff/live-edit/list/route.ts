import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { getLiveCuts } from '@/lib/liveCuts';
import { getLiveGarmentOverrides } from '@/lib/liveGarmentOverrides';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Reads data/products.json directly, same reasoning as
// app/api/staff/curate/list/route.ts: the tray needs to show a title/image
// for something already cut, which getProducts() would hide.
function loadAllProducts(): Product[] {
  const f = path.join(process.cwd(), 'data', 'products.json');
  if (!existsSync(f)) return [];
  return JSON.parse(readFileSync(f, 'utf8')) as Product[];
}

export async function GET() {
  const blocked = await requireStaffSession();
  if (blocked) return blocked;

  const products = loadAllProducts();
  const byId = new Map(products.map((p) => [p.id, p]));

  const cuts = getLiveCuts();
  const deletes = Object.entries(cuts)
    .filter(([, v]) => v.decision === 'cut')
    .map(([id]) => byId.get(id))
    .filter((p): p is Product => Boolean(p))
    .map((p) => ({ id: p.id, title: p.title, url: p.url, image: p.image }));

  const overrides = getLiveGarmentOverrides();
  const moves = Object.entries(overrides)
    .map(([id, entry]) => {
      const p = byId.get(id);
      if (!p) return null;
      return { id: p.id, title: p.title, url: p.url, image: p.image, from: p.garment, to: entry.garment };
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  return NextResponse.json({ deletes, moves });
}
