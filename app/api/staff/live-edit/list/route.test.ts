import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/staffSession', () => ({ requireStaffSession: vi.fn() }));
vi.mock('@/lib/liveCuts', () => ({
  getLiveCuts: () => ({ 'a:1': { decision: 'cut', decidedAt: '2026-01-01T00:00:00.000Z' } }),
}));
vi.mock('@/lib/liveGarmentOverrides', () => ({
  getLiveGarmentOverrides: () => ({ 'a:2': { garment: 'skirt', decidedAt: '2026-01-01T00:00:00.000Z' } }),
}));
vi.mock('@/lib/liveLaneOverrides', () => ({
  getLiveLaneOverrides: () => ({
    'a:3': { lane: 'layering-basics', subtype: 'under-dress', decidedAt: '2026-01-01T00:00:00.000Z' },
  }),
}));
vi.mock('node:fs', () => ({
  readFileSync: () =>
    JSON.stringify([
      { id: 'a:1', title: 'Cut Me', url: 'https://x/a1', image: 'https://x/a1.jpg', garment: 'top' },
      { id: 'a:2', title: 'Move Me', url: 'https://x/a2', image: 'https://x/a2.jpg', garment: 'top' },
      { id: 'a:3', title: 'Layer Me', url: 'https://x/a3', image: 'https://x/a3.jpg', garment: 'dress' },
    ]),
  existsSync: () => true,
}));

import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { GET } from './route';

describe('GET /api/staff/live-edit/list', () => {
  it('401s when not signed in', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(NextResponse.json({ ok: false }, { status: 401 }));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns deletes and moves with before/after garment', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await GET();
    const body = await res.json();
    expect(body.deletes).toEqual([{ id: 'a:1', title: 'Cut Me', url: 'https://x/a1', image: 'https://x/a1.jpg' }]);
    expect(body.moves).toEqual([
      { id: 'a:2', title: 'Move Me', url: 'https://x/a2', image: 'https://x/a2.jpg', from: 'top', to: 'skirt' },
    ]);
  });
});
