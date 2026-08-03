import { BRANDS } from '@/data/brands';
import type { Vibe } from '@/lib/types';

export const VIBES: { slug: Vibe; title: string; intro: string }[] = [
  { slug: 'elegant', title: 'Elegant', intro: 'Refined, classic and quietly luxe — the polished end of modest.' },
  { slug: 'streetwear', title: 'Streetwear', intro: 'Relaxed, sporty and everyday — modest with an off-duty edge.' },
  { slug: 'maximalist', title: 'Maximalist', intro: 'Bold prints, colour and statement pieces — modest, turned up.' },
];

// brand slug -> vibe (pure data, safe to import anywhere)
export const brandVibe: Record<string, Vibe> = Object.fromEntries(
  BRANDS.map((b) => [b.slug, b.vibe])
);
