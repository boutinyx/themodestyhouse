import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
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
    expect(html).toContain('<h2 id="anchor">'); // a heading slug is kept so jump links work…
    expect(renderToStaticMarkup(<GhostHtml html={'<h2 id="x&quot; onclick=&quot;y">H</h2><p id="anchor">P</p>'} />)).toBe('<h2>H</h2><p>P</p>'); // …nothing else
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
    expect(html).toContain('<h2 id="anchor">Heading</h2>');
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
<div class="kg-card kg-gallery-card">STILL DROPPED</div>`}
      />,
    );
    expect(out).toContain('<p>Ready to shop?</p>');
    expect(out).toMatch(/<a (href="\/modest-abayas" class="btn-pill"|class="btn-pill" href="\/modest-abayas")>Shop all abayas<\/a>/);
    for (const bad of ['<script', '<style', '<iframe', 'onclick', 'color:red', 'text-align', 'class="cta"']) {
      expect(out).not.toContain(bad);
    }
    expect(out).not.toContain('STILL DROPPED'); // an unsupported Ghost card is still dropped
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
    expect(out).toContain('<a href="/modest-abayas"><strong><ins>Shop all abayas</ins></strong></a>');
    expect(out).toContain('<a href="/modest-hijabs">Hijabs</a>');
    expect(out).not.toContain('font');
    expect(out).not.toContain('alert');
  });

  // 2026-10-14, the agency again: the comparison table and FAQ on open-abaya-vs-closed-abaya
  // vanished in both the HTML card and the Markdown card. Tables and <details> were not allowed,
  // and a Markdown card's HTML arrives as a bare <div> with no card class, which was dropped whole.
  it('renders a pasted table and FAQ from a Markdown card, without their inline styles', () => {
    const out = renderToStaticMarkup(
      <GhostHtml
        html={`<div style="overflow-x:auto">
<table style="width:100%"><thead>
<tr><th style="background:#f5f5f5">Feature</th><th>Open</th></tr>
</thead><tbody>
<tr><td colspan="2" onclick="x()"><strong>Coverage</strong></td></tr>
<tr><td rowspan="javascript:1">Warm</td><td>Light</td></tr>
</tbody></table></div>
<div><details style="border:1px solid"><summary style="cursor:pointer"><h3 style="display:inline">Which is better?</h3></summary><p>Either.</p></details></div>`}
      />,
    );
    expect(out).toContain('<div class="table-scroll"><table><thead><tr><th>Feature</th><th>Open</th></tr></thead>');
    expect(out).toMatch(/<td colspan="2"><strong>Coverage<\/strong><\/td>/i);
    expect(out).toContain('<td>Warm</td>'); // a junk span is dropped, the cell is kept
    expect(out).toContain('<details><summary><h3>Which is better?</h3></summary><p>Either.</p></details>');
    for (const bad of ['style=', 'onclick', 'javascript']) expect(out).not.toContain(bad);
  });

  it('renders Ghost\'s toggle card as a native details block', () => {
    const out = renderToStaticMarkup(
      <GhostHtml
        html={'<div class="kg-card kg-toggle-card" data-kg-toggle-state="close"><div class="kg-toggle-heading"><h4 class="kg-toggle-heading-text"><span style="white-space: pre-wrap;">Is it lined?</span></h4><button class="kg-toggle-card-icon" aria-label="Expand toggle to read content"><svg><path d="M1"/></svg></button></div><div class="kg-toggle-content"><p><span>Yes, fully.</span></p></div></div>'}
      />,
    );
    expect(out).toBe('<details><summary><span>Is it lined?</span></summary><p><span>Yes, fully.</span></p></details>');
  });
});

// 2026-10-14. Every card the Ghost editor offers, as OUR Ghost actually renders it: a throwaway draft
// holding one of each was created through the Admin API, its `html` saved below, and the draft
// deleted. Each CAPITALISED marker is text the author typed. All of it must reach the page, except
// the two drops the agency was told about. This is the test that stops the "my content vanished"
// emails: if Ghost adds or changes a card, re-capture it here and this fails until it is handled.
describe('GhostHtml — every Ghost card', () => {
  const src = fs.readFileSync(path.join(__dirname, 'GhostHtml.every-card.html'), 'utf8');
  const render = () => {
    process.env.GHOST_URL = 'https://cms.example';
    return renderToStaticMarkup(<GhostHtml html={src} />);
  };
  const DELIBERATELY_DROPPED = new Set([
    'DISCLAIMER', // Ghost's member-signup small print; our own newsletter form replaces that card
    'BUTTON TEXT', // a raw <button> pasted into an HTML card: it can do nothing on our page
  ]);

  it('keeps every word an author typed, in every card', () => {
    const out = render();
    const markers = [...new Set(src.replace(/<[^>]+>/g, ' ').match(/\b[A-Z][A-Z0-9]+(?: [A-Z0-9]+)*\b/g) ?? [])]
      .filter((m) => m.length >= 3);
    expect(markers.length).toBeGreaterThan(40);
    const lost = markers.filter((m) => !out.includes(m) && !DELIBERATELY_DROPPED.has(m));
    expect(lost).toEqual([]);
    for (const m of DELIBERATELY_DROPPED) expect(out).not.toContain(m);
  });

  it('plays YouTube through the privacy-enhanced host, and video and audio from our Ghost', () => {
    const out = render();
    expect(out.match(/<iframe [^>]*src="https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ"/g)).toHaveLength(2);
    expect(out).toMatch(/<video [^>]*src="https:\/\/cms\.example\/content\/media\/[^"]+\.mp4"[^>]*controls/);
    expect(out).toMatch(/<audio [^>]*src="https:\/\/cms\.example\/content\/media\/[^"]+\.mp3"[^>]*controls/);
    expect(out).toMatch(/<a href="https:\/\/cms\.example\/content\/files\/[^"]+\.pdf" target="_blank" rel="noopener"/);
  });

  it('carries none of the card chrome, scripts, forms or Ghost colours', () => {
    const out = render();
    // The only svgs are our own Phosphor stars on the product card (viewBox 0 0 256 256); Ghost's icons go.
    expect(out.match(/<svg/g)).toHaveLength(5);
    expect(out.match(/<svg [^>]*viewBox="0 0 256 256"/g)).toHaveLength(5);
    expect(out).toContain('<a href="#newsletter" class="btn-pill">Subscribe</a>');
    expect(out).toContain('src="https://cdn.shopify.com/x.jpg"'); // pasted Shopify product shots are allowed
    for (const bad of ['<script', '<form', '<input', '<button', '0:00', '1×', 'jamie@example', 'class="kg-', 'data-kg', '#F0F0F0', 'instagram.com/embed.js']) {
      expect(out).not.toContain(bad);
    }
  });

  it('turns a markdown footnote into a working in-page link', () => {
    const out = render();
    expect(out).toContain('<a href="#fn1" id="fnref1">[1]</a>');
    expect(out).toMatch(/<li id="fn1">/);
    expect(out).toContain('<a href="#fnref1">');
  });

  it('only frames YouTube and Vimeo, rebuilt from the id', () => {
    const one = (h: string) => renderToStaticMarkup(<GhostHtml html={h} />);
    expect(one('<iframe src="https://evil.example/embed/dQw4w9WgXcQ"></iframe>')).toBe('');
    expect(one('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&amp;x=javascript:1"></iframe>'))
      .toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(one('<iframe src="https://player.vimeo.com/video/123456789"></iframe>')).toContain('src="https://player.vimeo.com/video/123456789"');
    expect(one('<iframe src="javascript:alert(1)//www.youtube.com/embed/dQw4w9WgXcQ"></iframe>')).toBe('');
  });

  it('refuses video, audio and files from anywhere but our Ghost', () => {
    process.env.GHOST_URL = 'https://cms.example';
    const one = (h: string) => renderToStaticMarkup(<GhostHtml html={h} />);
    expect(one('<figure class="kg-card kg-video-card"><video src="https://evil.example/v.mp4"></video></figure>')).toBe('');
    expect(one('<div class="kg-card kg-audio-card"><audio src="https://evil.example/a.mp3"></audio></div>')).toBe('');
    expect(one('<div class="kg-card kg-file-card"><a class="kg-file-card-container" href="https://evil.example/f.exe">x</a></div>')).toBe('');
  });

  it('keeps the words of a tag it has never heard of', () => {
    expect(renderToStaticMarkup(<GhostHtml html={'<p><blink>Still here</blink> <foo-bar>and here</foo-bar></p>'} />)).toBe('<p>Still here and here</p>');
  });

  // From the 2026-10-14 security review of this rewrite.
  it('cannot be turned against the page', () => {
    process.env.GHOST_URL = 'https://cms.example';
    const one = (h: string) => renderToStaticMarkup(<GhostHtml html={h} />);
    for (const href of ['https://themodestyhouse.com//evil.example/x', 'https://themodestyhouse.com/\\evil.example', '//themodestyhouse.com//evil.example']) {
      expect(one(`<p><a href="${href}">a</a></p>`)).not.toMatch(/href="\/\//);
    }
    expect(one('<h2 id="newsletter">x</h2><li id="newsletter-email">y</li>')).toBe('<h2>x</h2><li>y</li>');
    expect(one('<img src="https://cms.example/a.jpg" srcset="https://evil.example/p.gif 1w, https://cms.example/b.jpg 2w">')).not.toContain('evil');
    expect(one('<img src="https://cms.example/a.jpg" srcset="https://cms.example/a.jpg 600w, https://cms.example/b.jpg 1200w">'))
      .toContain('srcSet="https://cms.example/a.jpg 600w, https://cms.example/b.jpg 1200w"');
  });
});

// 2026-10-14, Tina: "remove the whole allowlist for specific users". Trusted mode renders the
// agency's HTML and CSS as written, and still removes anything that can run or submit.
describe('GhostHtml — trusted authors', () => {
  const one = (h: string) => {
    process.env.GHOST_URL = 'https://cms.example';
    return renderToStaticMarkup(<GhostHtml html={h} trusted />);
  };

  it('keeps their tags, classes and inline styles', () => {
    const out = one('<div class="faq" style="border:1px solid #d9d9d9;padding:12px"><table class="t"><tr><td style="background:#f5f5f5">Cell</td></tr></table><custom-box data-x="1">Custom</custom-box></div>');
    expect(out).toContain('class="faq"');
    expect(out).toMatch(/style="border:1px solid #d9d9d9;padding:12px"/);
    expect(out).toContain('style="background:#f5f5f5"');
    expect(out).toContain('Custom');
    expect(out.startsWith('<div class="ghost-raw">')).toBe(true);
  });

  it('scopes a pasted style block to the article and keeps child selectors intact', () => {
    const out = one('<style>.faq > p { color: red }</style><p>x</p>');
    expect(out).toContain('@scope (.ghost-raw)');
    expect(out).toContain('.faq > p { color: red }');
  });

  it('still removes everything that can run or submit', () => {
    const out = one(`<p onclick="steal()" onmouseover="steal()">a</p><script>steal()</script>
<img src="https://cms.example/a.jpg" onerror="steal()"><a href="javascript:steal()">j</a><a href="data:text/html,x">d</a>
<form action="https://evil.example"><input name="card"><button>Pay</button></form><base href="https://evil.example/">
<meta http-equiv="refresh" content="0;url=https://evil.example"><iframe srcdoc="<script>steal()</script>"></iframe>
<iframe src="https://evil.example"></iframe><object data="x.swf"></object><svg><script>steal()</script><a xlink:href="javascript:steal()">s</a></svg>
<math><mi xlink:href="javascript:steal()">m</mi></math><noscript><p title="</noscript><img src=x onerror=steal()>"></noscript>`);
    for (const bad of ['steal', 'javascript:', 'data:text', '<form', '<input', '<base', '<meta', 'srcdoc', 'evil.example', '<object', '<script']) {
      expect(out).not.toContain(bad);
    }
  });

  it('tags outbound links and keeps internal ones in the tab', () => {
    const out = one('<a class="cta" href="https://brand.example/x" target="_self" rel="opener">Shop</a><a href="https://themodestyhouse.com/modest-abayas" target="_blank">Abayas</a>');
    expect(out).toMatch(/<a class="cta" href="https:\/\/brand\.example\/x\?utm_[^"]*" target="_blank" rel="noopener noreferrer sponsored" data-surface="editorial">Shop<\/a>/);
    expect(out).toContain('<a href="/modest-abayas">Abayas</a>');
  });

  it('cannot take the page\'s own ids', () => {
    const out = one('<h2 id="newsletter">x</h2><input id="newsletter-email"><p id="faq-1">y</p>');
    expect(out).not.toContain('id="newsletter"');
    expect(out).toContain('id="faq-1"');
  });

  it('still renders Ghost cards through their own renderers', () => {
    const out = one('<div class="kg-card kg-toggle-card"><div class="kg-toggle-heading"><h4 class="kg-toggle-heading-text">Q</h4><button class="kg-toggle-card-icon"><svg></svg></button></div><div class="kg-toggle-content"><p>A</p></div></div>');
    expect(out).toContain('<details><summary>Q</summary><p>A</p></details>');
  });

  it('renders a CTA card the house way, not with Ghost\'s raw button styling', () => {
    const out = one('<div class="kg-card kg-cta-card kg-cta-bg-grey"><div class="kg-cta-content"><div class="kg-cta-text"><p>Find it</p></div><a href="https://themodestyhouse.com/modest-abayas" class="kg-cta-button kg-style-accent" style="color: #FFFFFF;">Learn more</a></div></div><h2 id=""></h2><p></p>');
    expect(out).toMatch(/<a class="btn-pill" href="\/modest-abayas">\s*Learn more\s*<\/a>/);
    expect(out).not.toContain('#FFFFFF');
    expect(out).not.toContain('kg-');
    expect(out).not.toContain('<h2');
  });

  it('plays YouTube through the privacy-enhanced host', () => {
    expect(one('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560"></iframe>')).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
  });

  it('is off unless the page asks for it', () => {
    process.env.GHOST_URL = 'https://cms.example';
    expect(renderToStaticMarkup(<GhostHtml html={'<p style="color:red" class="x">a</p>'} />)).toBe('<p>a</p>');
  });
});
