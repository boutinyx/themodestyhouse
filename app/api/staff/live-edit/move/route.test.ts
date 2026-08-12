import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/staffSession', () => ({ requireStaffSession: vi.fn() }));
const { setLiveGarmentOverride } = vi.hoisted(() => ({ setLiveGarmentOverride: vi.fn() }));
vi.mock('@/lib/liveGarmentOverrides', () => ({ setLiveGarmentOverride }));
const { setLiveCut } = vi.hoisted(() => ({ setLiveCut: vi.fn() }));
vi.mock('@/lib/liveCuts', () => ({ setLiveCut }));

import { NextResponse, type NextRequest } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { POST } from './route';

function req(body: unknown): NextRequest {
  return new Request('http://x/api/staff/live-edit/move', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/staff/live-edit/move', () => {
  it('401s when not signed in', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(
      NextResponse.json({ ok: false }, { status: 401 }),
    );
    const res = await POST(req({ id: 'x:1', garment: 'skirt' }));
    expect(res.status).toBe(401);
    expect(setLiveGarmentOverride).not.toHaveBeenCalled();
  });

  it('400s on an unknown garment value', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ id: 'x:1', garment: 'not-a-garment' }));
    expect(res.status).toBe(400);
    expect(setLiveGarmentOverride).not.toHaveBeenCalled();
  });

  it('400s on a missing id', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ garment: 'skirt' }));
    expect(res.status).toBe(400);
  });

  it('sets the override, un-hides the product, and returns ok on a valid body', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ id: 'x:1', garment: 'skirt' }));
    expect(res.status).toBe(200);
    expect(setLiveGarmentOverride).toHaveBeenCalledWith('x:1', 'skirt');
    expect(setLiveCut).toHaveBeenCalledWith('x:1', 'keep');
  });
});
