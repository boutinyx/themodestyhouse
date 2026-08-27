import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { getLiveCuts } from '@/lib/liveCuts';
import { getLiveGarmentOverrides } from '@/lib/liveGarmentOverrides';
import { getLiveLaneOverrides } from '@/lib/liveLaneOverrides';
import { getLiveDressTypes } from '@/lib/liveDressTypes';
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

  const laneOverrides = getLiveLaneOverrides();
  const laneMoves = Object.entries(laneOverrides)
    .map(([id, entry]) => {
      const p = byId.get(id);
      if (!p) return null;
      return { id: p.id, title: p.title, url: p.url, image: p.image, to: entry.lane, subtype: entry.subtype };
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  // `from` is the type the site currently shows, which for a dress with no
  // curated value at all is null — that is the normal case here, since this
  // control exists precisely because 2,005 dresses have none.
  const dressTypeStore = getLiveDressTypes();
  const dressTypes = Object.entries(dressTypeStore)
    .map(([id, entry]) => {
      const p = byId.get(id);
      if (!p) return null;
      return {
        id: p.id, title: p.title, url: p.url, image: p.image,
        from: p.curatedDressSubtype ?? null, to: entry.subtype,
      };
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  return NextResponse.json({ deletes, moves, laneMoves, dressTypes });
}
