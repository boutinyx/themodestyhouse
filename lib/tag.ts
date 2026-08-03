import type { Garment } from '@/lib/types';

const GARMENT_RULES: [Garment, RegExp][] = [
  ['swim', /swim|burkini|bathing|swimsuit|board ?short|beachwear/i],
  ['abaya', /abaya|jilbab|kaftan|kimono/i],
  ['hijab', /hijab|scarf|shawl|khimar|turban|headband|underscarf/i],
  ['dress', /dress|gown|maxi|midi/i],
  ['skirt', /skirt/i],
  ['trousers', /trouser|pant|jean|legging|culotte|wide.?leg/i],
  ['set', /set|co.?ord|two.?piece|coordinate/i],
  ['top', /top|blouse|shirt|tunic|sweater|cardigan|bolero|blazer|vest/i],
];

const OCCASION_RULES: [string, RegExp][] = [
  ['wedding', /wedding|bridal|bridesmaid/i],
  ['prom', /prom/i],
  ['formal', /formal|evening|gown|occasion|gala/i],
  ['work', /work|office|blazer|tailored|business/i],
];
const SEASON_RULES: [string, RegExp][] = [
  ['summer', /summer|linen|sundress|short ?sleeve/i],
  ['winter', /winter|wool|knit|sweater|coat|fleece/i],
];
const ACTIVITY_RULES: [string, RegExp][] = [
  ['swim', /swim|burkini|bathing|beach/i],
  ['gym', /active|sport|gym|workout|athleis/i],
];

function matchAll(rules: [string, RegExp][], hay: string): string[] {
  return rules.filter(([, re]) => re.test(hay)).map(([k]) => k);
}

export function tagDiscovery(input: { title: string; productType: string; tags: string[] }) {
  const hay = [input.title, input.productType, ...(input.tags || [])].join(' ');
  // Trust the TITLE first (most accurate), then fall back to type/tags.
  let garment: Garment = 'other';
  for (const [g, re] of GARMENT_RULES) {
    if (re.test(input.title)) { garment = g; break; }
  }
  if (garment === 'other') {
    for (const [g, re] of GARMENT_RULES) {
      if (re.test(hay)) { garment = g; break; }
    }
  }
  return {
    garment,
    occasion: matchAll(OCCASION_RULES, hay),
    season: matchAll(SEASON_RULES, hay),
    activity: matchAll(ACTIVITY_RULES, hay),
  };
}
