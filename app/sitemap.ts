import type { MetadataRoute } from 'next';
import { LANES } from '@/lib/lanes';

const BASE = 'https://themodestyhouse.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ['', '/directory', '/editorial', '/about', '/designers', '/privacy', '/terms'];
  const lanePaths = LANES.map((l) => `/${l.slug}`);
  return [...staticPaths, ...lanePaths].map((p) => ({
    url: `${BASE}${p}`,
    changeFrequency: 'weekly',
    priority: p === '' ? 1 : 0.7,
  }));
}
