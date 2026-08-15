import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/staffSession', () => ({ requireStaffSession: vi.fn() }));
vi.mock('@/lib/liveCuts', () => ({
  getLiveCuts: () => ({ 'a:1': { decision: 'cut', decidedAt: '2026-01-01T00:00:00.000Z' } }),
  getCutIds: () => new Set(['a:1']),
}));
vi.mock('node:fs', () => ({
  readFileSync: () =>
    JSON.stringify([
      { id: 'a:1', brandSlug: 'a', title: 'Old Cut Item', firstSeen: '2026-08-05', garment: 'top' },
      { id: 'a:2', brandSlug: 'a', title: 'Older Item', firstSeen: '2026-08-10', garment: 'dress' },
      { id: 'a:3', brandSlug: 'a', title: 'Newest Item One', firstSeen: '2026-08-13', garment: 'abaya' },
      { id: 'b:4', brandSlug: 'b', title: 'Newest Item Two', firstSeen: '2026-08-13', garment: 'skirt' },
      { id: 'b:5', brandSlug: 'b', title: 'No Date Item' /* firstSeen absent */, garment: 'set' },
    ]),
  existsSync: () => true,
}));

import { NextResponse, NextRequest } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { GET } from './route';

const req = (url: string) => new NextRequest(new URL(url, 'https://x.test'));

describe('GET /api/staff/curate/list', () => {
  it('401s when not signed in', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(NextResponse.json({ ok: false }, { status: 401 }));
    const res = await GET(req('https://x.test/api/staff/curate/list'));
    expect(res.status).toBe(401);
  });

  it('returns every product with no scope param', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await GET(req('https://x.test/api/staff/curate/list'));
    const body = await res.json();
    expect(body.items).toHaveLength(5);
    expect(body.decisions).toEqual({ 'a:1': 'cut' });
    expect(body.cutCount).toBe(1);
  });

  it('scope=recent returns only rows at the max firstSeen date', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await GET(req('https://x.test/api/staff/curate/list?scope=recent'));
    const body = await res.json();
    expect(body.mostRecent).toBe('2026-08-13');
    expect(body.items.map((p: { id: string }) => p.id)).toEqual(['a:3', 'b:4']);
  });

  it('scope=brand returns only that brand’s rows', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await GET(req('https://x.test/api/staff/curate/list?scope=brand&brand=b'));
    const body = await res.json();
    expect(body.items.map((p: { id: string }) => p.id)).toEqual(['b:4', 'b:5']);
  });

  it('scope=brand with no brand param returns nothing', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await GET(req('https://x.test/api/staff/curate/list?scope=brand'));
    const body = await res.json();
    expect(body.items).toEqual([]);
  });
});
