import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse, type NextRequest } from 'next/server';

vi.mock('@/lib/staffSession', () => ({ requireStaffSession: vi.fn() }));
const { setLiveDressType } = vi.hoisted(() => ({ setLiveDressType: vi.fn() }));
vi.mock('@/lib/liveDressTypes', () => ({ setLiveDressType }));
const { setLiveCut } = vi.hoisted(() => ({ setLiveCut: vi.fn() }));
vi.mock('@/lib/liveCuts', () => ({ setLiveCut }));

import { requireStaffSession } from '@/lib/staffSession';
import { POST } from './route';

function req(body: unknown): NextRequest {
  return new Request('http://x/api/staff/live-edit/dress-type', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/staff/live-edit/dress-type', () => {
  it('401s when not signed in', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(NextResponse.json({ ok: false }, { status: 401 }));
    const res = await POST(req({ id: 'x:1', subtype: 'slip' }));
    expect(res.status).toBe(401);
    expect(setLiveDressType).not.toHaveBeenCalled();
  });

  it('400s on an unknown subtype', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ id: 'x:1', subtype: 'wedding' }));
    expect(res.status).toBe(400);
    expect(setLiveDressType).not.toHaveBeenCalled();
  });

  it('400s on a missing id', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ subtype: 'slip' }));
    expect(res.status).toBe(400);
    expect(setLiveDressType).not.toHaveBeenCalled();
  });

  it('400s on a body that is not JSON', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const bad = new Request('http://x/api/staff/live-edit/dress-type', {
      method: 'POST',
      body: 'not json',
    }) as unknown as NextRequest;
    const res = await POST(bad);
    expect(res.status).toBe(400);
    expect(setLiveDressType).not.toHaveBeenCalled();
  });

  it('saves each of the three real subtypes', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    for (const s of ['everyday', 'occasion', 'slip']) {
      const res = await POST(req({ id: `x:${s}`, subtype: s }));
      expect(res.status).toBe(200);
      expect(setLiveDressType).toHaveBeenCalledWith(`x:${s}`, s);
    }
  });

  // Setting a type on an item has to bring it back if it was deleted, so
  // correcting a mistaken delete is one action — same contract as the
  // garment-move and lane-move routes.
  it('un-hides a previously deleted item', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    await POST(req({ id: 'x:1', subtype: 'occasion' }));
    expect(setLiveCut).toHaveBeenCalledWith('x:1', 'keep');
  });
});
