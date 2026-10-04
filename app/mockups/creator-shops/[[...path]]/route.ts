import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isProductionHost } from '@/lib/deployEnv';

/**
 * /mockups/creator-shops — the creator-shops design mockup, served from
 * `mockups/creator-shops/` (outside public/) so it can be gated by host.
 *
 * STAGING ONLY. It shows FICTIONAL creator profiles (AI-generated people, made-up
 * handles), which must never appear on themodestyhouse.com as if they were real.
 * Because `staging` is fast-forwarded into `main`, the files WILL reach the
 * production build; this handler is what keeps them unreachable there — it 404s
 * on any production host, keyed off the request host exactly like robots.ts and
 * the X-Robots-Tag header (lib/deployEnv.ts).
 * -> docs/log/2026-10-04-creator-shops-mockup-on-staging.md
 */

export const dynamic = 'force-dynamic';

const ROOT = path.join(process.cwd(), 'mockups', 'creator-shops');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (isProductionHost(host)) return new Response('Not found', { status: 404 });

  const parts = (await params).path ?? [];
  const file = path.normalize(path.join(ROOT, ...(parts.length ? parts : ['index.html'])));
  // Never serve anything outside the mockup folder.
  if (!file.startsWith(ROOT + path.sep)) return new Response('Not found', { status: 404 });

  const type = TYPES[path.extname(file)];
  if (!type) return new Response('Not found', { status: 404 });

  try {
    const body = await readFile(file);
    return new Response(new Uint8Array(body), {
      headers: {
        'content-type': type,
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex, nofollow, noarchive',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
