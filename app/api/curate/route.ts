import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadDecisions } from '@/lib/rawData';

export async function POST(req: NextRequest) {
  const { id, decision } = await req.json();
  if (!id || (decision !== 'keep' && decision !== 'cut')) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const decisions = loadDecisions();
  decisions[id] = decision;
  writeFileSync(path.join(process.cwd(), 'data', 'decisions.json'), JSON.stringify(decisions, null, 2));
  return NextResponse.json({ ok: true });
}
