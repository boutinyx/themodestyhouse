import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse, type NextRequest } from 'next/server';

vi.mock('@/lib/staffSession', () => ({ requireStaffSession: vi.fn() }));
const { setLiveLaneOverride } = vi.hoisted(() => ({ setLiveLaneOverride: vi.fn() }));
vi.mock('@/lib/liveLaneOverrides', () => ({ setLiveLaneOverride }));
const { setLiveCut } = vi.hoisted(() => ({ setLiveCut: vi.fn() }));
vi.mock('@/lib/liveCuts', () => ({ setLiveCut }));

import { requireStaffSession } from '@/lib/staffSession';
import { POST } from './route';

function req(body: unknown): NextRequest {
  return new Request('http://x/api/staff/live-edit/move-lane', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/staff/live-edit/move-lane', () => {
  it('401s when not signed in', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(NextResponse.json({ ok: false }, { status: 401 }));
    const res = await POST(req({ id: 'x:1', lane: 'modest-activewear' }));
    expect(res.status).toBe(401);
    expect(setLiveLaneOverride).not.toHaveBeenCalled();
  });

  it('400s on an unknown lane value', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ id: 'x:1', lane: 'not-a-lane' }));
    expect(res.status).toBe(400);
    expect(setLiveLaneOverride).not.toHaveBeenCalled();
  });

  it('400s on a missing id', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ lane: 'modest-activewear' }));
    expect(res.status).toBe(400);
  });

  it('400s on an unknown subtype value', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ id: 'x:1', lane: 'layering-basics', subtype: 'not-a-subtype' }));
    expect(res.status).toBe(400);
    expect(setLiveLaneOverride).not.toHaveBeenCalled();
  });

  it('sets a lane override with no subtype for modest-activewear, and un-hides the product', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ id: 'x:1', lane: 'modest-activewear' }));
    expect(res.status).toBe(200);
    expect(setLiveLaneOverride).toHaveBeenCalledWith('x:1', 'modest-activewear', undefined);
    expect(setLiveCut).toHaveBeenCalledWith('x:1', 'keep');
  });

  it('sets a lane override with a subtype for layering-basics, and un-hides the product', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ id: 'x:1', lane: 'layering-basics', subtype: 'under-dress' }));
    expect(res.status).toBe(200);
    expect(setLiveLaneOverride).toHaveBeenCalledWith('x:1', 'layering-basics', 'under-dress');
    expect(setLiveCut).toHaveBeenCalledWith('x:1', 'keep');
  });

  it('sets a lane override with a subtype for outerwear, and un-hides the product', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ id: 'x:1', lane: 'outerwear', subtype: 'cardigan' }));
    expect(res.status).toBe(200);
    expect(setLiveLaneOverride).toHaveBeenCalledWith('x:1', 'outerwear', 'cardigan');
    expect(setLiveCut).toHaveBeenCalledWith('x:1', 'keep');
  });

  it('400s a layering subtype applied to the outerwear lane', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ id: 'x:1', lane: 'outerwear', subtype: 'under-dress' }));
    expect(res.status).toBe(400);
    expect(setLiveLaneOverride).not.toHaveBeenCalled();
  });

  it('400s an outerwear subtype applied to the layering-basics lane', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ id: 'x:1', lane: 'layering-basics', subtype: 'cardigan' }));
    expect(res.status).toBe(400);
    expect(setLiveLaneOverride).not.toHaveBeenCalled();
  });

  it('400s any subtype applied to modest-activewear', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST(req({ id: 'x:1', lane: 'modest-activewear', subtype: 'cardigan' }));
    expect(res.status).toBe(400);
    expect(setLiveLaneOverride).not.toHaveBeenCalled();
  });
});
