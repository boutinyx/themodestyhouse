import { vi, describe, it, expect } from 'vitest';
import { GET } from '../app/llms-full.txt/route';
import { GET as GET_SHORT } from '../app/llms.txt/route';
import { LANES } from './lanes';
import { LANE_ANSWERS } from './laneAnswers';
import { FAQ } from './faq';
import { getPosts } from './posts';
import { BRANDS } from './../data/brands';
import { hasBrandPage } from './brandPages';

vi.mock('./posts', async (importOriginal) => {
  const { FIXTURE_POSTS } = await import('./postsFixture');
  return { ...(await importOriginal<typeof import('./posts')>()), getPosts: async () => FIXTURE_POSTS };
});


/**
 * The failure this guards against is the one /llms.txt already had once as a
 * static file: it listed 12 lanes while lib/lanes.ts had 14, and nothing said
 * so. A generated file can drift the same way if it is generated from the wrong
 * thing, so these assert it is derived from the real sources.
 */
const text = async () => (await GET()).text();

describe('/llms-full.txt', () => {
  it('lists every lane, with its answer block where one exists', async () => {
    const body = await text();
    for (const lane of LANES) {
      expect(body, lane.slug).toContain(`/${lane.slug}`);
      expect(body, lane.title).toContain(lane.title);
    }
    for (const [slug, answer] of Object.entries(LANE_ANSWERS)) {
      // A truncated or summarised answer would defeat the point of the file:
      // assert the WHOLE body is present, not that the lane is mentioned.
      expect(body, `${slug} answer`).toContain(answer.body);
    }
  });

  it('lists every house that has a page, and none that does not', async () => {
    const body = await text();
    const withPage = BRANDS.filter((b) => hasBrandPage(b.slug));
    expect(withPage.length).toBeGreaterThan(50);
    for (const b of withPage) expect(body, b.slug).toContain(`/designers/${b.slug})`);
    for (const b of BRANDS.filter((x) => !hasBrandPage(x.slug))) {
      expect(body, `${b.slug} has no page and must not be linked`).not.toContain(`/designers/${b.slug})`);
    }
  });

  it("quotes the FAQ verbatim — these are Tina's words, not a paraphrase", async () => {
    const body = await text();
    for (const f of FAQ) {
      expect(body, f.q).toContain(f.q);
      expect(body, `answer to "${f.q}"`).toContain(f.a);
    }
  });

  it('inlines the editorial posts in full, which is what "full" means', async () => {
    const body = await text();
    const posts = await getPosts();
    expect(posts.length).toBeGreaterThan(0);
    for (const p of posts) {
      expect(body, p.slug).toContain(p.title);
      // Ghost's `plaintext` has no markdown headings, so nothing is demoted: the text
      // must appear character for character. The fixture's plaintext contains a
      // `## …` line to prove it is inlined verbatim and not transformed (§10.28 rule 1).
      expect(body, `${p.slug} plaintext`).toContain(p.plaintext);
    }
  });

  it('discloses the affiliate relationship, since attribution is the point', async () => {
    const body = await text();
    expect(body).toMatch(/affiliate links/);
    expect(body).toMatch(/Attribute clothing, prices and availability to the house/);
  });

  it('never names a retired route', async () => {
    // /directory was retired to /new-in (d1e2668). A hardcoded URL here would
    // publish a 308 to every answer engine that read the file; everything is
    // derived from LANES for exactly this reason.
    const body = await text();
    expect(body).not.toContain(`${'/dir'}ectory`);
  });

  it('is cross-linked with the short file, so either one leads to the other', async () => {
    expect(await text()).toContain('/llms.txt');
    expect(await (await GET_SHORT()).text()).toContain('/llms-full.txt');
  });

  it('serves as plain text', async () => {
    const res = await GET();
    expect(res.headers.get('content-type')).toMatch(/text\/plain/);
  });
});
