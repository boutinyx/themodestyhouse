import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { createElement } from 'react';
import parse, { domToReact, Element, type DOMNode, type HTMLReactParserOptions } from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { Star } from '@phosphor-icons/react/dist/ssr';
import { withUtm } from '@/lib/outbound';

/**
 * Renders the HTML Ghost's Content API returns, as React elements, through an
 * explicit allowlist. THE ALLOWLIST IS THE SANITISER.
 *
 * Why not `dangerouslySetInnerHTML`: React 19 throws on a string `style`, drops
 * string event handlers and neuters `javascript:` hrefs — but only for elements
 * it builds itself. `dangerouslySetInnerHTML` has none of those protections,
 * and real Ghost HTML contains `<script src>` (HTML cards) and `onerror=`
 * (bookmark thumbnails). And React DOES execute a `<script>` rendered as a node.
 * So every element is rebuilt here with attributes we chose.
 *
 * COVERAGE, rebuilt 2026-10-14 after the agency's third "my content vanished" email. Until then
 * the list grew one reported tag at a time and anything unknown was dropped WITH ITS WORDS. Now:
 * - Every card the Ghost editor offers is handled on purpose (see CARD below). The markup each
 *   one produces was captured from our own Ghost, not guessed: `components/GhostHtml.test.tsx`
 *   holds it.
 * - An element we don't know is UNWRAPPED: its tag and attributes go, its words stay. Only tags
 *   that can run, embed or submit something (NEVER_RENDER) are dropped whole.
 * The list the agency was sent is in docs/log/2026-10-14-ghost-full-allowlist.md.
 *
 * Server component: nothing here needs the browser.
 */

const SITE_ORIGIN = 'https://themodestyhouse.com';

/** Elements copied through with NO attributes (no class, style, data-*, on*). */
const PLAIN = new Set([
  'p', 'ul', 'ol', 'li', 'blockquote', 'strong', 'em', 'b', 'i', 'code', 'pre', 'figure',
  'figcaption', 'span', 'u', 's', 'del', 'ins', 'mark', 'sub', 'sup', 'small', 'cite', 'q', 'kbd',
  'abbr', 'time', 'dl', 'dt', 'dd', 'caption', 'details', 'summary',
]);
/** Layout containers. They keep their children as a bare <div>. */
const CONTAINERS = new Set(['div', 'section', 'article', 'header', 'footer', 'aside', 'center', 'main', 'nav']);
const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
/** Blocks that are dropped when they hold no text and no image: Ghost leaves empty ones behind. */
const DROP_IF_EMPTY = new Set(['p', ...HEADINGS]);
const VOID = new Set(['hr', 'br']);
const TABLE_PARTS = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr']);
const CELLS = new Set(['th', 'td']);
/** Tags that can run, embed or submit something: dropped with their children. Cards that
 *  legitimately carry a video, audio or iframe find it themselves (see CARD). */
const NEVER_RENDER = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'form', 'input',
  'button', 'select', 'option', 'textarea', 'template', 'noscript', 'svg', 'math', 'video', 'audio',
  'source', 'track', 'canvas', 'link', 'meta', 'base', 'head', 'title', 'dialog', 'portal',
]);

/**
 * Sub-part classes of the callout, button, bookmark and CTA cards that render (as a bare div
 * unless styled below). Any OTHER `kg-*` div inside a card is chrome (player controls, metadata,
 * icons) and is dropped.
 */
const CARD_PARTS = new Set([
  'kg-callout-card', 'kg-callout-emoji', 'kg-callout-text',
  'kg-button-card',
  'kg-bookmark-content', 'kg-bookmark-title', 'kg-bookmark-description',
  'kg-cta-card', 'kg-cta-sponsor-label-wrapper', 'kg-cta-sponsor-label', 'kg-cta-content',
  'kg-cta-image-container', 'kg-cta-content-inner', 'kg-cta-text',
]);

/** Video hosts whose player may be framed. The CSP's frame-src lists exactly these. */
const EMBED_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com', 'player.vimeo.com']);

const BOX: CSSProperties = {
  margin: '32px 0',
  padding: '24px 22px',
  background: 'var(--bone)',
  border: '1px solid var(--hairline)',
  borderRadius: 8,
};
const CALLOUT: CSSProperties = { ...BOX, display: 'flex', gap: 12, margin: '28px 0', padding: '16px 18px' };
const BOOKMARK: CSSProperties = {
  display: 'block',
  margin: '28px 0',
  padding: '16px 18px',
  border: '1px solid var(--hairline)',
  borderRadius: 8,
  color: 'inherit',
  textDecoration: 'none',
};

function classes(el: Element): string[] {
  return (el.attribs.class ?? '').split(/\s+/).filter(Boolean);
}
const hasClass = (el: Element, c: string) => classes(el).includes(c);
const kgClasses = (el: Element) => classes(el).filter((c) => c.startsWith('kg-'));
const looksLikeButton = (el: Element) =>
  classes(el).some((c) => /btn|button/i.test(c) && c !== 'kg-bookmark-container' && c !== 'kg-file-card-container');

function hasContent(nodes: DOMNode[]): boolean {
  return nodes.some((n) =>
    n instanceof Element
      ? n.name === 'img' || hasContent(n.children as DOMNode[])
      : n.type === 'text' && (n as unknown as { data: string }).data.trim() !== '',
  );
}

/** Depth-first search for the first descendant matching `test`. */
function find(el: Element, test: (e: Element) => boolean): Element | undefined {
  for (const k of el.children as DOMNode[]) {
    if (!(k instanceof Element)) continue;
    if (test(k)) return k;
    const deep = find(k, test);
    if (deep) return deep;
  }
  return undefined;
}
const byClass = (el: Element, c: string) => find(el, (e) => hasClass(e, c));
const byTag = (el: Element, t: string) => find(el, (e) => e.name === t);
function textOf(el: Element | undefined): string {
  if (!el) return '';
  return (el.children as DOMNode[])
    .map((n) => (n instanceof Element ? textOf(n) : n.type === 'text' ? (n as unknown as { data: string }).data : ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function ghostHost(): string | undefined {
  try {
    return new URL(process.env.GHOST_URL ?? '').host;
  } catch {
    return undefined;
  }
}
function hostOf(src: string | undefined): string | undefined {
  try {
    return new URL(src ?? '').host;
  } catch {
    return undefined;
  }
}
/** Our own Ghost uploads only — media and files must never be pulled from a third party. */
const isGhostAsset = (src: string | undefined) => !!src && !!ghostHost() && hostOf(src) === ghostHost();
/** Images may also come from Shopify, which the CSP's img-src already allows: agencies paste product shots. */
const isAllowedImage = (src: string | undefined) => isGhostAsset(src) || hostOf(src) === 'cdn.shopify.com';

/** Ids the rest of the page already uses. An article must not take them: it comes first in the
 *  document, so `#newsletter` or `<label for="newsletter-email">` would land on the article's copy. */
const RESERVED_IDS = new Set([
  'newsletter', 'newsletter-email', 'email', 'name', 'message', 'topic', 'website', 'quickview-title',
  'main', 'main-content', 'content', 'top',
]);
/** An `id` survives only when it is a heading slug or a footnote anchor, so in-page links work. */
function safeId(el: Element): string | undefined {
  const id = el.attribs.id;
  if (!id || RESERVED_IDS.has(id)) return undefined;
  return /^[a-z0-9][a-z0-9-]{0,99}$|^fn(ref)?\d{1,3}(:\d{1,3})?$/.test(id) ? id : undefined;
}

type Href = { kind: 'internal'; to: string } | { kind: 'external'; url: string } | { kind: 'hash'; to: string };
/** Parsed-and-classified href, or null when it must not become a link. */
function classify(href: string | undefined): Href | null {
  if (!href) return null;
  if (/^#[A-Za-z0-9:_-]{1,100}$/.test(href)) return { kind: 'hash', to: href }; // footnotes, jump links
  let u: URL;
  try {
    u = new URL(href, SITE_ORIGIN);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  // Compared as origins, never `startsWith('/')`: Ghost emits protocol-relative `//host/…`.
  // Collapse leading slashes: `https://themodestyhouse.com//evil.example` has the pathname
  // `//evil.example`, which a browser would follow to another host.
  if (u.origin === SITE_ORIGIN) return { kind: 'internal', to: u.pathname.replace(/^\/+/, '/') + u.search + u.hash };
  // Ghost tags outbound links `?ref=<its own host>` by default, and `ref` is losyana.shop's
  // affiliate key. withUtm never overwrites an existing key, so Ghost's would win over ours.
  const ours = new Set([ghostHost(), new URL(SITE_ORIGIN).host].filter(Boolean));
  if (ours.has(u.searchParams.get('ref') ?? '')) u.searchParams.delete('ref');
  return { kind: 'external', url: withUtm(u.toString(), 'editorial') };
}

function renderLink(
  link: Href,
  children: ReactNode,
  { className, style, id }: { className?: string; style?: CSSProperties; id?: string } = {},
): React.JSX.Element {
  if (link.kind === 'hash') return <a href={link.to} id={id} className={className} style={style}>{children}</a>;
  if (link.kind === 'internal') {
    return <Link href={link.to} id={id} className={className} style={style}>{children}</Link>;
  }
  return (
    <a
      href={link.url}
      id={id}
      target="_blank"
      rel="noopener noreferrer sponsored"
      data-surface="editorial"
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}

/** Ghost's own responsive set, or nothing: every candidate URL must be on our Ghost. */
function safeSrcset(srcset: string | undefined): string | undefined {
  if (!srcset) return undefined;
  const parts = srcset.split(',').map((c) => c.trim()).filter(Boolean);
  const ok = parts.every((c) => {
    const [url, size, ...rest] = c.split(/\s+/);
    return rest.length === 0 && isGhostAsset(url) && (!size || /^\d{1,5}[wx]$/.test(size));
  });
  return ok ? parts.join(', ') : undefined;
}

function renderImg(node: Element): React.JSX.Element {
  const { src, srcset, sizes, alt, width, height } = node.attribs;
  if (!isAllowedImage(src)) return <></>; // anything else would be blocked by the CSP anyway
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Ghost sizes it; see lib/ghostImage.ts
    <img
      src={src}
      srcSet={isGhostAsset(src) ? safeSrcset(srcset) : undefined}
      sizes={isGhostAsset(src) ? sizes : undefined}
      alt={alt ?? ''}
      width={width ? Number(width) || undefined : undefined}
      height={height ? Number(height) || undefined : undefined}
      loading="lazy"
      decoding="async"
    />
  );
}

/** A table cell keeps only its span, as a small integer. */
function span(v: string | undefined): number | undefined {
  const n = Number(v);
  return Number.isInteger(n) && n > 1 && n <= 20 ? n : undefined;
}

/** A YouTube or Vimeo iframe src, rebuilt from its id; null for any other host. */
function embedSrc(src: string | undefined): string | null {
  let u: URL;
  try {
    u = new URL(src ?? '', 'https://www.youtube.com');
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || !EMBED_HOSTS.has(u.host)) return null;
  const yt = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]{6,20})$/);
  if (yt && u.host !== 'player.vimeo.com') return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = u.pathname.match(/^\/video\/(\d{1,15})$/);
  if (vimeo && u.host === 'player.vimeo.com') return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

/** The only iframe this renderer ever emits: a rebuilt YouTube/Vimeo player URL. */
function embedFrame(frame: Element): React.JSX.Element | null {
  const src = embedSrc(frame.attribs.src);
  if (!src) return null;
  return (
    <div className="ghost-embed">
      <iframe
        src={src}
        title={frame.attribs.title || 'Video'}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}

type Kids = (el: Element) => ReactNode;

/**
 * One renderer per Ghost card, keyed by its card class. Each takes the card element and returns
 * what our page shows. Exhaustive against the editor as of Ghost 6 / kg-default-nodes 2.1.5.
 */
const CARD: Record<string, (el: Element, kids: Kids) => ReactNode> = {
  'kg-image-card': (el, kids) => <figure>{kids(el)}</figure>,

  'kg-gallery-card': (el, kids) => {
    const rows = (byClass(el, 'kg-gallery-container')?.children as DOMNode[] | undefined ?? [])
      .filter((r): r is Element => r instanceof Element && hasClass(r, 'kg-gallery-row'));
    const cap = byTag(el, 'figcaption');
    return (
      <figure className="ghost-gallery">
        {rows.map((row, i) => (
          <div key={i} className="ghost-gallery-row">
            {(row.children as DOMNode[]).filter((c): c is Element => c instanceof Element).map((cell, j) => {
              const img = byTag(cell, 'img');
              if (!img) return null;
              const ratio = Number(img.attribs.width) / Number(img.attribs.height);
              // Ghost's own theme script sizes each image by its aspect ratio so a row lines up.
              return <div key={j} style={{ flex: `${Number.isFinite(ratio) && ratio > 0 ? ratio : 1} 1 0%` }}>{renderImg(img)}</div>;
            })}
          </div>
        ))}
        {cap ? <figcaption>{kids(cap)}</figcaption> : null}
      </figure>
    );
  },

  'kg-code-card': (el, kids) => <figure>{kids(el)}</figure>,

  'kg-embed-card': (el, kids) => {
    const frame = byTag(el, 'iframe');
    const src = frame ? embedSrc(frame.attribs.src) : null;
    const cap = byTag(el, 'figcaption');
    if (frame && src) {
      return (
        <figure>
          {embedFrame(frame)}
          {cap ? <figcaption>{kids(cap)}</figcaption> : null}
        </figure>
      );
    }
    // Instagram, TikTok, X and the rest need the platform's script to draw. Without it they
    // degrade to the fallback the platform ships inside the embed: a quote with a link.
    return <figure>{kids(el)}</figure>;
  },

  'kg-bookmark-card': (el, kids) => <figure>{kids(el)}</figure>,

  'kg-video-card': (el, kids) => {
    const video = byTag(el, 'video');
    if (!video || !isGhostAsset(video.attribs.src)) return <></>;
    const poster = el.attribs['data-kg-custom-thumbnail'] || el.attribs['data-kg-thumbnail'];
    const cap = byTag(el, 'figcaption');
    return (
      <figure>
        <video
          src={video.attribs.src}
          poster={isGhostAsset(poster) ? poster : undefined}
          width={Number(video.attribs.width) || undefined}
          height={Number(video.attribs.height) || undefined}
          controls
          playsInline
          preload="metadata"
          loop={'loop' in video.attribs}
          muted={'loop' in video.attribs}
        />
        {cap ? <figcaption>{kids(cap)}</figcaption> : null}
      </figure>
    );
  },

  'kg-audio-card': (el) => {
    const audio = byTag(el, 'audio');
    if (!audio || !isGhostAsset(audio.attribs.src)) return <></>;
    const title = textOf(byClass(el, 'kg-audio-title'));
    return (
      <figure>
        {title ? <figcaption style={{ marginTop: 0, marginBottom: 8 }}>{title}</figcaption> : null}
        <audio src={audio.attribs.src} controls preload="metadata" style={{ width: '100%' }} />
      </figure>
    );
  },

  'kg-file-card': (el) => {
    const a = byClass(el, 'kg-file-card-container');
    const href = a?.attribs.href;
    if (!isGhostAsset(href)) return <></>;
    const title = textOf(byClass(el, 'kg-file-card-title')) || textOf(byClass(el, 'kg-file-card-filename'));
    const caption = textOf(byClass(el, 'kg-file-card-caption'));
    const meta = [textOf(byClass(el, 'kg-file-card-filename')), textOf(byClass(el, 'kg-file-card-filesize'))].filter(Boolean).join(' · ');
    return (
      <a href={href} target="_blank" rel="noopener" style={BOOKMARK}>
        <strong style={{ display: 'block' }}>{title}</strong>
        {caption ? <span style={{ display: 'block' }}>{caption}</span> : null}
        {meta ? <small style={{ color: 'var(--muted)' }}>{meta}</small> : null}
      </a>
    );
  },

  'kg-product-card': (el, kids) => {
    const img = byClass(el, 'kg-product-card-image');
    const title = byClass(el, 'kg-product-card-title');
    const desc = byClass(el, 'kg-product-card-description');
    const rating = byClass(el, 'kg-product-card-rating');
    const stars = rating ? (rating.children as DOMNode[]).filter((s): s is Element => s instanceof Element) : [];
    const lit = stars.filter((s) => hasClass(s, 'kg-product-card-rating-active')).length;
    const btn = byClass(el, 'kg-product-card-button');
    const link = btn ? classify(btn.attribs.href) : null;
    return (
      <div style={BOX}>
        {img ? renderImg(img) : null}
        {title ? <h3>{kids(title)}</h3> : null}
        {stars.length ? (
          <p aria-label={`${lit} out of ${stars.length} stars`} style={{ display: 'flex', gap: 2, color: 'var(--brass)' }}>
            {stars.map((_, i) => <Star key={i} size={18} weight={i < lit ? 'fill' : 'regular'} aria-hidden />)}
          </p>
        ) : null}
        {desc ? kids(desc) : null}
        {btn && link ? renderLink(link, textOf(btn), { className: 'btn-pill' }) : null}
      </div>
    );
  },

  'kg-header-card': (el, kids) => {
    const img = byClass(el, 'kg-header-card-image');
    const heading = byClass(el, 'kg-header-card-heading');
    const sub = byClass(el, 'kg-header-card-subheading');
    const btn = byClass(el, 'kg-header-card-button');
    const link = btn ? classify(btn.attribs.href) : null;
    const text = textOf(btn);
    return (
      <div style={{ ...BOX, textAlign: 'center' }}>
        {img ? renderImg(img) : null}
        {heading && hasContent(heading.children as DOMNode[]) ? <h2>{kids(heading)}</h2> : null}
        {sub && hasContent(sub.children as DOMNode[]) ? <p>{kids(sub)}</p> : null}
        {btn && link && text ? renderLink(link, text, { className: 'btn-pill' }) : null}
      </div>
    );
  },

  // Ghost's own form signs people up to Ghost's member list, which we don't use. The card keeps its
  // words and its button, and the button goes to our sign-up form in the footer. (Not a second copy
  // of that form: it is styled for the dark footer and carries a fixed id.)
  'kg-signup-card': (el, kids) => {
    const heading = byClass(el, 'kg-signup-card-heading');
    const sub = byClass(el, 'kg-signup-card-subheading');
    const label = textOf(byClass(el, 'kg-signup-card-button-default')) || 'Sign up';
    return (
      <div style={{ ...BOX, textAlign: 'center' }}>
        {heading && hasContent(heading.children as DOMNode[]) ? <h3 style={{ marginTop: 0 }}>{kids(heading)}</h3> : null}
        {sub && hasContent(sub.children as DOMNode[]) ? <p>{kids(sub)}</p> : null}
        <a href="#newsletter" className="btn-pill">{label}</a>
      </div>
    );
  },

  'kg-toggle-card': (el, kids) => {
    const heading = byClass(el, 'kg-toggle-heading-text');
    const content = byClass(el, 'kg-toggle-content');
    if (!heading || !content) return <></>;
    return (
      <details>
        <summary>{kids(heading)}</summary>
        {kids(content)}
      </details>
    );
  },

  'kg-callout-card': (el, kids) => <div style={CALLOUT}>{kids(el)}</div>,
  'kg-button-card': (el, kids) => <div>{kids(el)}</div>,
  'kg-cta-card': (el, kids) => <div style={{ ...BOX, textAlign: hasClass(el, 'kg-cta-centered') ? 'center' : undefined }}>{kids(el)}</div>,
};

/**
 * Ghost's HTML card has no wrapper element: Koenig's html-renderer emits the pasted HTML between
 * these two comments. A Markdown card emits nothing at all around its HTML. Neither needs special
 * handling any more — both go through the same rules — but the HTML card's comments are kept as a
 * marker so a pasted <div class="kg-card …"> inside one is not mistaken for a real card.
 */
const HTML_CARD_BEGIN = /<!--kg-card-begin: html-->/g;
const HTML_CARD_END = /<!--kg-card-end: html-->/g;
const HTML_CARD_TAG = 'tmh-html-card';

/**
 * TRUSTED MODE (lib/ghostTrust.ts — posts whose every author Tina has listed). The allowlist is
 * off: tags, classes, inline styles, <style> blocks, svg and data-* render as written. What is
 * still removed is anything that can RUN or SUBMIT, by DOMPurify (scripts, on* handlers,
 * javascript:/data: URLs) plus FORBID_TAGS below (forms, base, meta, object…), so a stolen agency
 * login can restyle an article but cannot run code on the site or phish from it.
 * Kept on top of that, because they are site rules and not taste:
 * - Ghost's own cards still go through CARD (their raw markup needs Ghost's JS and CSS);
 * - outbound links get target/_blank, rel="… sponsored" and the UTM (CLAUDE.md §6);
 * - iframes are rebuilt by embedSrc, the only thing the CSP's frame-src would load anyway;
 * - <style> is wrapped in @scope (.ghost-raw) so it cannot restyle the header or footer;
 * - the page's own ids (RESERVED_IDS) cannot be taken.
 */
const PURIFY = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'target', 'loading'],
  FORBID_TAGS: ['form', 'input', 'textarea', 'select', 'option', 'base', 'meta', 'link', 'object', 'embed', 'frame', 'frameset', 'noscript', 'template'],
  FORBID_ATTR: ['srcdoc', 'action', 'formaction', 'ping'],
  FORCE_BODY: true, // otherwise a <style> at the very start is hoisted into <head> and lost
};
let hooked = false;
function purify(html: string): string {
  if (!hooked) {
    DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
      if ((data.attrName === 'id' || data.attrName === 'name') && RESERVED_IDS.has(data.attrValue)) data.keepAttr = false;
    });
    hooked = true;
  }
  return DOMPurify.sanitize(html, PURIFY);
}

function makeTrustedOptions(): HTMLReactParserOptions {
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (!(node instanceof Element)) return undefined;
      const tag = node.name;

      if (hasClass(node, 'kg-card')) {
        // Ghost's own card markup is never the agency's styling: it needs Ghost's theme CSS and JS,
        // and raw it renders, e.g., a white-on-nothing CTA button. Cards always render the house way.
        const key = kgClasses(node).find((c) => c in CARD);
        if (key) {
          const strict = makeOptions(false);
          return <>{CARD[key](node, (el) => domToReact(el.children as DOMNode[], strict))}</>;
        }
        return undefined; // an unknown card: render its markup as written
      }
      if (DROP_IF_EMPTY.has(tag) && !hasContent(node.children as DOMNode[])) return <></>;
      if (tag === 'style') {
        return <style>{`@scope (.ghost-raw) {
${textOf(node)}
}`}</style>;
      }
      if (tag === 'iframe') return embedSrc(node.attribs.src) ? <figure>{embedFrame(node)}</figure> : <></>;
      if (tag === 'a') {
        const link = node.attribs.href === undefined ? null : classify(node.attribs.href);
        if (!link) {
          delete node.attribs.href;
        } else if (link.kind === 'external') {
          node.attribs.href = link.url;
          node.attribs.target = '_blank';
          node.attribs.rel = 'noopener noreferrer sponsored';
          node.attribs['data-surface'] = 'editorial';
        } else {
          node.attribs.href = link.to;
          delete node.attribs.target;
        }
        return undefined; // the parser builds it, with their class and style, and recurses
      }
      return undefined;
    },
  };
  return options;
}

export default function GhostHtml({ html, trusted = false }: { html: string; trusted?: boolean }): ReactNode {
  if (trusted) return <div className="ghost-raw">{parse(purify(html), makeTrustedOptions())}</div>;
  const marked = html
    .replace(HTML_CARD_BEGIN, `<${HTML_CARD_TAG}>`)
    .replace(HTML_CARD_END, `</${HTML_CARD_TAG}>`);
  return <>{parse(marked, makeOptions(false))}</>;
}

function makeOptions(inHtmlCard: boolean): HTMLReactParserOptions {
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (!(node instanceof Element)) return undefined; // text is safe as-is; comments are skipped
      const tag = node.name;
      const kids: Kids = (el) => domToReact(el.children as DOMNode[], options);

      if (tag === HTML_CARD_TAG) {
        return <div>{domToReact(node.children as DOMNode[], inHtmlCard ? options : makeOptions(true))}</div>;
      }
      // A YouTube/Vimeo iframe pasted into an HTML or Markdown card plays like the embed card's.
      if (tag === 'iframe' && embedSrc(node.attribs.src)) return <figure>{embedFrame(node)}</figure>;
      if (NEVER_RENDER.has(tag)) return <></>;

      // Ghost cards. Only real Ghost output can be one: inside an HTML card it's pasted markup.
      if (!inHtmlCard && hasClass(node, 'kg-card')) {
        const key = kgClasses(node).find((c) => c in CARD);
        if (key) return <>{CARD[key](node, kids)}</>;
        console.warn(`[GhostHtml] dropped an unknown Ghost card: ${classes(node).join(' ')}`);
        return <></>;
      }

      if (DROP_IF_EMPTY.has(tag) && !hasContent(node.children as DOMNode[])) return <></>;
      if (HEADINGS.has(tag)) {
        return createElement(tag === 'h1' ? 'h2' : tag, { id: safeId(node) }, kids(node)); // the page already has its h1
      }
      if (tag === 'li' || tag === 'sup') return createElement(tag, { id: safeId(node) }, kids(node));
      if (PLAIN.has(tag)) return createElement(tag, null, kids(node));
      if (VOID.has(tag)) return createElement(tag);

      // Table structure keeps only element children: the newlines between <tr>s are not valid there.
      if (TABLE_PARTS.has(tag)) {
        const rows = domToReact((node.children as DOMNode[]).filter((n) => n instanceof Element), options);
        return tag === 'table'
          ? <div className="table-scroll"><table>{rows}</table></div>
          : createElement(tag, null, rows);
      }
      if (CELLS.has(tag)) {
        return createElement(tag, { colSpan: span(node.attribs.colspan), rowSpan: span(node.attribs.rowspan) }, kids(node));
      }

      if (tag === 'a') {
        const link = classify(node.attribs.href);
        if (!link) return <>{kids(node)}</>; // unsafe or unparseable: keep the words, lose the link
        const button = hasClass(node, 'kg-btn') || hasClass(node, 'kg-cta-button') || looksLikeButton(node);
        return renderLink(link, kids(node), {
          className: button ? 'btn-pill' : undefined,
          style: hasClass(node, 'kg-bookmark-container') ? BOOKMARK : undefined,
          id: safeId(node),
        });
      }

      if (tag === 'img') return renderImg(node);

      if (CONTAINERS.has(tag)) {
        const kg = kgClasses(node);
        if (kg.length === 0) return <div>{kids(node)}</div>; // pasted layout
        if (inHtmlCard) return <div>{kids(node)}</div>;
        if (!kg.some((c) => CARD_PARTS.has(c))) return <></>; // card chrome: controls, icons, metadata
        if (hasClass(node, 'kg-cta-sponsor-label')) return <p className="eyebrow">{kids(node)}</p>;
        if (hasClass(node, 'kg-bookmark-title')) return <strong style={{ display: 'block' }}>{kids(node)}</strong>;
        return <div>{kids(node)}</div>;
      }

      // Anything else (font, picture, center, a typo'd tag, a tag Ghost adds next year): keep the
      // words, lose the tag. Dropping it took its text with it, which is what the agency kept hitting.
      return <>{kids(node)}</>;
    },
  };
  return options;
}
