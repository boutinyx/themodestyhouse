import { describe, expect, it } from 'vitest';
import { markdownToHtml, parseFrontmatter } from '../scripts/lib/markdownToHtml.mjs';

describe('markdownToHtml', () => {
  it('converts every construct in the grammar', () => {
    const html: string = markdownToHtml(
      [
        '## Heading',
        '### Sub',
        'Para with **bold**, *italic*, `code` and [a link](https://brand.example/x?a=1&b=2).',
        '- One\n- **Two**',
        '---',
        '**[Bold link](/modest-dresses)**',
      ].join('\n\n'),
    );
    expect(html).toContain('<h2>Heading</h2>');
    expect(html).toContain('<h3>Sub</h3>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<a href="https://brand.example/x?a=1&amp;b=2">a link</a>');
    expect(html).toContain('<ul><li>One</li><li><strong>Two</strong></li></ul>');
    expect(html).toContain('<hr>');
  });

  it('writes internal links as absolute site URLs, so Ghost cannot rewrite them onto its own host', () => {
    expect(markdownToHtml('[x](/modest-abayas)')).toContain('href="https://themodestyhouse.com/modest-abayas"');
  });

  it('escapes raw HTML in text', () => {
    expect(markdownToHtml('a <script>x</script> b')).not.toContain('<script>');
  });

  it('joins soft line breaks inside a paragraph', () => {
    expect(markdownToHtml('one\ntwo')).toBe('<p>one two</p>');
  });
});

describe('parseFrontmatter', () => {
  it('reads flat quoted keys and the body', () => {
    const { fm, body } = parseFrontmatter('---\ntitle: "A: B"\ndate: "2026-09-05"\n---\nHello');
    expect((fm as Record<string, string>).title).toBe('A: B');
    expect((fm as Record<string, string>).date).toBe('2026-09-05');
    expect(body).toBe('Hello');
  });
});
