import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/staffSession', () => ({ requireStaffSession: vi.fn() }));
const { clearLiveCuts } = vi.hoisted(() => ({ clearLiveCuts: vi.fn() }));
vi.mock('@/lib/liveCuts', () => ({ clearLiveCuts }));
const { clearLiveGarmentOverrides } = vi.hoisted(() => ({ clearLiveGarmentOverrides: vi.fn() }));
vi.mock('@/lib/liveGarmentOverrides', () => ({ clearLiveGarmentOverrides }));
const { clearLiveLaneOverrides } = vi.hoisted(() => ({ clearLiveLaneOverrides: vi.fn() }));
vi.mock('@/lib/liveLaneOverrides', () => ({ clearLiveLaneOverrides }));
// Mocked, not merely tolerated: unmocked, the real clearLiveDressTypes() writes
// data/.live-dress-types.json to disk every time the suite runs.
const { clearLiveDressTypes } = vi.hoisted(() => ({ clearLiveDressTypes: vi.fn() }));
vi.mock('@/lib/liveDressTypes', () => ({ clearLiveDressTypes }));

import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { POST } from './route';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/staff/live-edit/clear', () => {
  it('401s when not signed in, and clears nothing', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(
      NextResponse.json({ ok: false }, { status: 401 }),
    );
    const res = await POST();
    expect(res.status).toBe(401);
    expect(clearLiveCuts).not.toHaveBeenCalled();
    expect(clearLiveGarmentOverrides).not.toHaveBeenCalled();
    expect(clearLiveLaneOverrides).not.toHaveBeenCalled();
    expect(clearLiveDressTypes).not.toHaveBeenCalled();
  });

  it('clears all four live stores and returns ok when signed in', async () => {
    vi.mocked(requireStaffSession).mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(clearLiveCuts).toHaveBeenCalledTimes(1);
    expect(clearLiveGarmentOverrides).toHaveBeenCalledTimes(1);
    expect(clearLiveLaneOverrides).toHaveBeenCalledTimes(1);
    expect(clearLiveDressTypes).toHaveBeenCalledTimes(1);
  });
});
