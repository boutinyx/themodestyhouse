import { describe, it, expect } from 'vitest';
import { GET } from '../app/mockups/creator-shops/[[...path]]/route';

// The creator-shops mockup shows FICTIONAL creator profiles. It is served on
// staging for review and must be unreachable on the real domain, even after
// staging is fast-forwarded into main.
const call = (host: string, path?: string[]) =>
  GET(new Request(`https://${host}/mockups/creator-shops`, { headers: { host } }), {
    params: Promise.resolve({ path }),
  });

describe('/mockups/creator-shops', () => {
  it('404s on the production domain', async () => {
    expect((await call('themodestyhouse.com')).status).toBe(404);
    expect((await call('www.themodestyhouse.com', ['layla.jpg'])).status).toBe(404);
  });

  it('serves the page and its assets on staging', async () => {
    const page = await call('themodestyhouse-staging-production.up.railway.app');
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toContain('text/html');
    expect(page.headers.get('x-robots-tag')).toContain('noindex');
    expect((await call('themodestyhouse-staging-production.up.railway.app', ['hero.png'])).status).toBe(200);
  });

  it('never serves files outside the mockup folder', async () => {
    expect((await call('localhost', ['..', '..', 'package.json'])).status).toBe(404);
    expect((await call('localhost', ['..', '..', '.env'])).status).toBe(404);
  });
});
