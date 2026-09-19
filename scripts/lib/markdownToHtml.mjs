/**
 * The exact markdown grammar components/Markdown.tsx implements — nothing more, because
 * nothing more is in the editorial files: `##` / `###`, paragraphs, `- ` lists, `---`,
 * `**bold**`, `*italic*`, `[text](url)`, `**[text](url)**` and `code`.
 *
 * Used once, by scripts/ghost-import.mjs, to move the five markdown posts into Ghost.
 *
 * Internal links (`/modest-dresses`) are written as ABSOLUTE site URLs. Ghost rewrites a
 * relative link onto its own host (`https://cms.…/modest-dresses`) when the Content API
 * serves it, which would make every internal link look external and point at a redirect
 * theme. An absolute themodestyhouse.com URL survives untouched and components/GhostHtml.tsx
 * classifies it as internal by origin.
 */

const SITE = 'https://themodestyhouse.com';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = (u) => esc(u.startsWith('/') ? SITE + u : u);

function inline(text) {
  const parts = text.split(/(\*\*\[[^\]]+\]\([^)]+\)\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts
    .map((p) => {
      if (!p) return '';
      let m;
      if ((m = p.match(/^\*\*\[([^\]]+)\]\(([^)]+)\)\*\*$/))) return `<strong><a href="${href(m[2])}">${esc(m[1])}</a></strong>`;
      if ((m = p.match(/^`([^`]+)`$/))) return `<code>${esc(m[1])}</code>`;
      if ((m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/))) return `<a href="${href(m[2])}">${esc(m[1])}</a>`;
      if ((m = p.match(/^\*\*([^*]+)\*\*$/))) return `<strong>${esc(m[1])}</strong>`;
      if ((m = p.match(/^\*([^*]+)\*$/))) return `<em>${esc(m[1])}</em>`;
      return esc(p);
    })
    .join('');
}

export function markdownToHtml(body) {
  return body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((t) => {
      if (t === '---') return '<hr>';
      if (t.startsWith('### ')) return `<h3>${inline(t.slice(4))}</h3>`;
      if (t.startsWith('## ')) return `<h2>${inline(t.slice(3))}</h2>`;
      const lines = t.split('\n');
      if (lines.every((l) => l.trim().startsWith('- '))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.trim().slice(2))}</li>`).join('')}</ul>`;
      }
      return `<p>${inline(t.replace(/\n/g, ' '))}</p>`;
    })
    .join('\n');
}

/** Frontmatter exactly as lib/posts.ts used to read it (flat `key: "value"` lines). */
export function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fm = {};
  let body = raw;
  if (m) {
    body = m[2].trim();
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return { fm, body };
}

/** Words only, for comparing what we sent with what Ghost stored. */
export function words(text) {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function htmlToText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}
