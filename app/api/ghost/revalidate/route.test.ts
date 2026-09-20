import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { afterCalls, revalidatePath, revalidateTag } = vi.hoisted(() => ({
  afterCalls: [] as Array<() => unknown>,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => {
    afterCalls.push(fn);
  },
}));
vi.mock('next/cache', () => ({ revalidatePath, revalidateTag }));

import { POST } from './route';

const SECRET = 's3cret';
const signed = (body: string, t = Date.now(), secret = SECRET) =>
  `sha256=${createHmac('sha256', secret).update(body + String(t)).digest('hex')}, t=${t}`;
const req = (body: string, sig?: string) =>
  new NextRequest('http://localhost/api/ghost/revalidate', {
    method: 'POST',
    body,
    headers: sig ? { 'x-ghost-signature': sig } : {},
  });

beforeEach(() => {
  afterCalls.length = 0;
  revalidatePath.mockClear();
  revalidateTag.mockClear();
  process.env.GHOST_WEBHOOK_SECRET = SECRET;
  delete process.env.CLOUDFLARE_ZONE_ID;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' }));
});

describe('POST /api/ghost/revalidate', () => {
  it('answers 200 for a valid signature and defers the work to after()', async () => {
    const body = JSON.stringify({ post: { current: { slug: 'a' }, previous: { slug: 'old' } } });
    const res = await POST(req(body, signed(body)));
    expect(res.status).toBe(200);
    expect(afterCalls).toHaveLength(1);
    expect(revalidatePath).not.toHaveBeenCalled(); // nothing yet: the work runs after the response

    await afterCalls[0]();
    expect(revalidateTag).toHaveBeenCalledWith('ghost-posts', { expire: 0 });
    const paths = revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toContain('/editorial/a');
    expect(paths).toContain('/editorial/old'); // the previous slug on a rename
    expect(paths).toContain('/');
  });

  it('never purges Cloudflare when no zone is configured (staging)', async () => {
    const body = JSON.stringify({ post: { current: { slug: 'a' } } });
    await POST(req(body, signed(body)));
    await afterCalls[0]();
    const urls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('api.cloudflare.com'))).toBe(false);
  });

  it('purges after regenerating when a zone is configured (production, §10.47)', async () => {
    process.env.CLOUDFLARE_ZONE_ID = 'zone1';
    process.env.CLOUDFLARE_API_TOKEN = 'tok';
    const body = JSON.stringify({ post: { current: { slug: 'a' } } });
    await POST(req(body, signed(body)));
    await afterCalls[0]();
    const urls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    const firstLocal = urls.findIndex((u) => u.startsWith('http://127.0.0.1'));
    const purge = urls.findIndex((u) => u.includes('api.cloudflare.com'));
    expect(firstLocal).toBeGreaterThanOrEqual(0);
    expect(purge).toBeGreaterThan(firstLocal);
    // A purge by URL returns success and does nothing on this zone (measured 2026-09-20), so the
    // body must ask for the whole zone. This assertion is what stops a "tidy-up" back to `files`.
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[purge];
    expect(JSON.parse(call[1].body)).toEqual({ purge_everything: true });
  });

  it('returns the identical 401 for a wrong secret, a missing header, a stale timestamp and an unset env', async () => {
    const body = JSON.stringify({ post: { current: { slug: 'a' } } });
    const cases: Array<[string, () => Promise<Response>]> = [
      ['wrong secret', () => POST(req(body, signed(body, Date.now(), 'nope')))],
      ['missing header', () => POST(req(body))],
      ['stale', () => POST(req(body, signed(body, Date.now() - 10 * 60_000)))],
      [
        'unset env',
        () => {
          delete process.env.GHOST_WEBHOOK_SECRET;
          return POST(req(body, signed(body)));
        },
      ],
    ];
    const seen: string[] = [];
    for (const [name, run] of cases) {
      const res = await run();
      expect(res.status, name).toBe(401);
      seen.push(await res.text());
    }
    expect(new Set(seen).size).toBe(1);
    expect(afterCalls).toHaveLength(0);
  });

  it('still answers 200 to a signed body that is not JSON, and never 410', async () => {
    const res = await POST(req('not json', signed('not json')));
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(410);
  });
});
