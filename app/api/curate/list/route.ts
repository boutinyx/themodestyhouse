import { NextResponse } from 'next/server';
import { loadRaw, loadDecisions } from '@/lib/rawData';

export async function GET() {
  return NextResponse.json({ items: loadRaw(), decisions: loadDecisions() });
}
