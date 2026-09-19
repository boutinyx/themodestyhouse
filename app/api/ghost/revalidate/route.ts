import { after, NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { collectSlugs, pathsToRevalidate, verifySignature } from '@/lib/ghostWebhook';

export const dynamic = 'force-dynamic';

/**
 * Ghost calls this on post.published / post.published.edited / post.unpublished /
 * post.deleted (not post.edited: it fires on every draft keystroke save).
 *
 * Three rules that are not obvious:
 *  - NEVER answer 410. Ghost deletes a webhook permanently when it gets one.
 *  - Answer 200 BEFORE doing the work. Ghost times out at 2 s and retries five times; the
 *    work is idempotent, but there is no reason to make it retry.
 *  - Every rejection is the SAME 401 with the same body (the app/api/staff/login pattern),
 *    so a caller cannot tell a wrong secret from a missing header from a stale timestamp.
 */
const ORIGIN = 'https://themodestyhouse.com';

async function regenerateLocally(paths: string[]): Promise<void> {
  const base = `http://127.0.0.1:${process.env.PORT ?? 3000}`;
  for (const p of paths) {
    try {
      const res = await fetch(base + p, { cache: 'no-store' });
      console.log(`[ghost-webhook] regenerated ${p} -> ${res.status}`);
    } catch (err) {
      console.error(`[ghost-webhook] regenerate ${p} failed:`, err);
    }
  }
}

/**
 * Production only: staging has no CLOUDFLARE_ZONE_ID. Runs AFTER the local regeneration,
 * never before — a purge that runs while the origin is still stale makes the edge re-cache
 * the OLD page for another hour (CLAUDE.md §10.47).
 */
async function purgeCloudflare(paths: string[]): Promise<void> {
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!zone) return;
  if (!token) {
    console.error('[ghost-webhook] CLOUDFLARE_ZONE_ID is set but CLOUDFLARE_API_TOKEN is not; not purging');
    return;
  }
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: paths.map((p) => ORIGIN + p) }),
    });
    const body = await res.text();
    if (res.ok) console.log(`[ghost-webhook] purged ${paths.length} URLs at Cloudflare`);
    else console.error(`[ghost-webhook] Cloudflare purge failed ${res.status}: ${body}`);
  } catch (err) {
    console.error('[ghost-webhook] Cloudflare purge threw:', err);
  }
}

async function refresh(slugs: string[]): Promise<void> {
  const paths = pathsToRevalidate(slugs);
  revalidateTag('ghost-posts', { expire: 0 });
  for (const p of paths) revalidatePath(p);
  console.log(`[ghost-webhook] revalidated ${paths.join(' ')}`);
  await regenerateLocally(paths);
  await purgeCloudflare(paths);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get('x-ghost-signature'), process.env.GHOST_WEBHOOK_SECRET, Date.now())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    // A signed body that is not JSON is Ghost's problem, not a reason to make it retry.
  }

  after(() => refresh(collectSlugs(payload)));
  return NextResponse.json({ ok: true });
}
