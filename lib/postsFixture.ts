import type { Post } from './posts';

/**
 * Editorial posts for tests that exercise routes built from `getPosts()`
 * (sitemap, /llms.txt, /llms-full.txt, /index.md). CI never reaches Ghost, so those
 * tests mock `./posts` with this list instead. Plaintext deliberately contains a
 * line that looks like a markdown heading, to prove the llms-full route inlines
 * Ghost's plaintext verbatim rather than transforming it.
 */
export const FIXTURE_POSTS: Post[] = [
  {
    slug: 'fixture-newest',
    title: 'Fixture newest post',
    dek: 'The newest fixture dek.',
    category: 'Guides',
    author: 'Fixture Author',
    date: '2026-09-10',
    html: '<p>Newest body.</p>',
    plaintext: 'Newest body.\n\n## Not a heading here',
  },
  {
    slug: 'fixture-older',
    title: 'Fixture older post',
    dek: 'The older fixture dek.',
    category: 'Story',
    author: 'The Modesty House',
    date: '2026-09-01',
    html: '<p>Older body.</p>',
    plaintext: 'Older body.',
  },
];
