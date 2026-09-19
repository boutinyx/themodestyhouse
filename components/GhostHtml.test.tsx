import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import GhostHtml from './GhostHtml';

const GHOST = 'https://cms.themodestyhouse.com';

// A hostile post: every trap from the design's Testing section in one body.
const FIXTURE = `
<h2 id="anchor" style="color:red">Heading</h2>
<p style="white-space: pre-wrap;">Body with <strong>bold</strong> and <em>italic</em>.</p>
<script src="https://evil.example/x.js"></script>
<p><a href="javascript:alert(1)">js link</a></p>
<p><a href="//evil.example/path">protocol relative</a></p>
<p><a href="https://losyana.shop/products/x?ref=cms.themodestyhouse.com">shop</a></p>
<p><a href="/modest-dresses">internal</a></p>
<p><a href="https://themodestyhouse.com/modest-abayas?x=1#top">absolute internal</a></p>
<figure class="kg-card kg-image-card kg-width-wide"><img src="${GHOST}/content/images/2026/09/a.jpg" srcset="${GHOST}/content/images/size/w600/2026/09/a.jpg 600w, ${GHOST}/content/images/2026/09/a.jpg 2000w" sizes="(min-width: 720px) 720px" loading="lazy" width="2000" height="1000" alt="A coat" onerror="alert(1)"><figcaption>Caption</figcaption></figure>
<p><img src="https://hotlinked.example/x.jpg" alt="nope"></p>
<div class="kg-card kg-callout-card kg-callout-card-grey"><div class="kg-callout-emoji">💡</div><div class="kg-callout-text">A callout</div></div>
<div class="kg-card kg-button-card kg-align-center"><a href="https://brand.example/shop" class="kg-btn kg-btn-accent">Shop now</a></div>
<div class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="https://brand.example/a"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Bookmark title</div><div class="kg-bookmark-description">Bookmark desc</div><div class="kg-bookmark-metadata"><img class="kg-bookmark-icon" src="https://brand.example/i.png"></div></div><div class="kg-bookmark-thumbnail"><img src="https://brand.example/t.jpg" onerror="alert(1)"></div></a></div>
<iframe src="https://evil.example"></iframe>
<div class="kg-card kg-gallery-card"><div class="kg-gallery-container">GALLERY</div></div>
<div class="kg-card kg-html-card"><form><input name="x"></form>HTMLCARD</div>
<h1>Stray h1</h1>
<hr>
<ul><li>One</li><li>Two</li></ul>
`;

let html = '';
beforeEach(() => {
  process.env.GHOST_URL = GHOST;
  html = renderToStaticMarkup(<GhostHtml html={FIXTURE} />);
});

describe('GhostHtml', () => {
  it('drops scripts, iframes, forms, galleries and HTML cards with their children', () => {
    expect(html).not.toContain('<script');
    expect(html).not.toContain('evil.example/x.js');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('GALLERY');
    expect(html).not.toContain('HTMLCARD');
  });

  it('strips event handlers, style, id and javascript: URLs', () => {
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toContain('style="color:red"');
    expect(html).not.toContain('white-space');
    expect(html).not.toContain('id="anchor"');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('js link'); // the text survives, the link does not
  });

  it('treats a protocol-relative link as external', () => {
    expect(html).toMatch(/<a [^>]*href="https:\/\/evil\.example\/path[^"]*"[^>]*target="_blank"/);
  });

  it('keeps our affiliate ref, drops Ghost\'s, and adds the UTM', () => {
    const m = html.match(/<a [^>]*href="(https:\/\/losyana\.shop[^"]*)"[^>]*>shop/);
    expect(m).not.toBeNull();
    const u = new URL(m![1].replace(/&amp;/g, '&'));
    expect(u.searchParams.get('ref')).toBe('dsgnnfgp');
    expect(u.searchParams.get('utm_source')).toBe('themodestyhouse.com');
    expect(u.searchParams.get('utm_content')).toBe('editorial');
    expect(html).toMatch(/rel="noopener noreferrer sponsored"[^>]*>shop|>shop/);
  });

  it('marks every external link sponsored and surfaces it for the audit', () => {
    const external = html.match(/<a [^>]*target="_blank"[^>]*>/g) ?? [];
    expect(external.length).toBeGreaterThan(0);
    for (const a of external) {
      expect(a).toContain('rel="noopener noreferrer sponsored"');
      expect(a).toContain('data-surface="editorial"');
    }
  });

  it('renders same-origin links as internal, with no target', () => {
    expect(html).toMatch(/<a href="\/modest-dresses">internal/);
    expect(html).toMatch(/<a href="\/modest-abayas\?x=1#top">absolute internal/);
  });

  it('keeps Ghost images with srcset and lazy loading, and drops hotlinked ones', () => {
    expect(html).toContain(`src="${GHOST}/content/images/2026/09/a.jpg"`);
    expect(html).toMatch(/srcSet="[^"]*size\/w600/i);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).not.toContain('hotlinked.example');
  });

  it('renders the button card as a pill and the callout as a block', () => {
    expect(html).toMatch(/class="[^"]*btn-pill[^"]*"[^>]*>Shop now/);
    expect(html).toContain('A callout');
  });

  it('renders a bookmark as title, description and link with no thumbnail', () => {
    expect(html).toContain('Bookmark title');
    expect(html).toContain('Bookmark desc');
    expect(html).not.toContain('brand.example/t.jpg');
    expect(html).not.toContain('brand.example/i.png');
  });

  it('demotes a stray h1 so the page keeps one', () => {
    expect(html).not.toContain('<h1');
    expect(html).toContain('Stray h1');
  });

  it('keeps ordinary structure', () => {
    expect(html).toContain('<h2>Heading</h2>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<hr/>');
    expect(html).toContain('<li>One</li>');
  });
});
