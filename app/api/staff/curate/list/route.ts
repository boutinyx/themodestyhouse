import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
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

// The most recent ingest date in the catalogue, from firstSeen — not
// hardcoded to any one brand batch, so "recently added" stays correct
// after every future refresh/add-brands run without code changes.
function mostRecentFirstSeen(items: Product[]): string | null {
  let max: string | null = null;
  for (const p of items) {
    if (p.firstSeen && (!max || p.firstSeen > max)) max = p.firstSeen;
  }
  return max;
}

export async function GET(req: NextRequest) {
  const blocked = await requireStaffSession();
  if (blocked) return blocked;

  const items = loadAllProducts();
  const cuts = getLiveCuts();
  const decisions: Record<string, 'keep' | 'cut'> = {};
  for (const [id, entry] of Object.entries(cuts)) decisions[id] = entry.decision;

  // ?scope=recent filters server-side, before the 12MB catalogue ever
  // reaches the browser — products.json is too large to ship whole to a
  // page that only wants the newest arrivals.
  if (req.nextUrl.searchParams.get('scope') === 'recent') {
    const mostRecent = mostRecentFirstSeen(items);
    const recent = mostRecent ? items.filter((p) => p.firstSeen === mostRecent) : [];
    return NextResponse.json({ items: recent, decisions, cutCount: getCutIds().size, mostRecent });
  }

  // ?scope=brand&brand=<slug> — everything CURRENTLY PUBLISHED for one
  // brand, for reviewing/recategorizing a brand wholesale (not just its
  // newest arrivals). Same server-side filter reasoning as scope=recent.
  if (req.nextUrl.searchParams.get('scope') === 'brand') {
    const brand = req.nextUrl.searchParams.get('brand') || '';
    const forBrand = brand ? items.filter((p) => p.brandSlug === brand) : [];
    return NextResponse.json({ items: forBrand, decisions, cutCount: getCutIds().size, mostRecent: null });
  }

  return NextResponse.json({ items, decisions, cutCount: getCutIds().size });
}
