/**
 * What currency is a Shopify feed response actually quoting?
 *
 * WHY THIS EXISTS. `/products.json` states a price and never states its
 * currency. Shopify Markets serves that response in whatever currency it
 * decides the REQUESTER should see, so the number is frequently not in the
 * merchant's home currency. Until 2026-08-26 `lib/normalize.ts` stamped
 * `brand.currency` — a fixed string in `data/brands.ts` — onto it regardless.
 * The nightly refresh runs on a US GitHub runner, so stores with a US market
 * handed it USD, which we labelled DKK/GBP/EUR/AUD/CAD/SEK and then converted a
 * second time for display. 31 of 112 brands and 4,625 published products carried
 * a wrong price; Hidayah showed $3.12 for a 120 DKK scarf, Avyaana showed
 * $265.86 for a £167 dress. → docs/log/2026-08-26-currency-mislabelling.md
 *
 * THE RULE THIS ENCODES: the currency of a payload is a fact ABOUT THE PAYLOAD.
 * It must be read from the same response context that produced the number, never
 * asserted from configuration. `data/brands.ts:currency` is now the EXPECTED
 * value — useful for reporting drift, never the source of truth.
 *
 * We do not need the merchant's home currency. A USD number labelled USD renders
 * correctly. We only need to stop lying about what we received.
 *
 * HOW IT DISAMBIGUATES. A real Shopify product page names several currencies.
 * jaida.ca's underscarf page carries `"priceCurrency": "CAD"` for the offer and
 * `"priceCurrency": "USD"` twice more — for SHIPPING-RATE thresholds
 * (`eligibleTransactionVolume`), which have nothing to do with what the garment
 * costs. Choosing the first match would be guessing, and guessing is the defect
 * being replaced. So detection is ANCHORED ON THE FEED'S OWN PRICE: pair each
 * currency with the amount beside it and keep the pair whose amount equals the
 * number `/products.json` just gave us. That is self-validating — it proves the
 * currency belongs to the very figure we are about to store.
 *
 * WooCommerce needs none of this: its Store API returns `prices.currency_code`
 * inline (see `wooToShopify` in lib/ingest.ts).
 */

/** ISO-4217 is exactly three ASCII letters. Anything else is not a currency. */
const ISO_4217 = /^[A-Za-z]{3}$/;

/**
 * `"priceCurrency": "CAD", "price": 21.21` and the reverse order, as emitted
 * inside a schema.org Offer.
 *
 * The gap is `[^{}]` — no braces — because a price and its currency are SIBLING
 * KEYS OF ONE JSON OBJECT. Allowing the gap to cross an object boundary paired
 * jaida.ca's real 21.21 with the `priceCurrency: "USD"` of the shipping block
 * two objects later, which made a decidable page read as ambiguous. Distance
 * alone is not the constraint; structure is.
 */
const PAIR_CURRENCY_FIRST = /"priceCurrency"\s*:\s*"([A-Za-z]{2,8})"[^{}]{0,200}?"price"\s*:\s*"?([\d.]+)"?/g;
const PAIR_PRICE_FIRST = /"price"\s*:\s*"?([\d.]+)"?[^{}]{0,200}?"priceCurrency"\s*:\s*"([A-Za-z]{2,8})"/g;

/** Signals used only when the price anchor cannot resolve it. */
const UNANCHORED: RegExp[] = [
  // Open Graph, both attribute orders. Shopify's own themes emit content-first.
  /property=["']og:price:currency["']\s+content=["']([A-Za-z]{2,8})["']/g,
  /content=["']([A-Za-z]{2,8})["']\s+property=["']og:price:currency["']/g,
  // Shopify's inline storefront object — `active` IS the presentment currency,
  // and unlike JSON-LD it appears exactly once, so it cannot be ambiguous.
  /Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"([A-Za-z]{2,8})"/g,
  // Last resort: JSON-LD with no price to anchor against. Only trusted when the
  // whole page names ONE currency.
  /"priceCurrency"\s*:\s*"([A-Za-z]{2,8})"/g,
];

interface Pair {
  currency: string;
  price: number;
}

function pairs(html: string): Pair[] {
  const out: Pair[] = [];
  for (const [re, curIdx, priceIdx] of [
    [PAIR_CURRENCY_FIRST, 1, 2],
    [PAIR_PRICE_FIRST, 2, 1],
  ] as const) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const currency = m[curIdx];
      const price = Number(m[priceIdx]);
      if (ISO_4217.test(currency) && Number.isFinite(price)) {
        out.push({ currency: currency.toUpperCase(), price });
      }
    }
  }
  return out;
}

function soleMatch(html: string, res: RegExp[]): string | null {
  for (const re of res) {
    re.lastIndex = 0;
    const found = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      if (!ISO_4217.test(m[1])) return null; // malformed beats plausible
      found.add(m[1].toUpperCase());
    }
    if (found.size === 1) return [...found][0];
    if (found.size > 1) return null; // ambiguous — never choose
  }
  return null;
}

/**
 * The presentment currency a product page quoted, or null if it cannot be known.
 *
 * Pass `feedPrice` — the price `/products.json` gave for THIS product — whenever
 * it is available. It is what makes a multi-currency page resolvable, and what
 * makes the answer evidence rather than a preference.
 *
 * Returns null rather than a guess whenever the page is genuinely ambiguous, has
 * no signal, or carries a value that is not ISO-4217-shaped. A null is handled
 * by skipping the brand loudly (see `resolveFeedCurrency`), never by falling
 * back to the declared currency.
 */
export function extractPriceCurrency(html: string, feedPrice?: number): string | null {
  if (!html) return null;

  if (typeof feedPrice === 'number' && Number.isFinite(feedPrice) && feedPrice > 0) {
    // Tolerance covers rounding in the page's own serialisation (21.21 vs 21.2),
    // never a genuinely different amount.
    const tol = Math.max(0.02, feedPrice * 0.005);
    const matched = new Set(
      pairs(html)
        .filter((p) => Math.abs(p.price - feedPrice) <= tol)
        .map((p) => p.currency),
    );
    if (matched.size === 1) return [...matched][0];
    if (matched.size > 1) return null; // two currencies quoting the same number
  }

  return soleMatch(html, UNANCHORED);
}

export interface FeedCurrencyResolution {
  /** Safe to ingest this brand? */
  ok: boolean;
  /** The currency to stamp on every row of this fetch. Null when `ok` is false. */
  currency: string | null;
  /** The feed disagreed with `data/brands.ts` — worth reporting, not an error. */
  mismatch: boolean;
  /** Human-readable line for the ingest/publish output. */
  message?: string;
}

/**
 * Decides what currency a fetch's rows carry, and whether the fetch is usable.
 *
 * A mismatch with the declared currency is NORMAL and not a failure — it is the
 * routine case for any store serving a US runner. It is reported so a change in
 * a store's Markets configuration is visible rather than silent.
 *
 * An UNDETECTABLE currency is a failure. Falling back to `declared` is what
 * produced the original bug, so this function will not do it; the caller is
 * expected to skip the brand and say so out loud (CLAUDE.md §1, no silent
 * failure paths). Skipping leaves the brand's existing rows untouched, which
 * Invariant 12 requires anyway — a fetch may never cause a deletion.
 */
export function resolveFeedCurrency({
  detected,
  declared,
  brandSlug,
}: {
  detected: string | null;
  declared: string;
  brandSlug: string;
}): FeedCurrencyResolution {
  if (!detected) {
    return {
      ok: false,
      currency: null,
      mismatch: false,
      message:
        `${brandSlug}: could not determine the feed's currency from the storefront. ` +
        `Skipped — its existing rows are untouched. Declared in data/brands.ts is ${declared}.`,
    };
  }
  const mismatch = detected !== declared;
  return {
    ok: true,
    currency: detected,
    mismatch,
    message: mismatch
      ? `${brandSlug}: feed served ${detected}, data/brands.ts declares ${declared} — ` +
        `using ${detected}. (Shopify Markets serves a per-requester currency; this is expected.)`
      : undefined,
  };
}
