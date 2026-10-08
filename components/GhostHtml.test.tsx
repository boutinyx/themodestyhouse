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

  // The abaya guide's closing link, verbatim from Ghost on 2026-10-08. `<u>` was not on the
  // allowlist, so it was dropped WITH its words and the live page showed an empty link.
  it('keeps every inline format the Ghost editor offers, with its words', () => {
    const out = renderToStaticMarkup(
      <GhostHtml
        html={`<p><a href="https://themodestyhouse.com/modest-abayas"><strong><u>Shop all abayas on The Modesty House</u></strong></a></p>
<p><s>struck</s> <mark>highlit</mark> H<sub>2</sub>O x<sup>2</sup> <del>deleted</del></p>`}
      />,
    );
    expect(out).toContain('<a href="/modest-abayas"><strong><u>Shop all abayas on The Modesty House</u></strong></a>');
    for (const t of ['<s>struck</s>', '<mark>highlit</mark>', '<sub>2</sub>', '<sup>2</sup>', '<del>deleted</del>']) {
      expect(out).toContain(t);
    }
  });

  // Ghost's web CTA card markup, from Koenig's calltoaction-renderer (TryGhost/Koenig, main).
  it('renders the CTA card: label, text and a pill button, with Ghost\'s inline style dropped', () => {
    const out = renderToStaticMarkup(
      <GhostHtml
        html={`<div class="kg-card kg-cta-card kg-cta-bg-grey kg-cta-immersive kg-cta-centered" data-layout="immersive">
  <div class="kg-cta-sponsor-label-wrapper"><div class="kg-cta-sponsor-label">Shop the edit</div></div>
  <div class="kg-cta-content">
    <div class="kg-cta-image-container"><a href="https://themodestyhouse.com/modest-abayas"><img src="${GHOST}/content/images/2026/10/c.jpg" alt="CTA Image"></a></div>
    <div class="kg-cta-content-inner">
      <div class="kg-cta-text"><p>Find your abaya</p></div>
      <a href="https://themodestyhouse.com/modest-abayas" class="kg-cta-button kg-style-accent" style="color: #ffffff;">Shop all abayas</a>
    </div>
  </div>
</div>`}
      />,
    );
    expect(out).toContain('Shop the edit');
    expect(out).toContain('<p>Find your abaya</p>');
    expect(out).toMatch(/<a class="btn-pill" href="\/modest-abayas">\s*Shop all abayas\s*<\/a>|<a href="\/modest-abayas" class="btn-pill">\s*Shop all abayas\s*<\/a>/);
    expect(out).toContain(`src="${GHOST}/content/images/2026/10/c.jpg"`);
    expect(out).not.toContain('#ffffff');
    expect(out).not.toContain('data-layout');
  });

  it('drops headings and paragraphs with nothing in them', () => {
    const out = renderToStaticMarkup(<GhostHtml html={'<p>Kept</p><p></p><p>  </p><h2 id=""></h2>'} />);
    expect(out).toBe('<p>Kept</p>');
  });

  // Ghost's HTML card has no wrapper: Koenig's html-renderer emits the pasted HTML between two
  // comments. Its CONTENT renders through the same allowlist, so a pasted closing link works and a
  // pasted script does not.
  it('renders an HTML card\'s content through the allowlist', () => {
    const out = renderToStaticMarkup(
      <GhostHtml
        html={`<p>Before</p>
<!--kg-card-begin: html-->
<style>.x{color:red}</style>
<div class="cta" style="text-align:center"><p>Ready to shop?</p><a class="button" href="https://themodestyhouse.com/modest-abayas" onclick="alert(1)">Shop all abayas</a></div>
<script>alert(1)</script><iframe src="https://evil.example"></iframe>
<!--kg-card-end: html-->
<div class="not-a-card">STILL DROPPED</div>`}
      />,
    );
    expect(out).toContain('<p>Ready to shop?</p>');
    expect(out).toMatch(/<a (href="\/modest-abayas" class="btn-pill"|class="btn-pill" href="\/modest-abayas")>Shop all abayas<\/a>/);
    for (const bad of ['<script', '<style', '<iframe', 'onclick', 'color:red', 'text-align', 'class="cta"']) {
      expect(out).not.toContain(bad);
    }
    expect(out).not.toContain('STILL DROPPED'); // outside the card, unknown divs are still dropped
    expect(out).toContain('<p>Before</p>');
  });

  // The agency's request, 2026-10-08: an unsupported tag INSIDE a link must not take the link's
  // words with it. Unwrap it; only tags that can run or embed something are still dropped whole.
  it('unwraps an unsupported tag inside a link instead of dropping its words', () => {
    const out = renderToStaticMarkup(
      <GhostHtml
        html={'<p><a href="https://themodestyhouse.com/modest-abayas"><strong><font color="red"><ins>Shop all abayas</ins></font></strong></a></p><p><a href="/modest-hijabs"><script>alert(1)</script><svg><title>x</title></svg>Hijabs</a></p>'}
      />,
    );
    expect(out).toContain('<a href="/modest-abayas"><strong>Shop all abayas</strong></a>');
    expect(out).toContain('<a href="/modest-hijabs">Hijabs</a>');
    expect(out).not.toContain('font');
    expect(out).not.toContain('alert');
  });
});
