import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

export type Post = {
  slug: string;
  title: string;
  dek: string;
  category: string;
  author: string;
  date: string; // ISO yyyy-mm-dd
  body: string; // markdown
};

const DIR = path.join(process.cwd(), 'content', 'editorial');

function parse(file: string): Post {
  const raw = readFileSync(path.join(DIR, file), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fm: Record<string, string> = {};
  let body = raw;
  if (m) {
    body = m[2].trim();
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) {
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
        fm[k] = v;
      }
    }
  }
  return {
    slug: fm.slug || file.replace(/\.md$/, ''),
    title: fm.title || '',
    dek: fm.dek || '',
    category: fm.category || 'Story',
    author: fm.author || 'The Modesty House',
    date: fm.date || '',
    body,
  };
}

export function getPosts(): Post[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.md'))
    .map(parse)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((p) => p.slug === slug);
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
