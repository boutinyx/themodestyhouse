import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { getLiveCuts, getCutIds } from '@/lib/liveCuts';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Reads data/products.json directly rather than lib/products.ts::getProducts()
// — that function already EXCLUDES live-cut ids (by design, for the public
// site), but the curate list needs to show a cut item too, greyed out, so a
// decision can be reversed. Same source file, cuts applied for DISPLAY only.
function loadAllProducts(): Product[] {
  const f = path.join(process.cwd(), 'data', 'products.json');
  if (!existsSync(f)) return [];
  return JSON.parse(readFileSync(f, 'utf8')) as Product[];
}

export async function GET() {
  const blocked = await requireStaffSession();
  if (blocked) return blocked;

  const items = loadAllProducts();
  const cuts = getLiveCuts();
  const decisions: Record<string, 'keep' | 'cut'> = {};
  for (const [id, entry] of Object.entries(cuts)) decisions[id] = entry.decision;

  return NextResponse.json({ items, decisions, cutCount: getCutIds().size });
}
