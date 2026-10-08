import Link from 'next/link';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import parse, { domToReact, Element, type DOMNode, type HTMLReactParserOptions } from 'html-react-parser';
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
 * So every element is rebuilt here with attributes we chose, or dropped along
 * with its children.
 *
 * Server component: nothing here needs the browser.
 */

const SITE_ORIGIN = 'https://themodestyhouse.com';

/** Elements copied through with NO attributes (no id, class, style, data-*, on*). */
const PLAIN = new Set([
  'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'strong', 'em', 'b', 'i',
  'code', 'pre', 'figcaption', 'span',
  // Every remaining inline format the Ghost editor offers. `u` was missing until 2026-10-08,
  // and a dropped tag takes its words with it: an underlined link rendered as an empty <a>.
  'u', 's', 'del', 'mark', 'sub', 'sup',
]);
/** Blocks that are dropped when they hold no text and no image: Ghost leaves empty ones behind. */
const DROP_IF_EMPTY = new Set(['p', 'h1', 'h2', 'h3', 'h4']);
const VOID = new Set(['hr', 'br']);

/**
 * The only Ghost card classes that render. `kg-card` alone is deliberately NOT here:
 * it is on every card, including the gallery, embed, toggle and HTML cards we drop.
 */
const CARD_CLASSES = new Set([
  'kg-callout-card', 'kg-callout-emoji', 'kg-callout-text',
  'kg-button-card',
  'kg-bookmark-card', 'kg-bookmark-container', 'kg-bookmark-content',
  'kg-bookmark-title', 'kg-bookmark-description',
  'kg-cta-card', 'kg-cta-sponsor-label-wrapper', 'kg-cta-sponsor-label', 'kg-cta-content',
  'kg-cta-image-container', 'kg-cta-content-inner', 'kg-cta-text',
]);

const CALLOUT: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  margin: '28px 0',
  padding: '16px 18px',
  background: 'var(--bone)',
  border: '1px solid var(--hairline)',
  borderRadius: 8,
};
const CTA: React.CSSProperties = {
  margin: '32px 0',
  padding: '24px 22px',
  background: 'var(--bone)',
  border: '1px solid var(--hairline)',
  borderRadius: 8,
};
const BOOKMARK: React.CSSProperties = {
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
const hasAnyCardClass = (el: Element) => classes(el).some((c) => CARD_CLASSES.has(c));

function hasContent(nodes: DOMNode[]): boolean {
  return nodes.some((n) =>
    n instanceof Element
      ? n.name === 'img' || hasContent(n.children as DOMNode[])
      : n.type === 'text' && (n as unknown as { data: string }).data.trim() !== '',
  );
}

function ghostHost(): string | undefined {
  try {
    return new URL(process.env.GHOST_URL ?? '').host;
  } catch {
    return undefined;
  }
}

/** Parsed-and-classified href, or null when it must not become a link. */
function classify(href: string | undefined): { kind: 'internal'; to: string } | { kind: 'external'; url: string } | null {
  if (!href) return null;
  let u: URL;
  try {
    u = new URL(href, SITE_ORIGIN);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  // Compared as origins, never `startsWith('/')`: Ghost emits protocol-relative `//host/…`.
  if (u.origin === SITE_ORIGIN) return { kind: 'internal', to: u.pathname + u.search + u.hash };
  // Ghost tags outbound links `?ref=<its own host>` by default, and `ref` is losyana.shop's
  // affiliate key. withUtm never overwrites an existing key, so Ghost's would win over ours.
  const ours = new Set([ghostHost(), new URL(SITE_ORIGIN).host].filter(Boolean));
  if (ours.has(u.searchParams.get('ref') ?? '')) u.searchParams.delete('ref');
  return { kind: 'external', url: withUtm(u.toString(), 'editorial') };
}

/**
 * Ghost's HTML card has no wrapper element: Koenig's html-renderer emits the pasted HTML between
 * these two comments. They are turned into a marker element so the card's content can be rendered,
 * through the SAME allowlist, with its layout containers (div, section…) kept as bare wrappers.
 */
const HTML_CARD_BEGIN = /<!--kg-card-begin: html-->/g;
const HTML_CARD_END = /<!--kg-card-end: html-->/g;
const HTML_CARD_TAG = 'tmh-html-card';
/** Containers pasted HTML uses for layout. Inside an HTML card they keep their children, lose every attribute. */
const HTML_CARD_CONTAINERS = new Set(['div', 'section', 'article', 'header', 'footer', 'aside', 'center', 'main', 'nav']);
/**
 * Tags that can run, embed or submit something. Everywhere else an unsupported tag INSIDE A LINK is
 * unwrapped (its words kept), because dropping it empties the link — the 2026-10-08 `<u>` failure.
 */
const NEVER_UNWRAP = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea',
  'template', 'noscript', 'svg', 'math', 'video', 'audio', 'canvas', 'link', 'meta', 'base',
]);
const looksLikeButton = (el: Element) => classes(el).some((c) => /btn|button/i.test(c));

export default function GhostHtml({ html }: { html: string }): ReactNode {
  const marked = html
    .replace(HTML_CARD_BEGIN, `<${HTML_CARD_TAG}>`)
    .replace(HTML_CARD_END, `</${HTML_CARD_TAG}>`);
  const options = makeOptions(false, false);
  return <>{parse(marked, options)}</>;
}

function makeOptions(inHtmlCard: boolean, inLink: boolean): HTMLReactParserOptions {
  const options: HTMLReactParserOptions = {
    replace(node) {
      if (!(node instanceof Element)) return undefined; // text is safe as-is; comments are skipped
      const tag = node.name;
      const kids = () => domToReact(node.children as DOMNode[], options);

      if (tag === HTML_CARD_TAG) {
        if (inHtmlCard) return <>{kids()}</>;
        return <div>{domToReact(node.children as DOMNode[], makeOptions(true, inLink))}</div>;
      }
      if (inHtmlCard && HTML_CARD_CONTAINERS.has(tag)) return <div>{kids()}</div>;

      if (DROP_IF_EMPTY.has(tag) && !hasContent(node.children as DOMNode[])) return <></>;
      if (tag === 'h1') return createElement('h2', null, kids()); // the page already has its h1
      if (PLAIN.has(tag)) return createElement(tag, null, kids());
      if (VOID.has(tag)) return createElement(tag);

      if (tag === 'a') {
        const link = classify(node.attribs.href);
        if (!link) return <>{kids()}</>; // unsafe or unparseable: keep the words, lose the link
        const linkKids = () => domToReact(node.children as DOMNode[], makeOptions(inHtmlCard, true));
        const button = hasClass(node, 'kg-btn') || hasClass(node, 'kg-cta-button') || (inHtmlCard && looksLikeButton(node));
        const className = button ? 'btn-pill' : undefined;
        if (link.kind === 'internal') {
          return <Link href={link.to} className={className}>{linkKids()}</Link>;
        }
        return (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            data-surface="editorial"
            className={className}
          >
            {linkKids()}
          </a>
        );
      }

      if (tag === 'img') {
        const host = ghostHost();
        let ok = false;
        try {
          ok = !!host && new URL(node.attribs.src ?? '').host === host;
        } catch {
          ok = false;
        }
        if (!ok) return <></>; // a hotlinked image would be blocked by the CSP anyway
        const { src, srcset, sizes, alt, width, height } = node.attribs;
        return (
          // eslint-disable-next-line @next/next/no-img-element -- Ghost sizes it; see lib/ghostImage.ts
          <img
            src={src}
            srcSet={srcset}
            sizes={sizes}
            alt={alt ?? ''}
            width={width ? Number(width) : undefined}
            height={height ? Number(height) : undefined}
            loading="lazy"
            decoding="async"
          />
        );
      }

      if (tag === 'figure') {
        return hasClass(node, 'kg-image-card') ? createElement('figure', null, kids()) : <></>;
      }

      if (tag === 'div') {
        if (!hasAnyCardClass(node)) return <></>; // unsupported card: drop with its children
        if (hasClass(node, 'kg-callout-card')) return <div style={CALLOUT}>{kids()}</div>;
        if (hasClass(node, 'kg-cta-card')) {
          return <div style={{ ...CTA, textAlign: hasClass(node, 'kg-cta-centered') ? 'center' : undefined }}>{kids()}</div>;
        }
        if (hasClass(node, 'kg-cta-sponsor-label')) return <p className="eyebrow">{kids()}</p>;
        if (hasClass(node, 'kg-bookmark-container')) return <div style={BOOKMARK}>{kids()}</div>;
        if (hasClass(node, 'kg-bookmark-title')) return <strong style={{ display: 'block' }}>{kids()}</strong>;
        return <div>{kids()}</div>;
      }

      // Inside a link, keep the words of anything not in NEVER_UNWRAP.
      if (inLink && !NEVER_UNWRAP.has(tag)) return <>{kids()}</>;
      // script, style, iframe, svg, video, audio, form, input, and anything else: gone, children too.
      return <></>;
    },
  };
  return options;
}
