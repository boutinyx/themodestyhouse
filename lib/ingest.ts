// Shopify feed ingestion — pagination, the completeness bookkeeping that
// delisting depends on, and the split into publishable vs filtered rows.
//
// The pagination loop takes an injected page fetcher so its completeness
// accounting is testable without a network (lib/ingest.test.ts). Both
// scripts/refresh.mjs and scripts/add-brands.mjs use this module, so there is
// one implementation of these rules rather than the verbatim duplication §8
// already flags between build-data.mjs and lib/exclude.test.ts.
import type { Brand } from '@/lib/types';
import { normalizeProductDetailed, type ShopifyProduct } from '@/lib/normalize';
import { isCompleteFetch, type BrandFetchResult, type FetchOutcome } from '@/lib/lifecycle';

export const PAGE_CAP = 20;
export const PAGE_SIZE = 250;

export interface PageResult {
  status: number;
  /** null means the page could not be read — never treat it as "no products". */
  products: ShopifyProduct[] | null;
  /** The page exhausted its 429 retries. */
  gaveUp?: boolean;
}

export type PageFetcher = (page: number) => Promise<PageResult>;

/**
 * Walks a brand's feed and reports both what it found AND how confident it is
 * that it saw everything. §10.3's lesson applies to the shape of the result,
 * not just the status code: a failed page yields `products: null`, which is
 * never conflated with an empty page (the natural end-of-pagination signal).
 */
export async function paginateFeed(
  fetchPage: PageFetcher,
  maxPages: number = PAGE_CAP,
): Promise<{ products: ShopifyProduct[]; outcome: FetchOutcome }> {
  const products: ShopifyProduct[] = [];
  const outcome: FetchOutcome = {
    reachedNaturalEnd: false,
    gaveUpOn429: false,
    sawErrorStatus: false,
    hitPageCap: false,
  };

  for (let page = 1; page <= maxPages; page++) {
    const res = await fetchPage(page);
    if (res.products === null) {
      if (res.gaveUp) outcome.gaveUpOn429 = true;
      else outcome.sawErrorStatus = true;
      return { products, outcome };
    }
    if (res.products.length === 0) {
      outcome.reachedNaturalEnd = true;
      return { products, outcome };
    }
    products.push(...res.products);
  }

  // Fell out of the loop with every page full: there may be more we never saw.
  outcome.hitPageCap = true;
  return { products, outcome };
}

/** Splits a fetched feed into rows we can publish and rows our own filters reject. */
export function classifyFeed(
  feed: ShopifyProduct[],
  brand: Brand,
  complete: boolean,
): BrandFetchResult {
  const normalized = [];
  const rejected = [];
  for (const sp of feed) {
    const { product, reason } = normalizeProductDetailed(sp, brand);
    if (product) normalized.push(product);
    else rejected.push({ id: `${brand.slug}:${sp.id}`, reason: reason! });
  }
  return { brandSlug: brand.slug, normalized, rejected, complete };
}

// --- real network fetcher ---------------------------------------------------

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Persistent page fetcher: keeps retrying a rate-limited page (up to ~14
 * attempts, capped backoff) so pagination completes instead of truncating.
 * Truncation is not merely lossy here — it downgrades the fetch to incomplete,
 * which blocks delisting for the whole brand.
 */
export function httpPageFetcher(brand: Brand, pause = sleep): PageFetcher {
  return async (page: number): Promise<PageResult> => {
    const url = `${brand.feedUrl}?limit=${PAGE_SIZE}&page=${page}`;
    if (page > 1) await pause(2000); // space out pages to ease rate-limiting
    for (let attempt = 0; attempt < 14; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, { headers: { 'User-Agent': UA } });
      } catch (e) {
        console.warn(`   fetch error: ${(e as Error).message}; retrying`);
        await pause(5000);
        continue;
      }
      if (res.status === 429) {
        const wait = Math.min(8000 + attempt * 4000, 45000);
        console.warn(`   429 rate-limited; backing off ${wait / 1000}s (attempt ${attempt + 1})`);
        await pause(wait);
        continue;
      }
      if (!res.ok) return { status: res.status, products: null };
      const data = await res.json().catch(() => ({}));
      return { status: 200, products: (data.products || []) as ShopifyProduct[] };
    }
    return { status: 429, products: null, gaveUp: true };
  };
}

// --- WooCommerce Store API fetcher (brand.platform === 'woo') ---------------
// Maps a WooCommerce Store API product to the ShopifyProduct shape so the rest
// of the pipeline (normalizeProductDetailed, tagDiscovery, filters) is unchanged.
// feedUrl for a woo brand is the Store API list endpoint, e.g.
//   https://lafemmecollectie.nl/wp-json/wc/store/v1/products

interface WooProduct {
  id: number;
  name?: string;
  slug?: string;
  permalink?: string;
  is_in_stock?: boolean;
  prices?: { price?: string; currency_minor_unit?: number };
  categories?: { name?: string }[];
  images?: { src?: string }[];
}

export function wooToShopify(w: WooProduct): ShopifyProduct {
  const minor = typeof w.prices?.currency_minor_unit === 'number' ? w.prices.currency_minor_unit : 2;
  const price = String(Number(w.prices?.price ?? '0') / 10 ** minor);
  const cats = (w.categories || []).map((c) => c?.name).filter(Boolean) as string[];
  return {
    id: w.id,
    title: w.name || '',
    handle: w.slug || String(w.id),
    url: w.permalink, // Woo product URL differs from Shopify's /products/<handle>
    product_type: cats[0] || '',
    tags: cats,
    variants: [{ price, available: !!w.is_in_stock }],
    images: (w.images || []).map((im) => ({ src: im.src || '' })).filter((i) => i.src),
  };
}

/** WooCommerce Store API page fetcher — array response, per_page cap 100. */
export function wooPageFetcher(brand: Brand, pause = sleep): PageFetcher {
  return async (page: number): Promise<PageResult> => {
    const url = `${brand.feedUrl}?per_page=100&page=${page}`;
    if (page > 1) await pause(1500);
    for (let attempt = 0; attempt < 14; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, { headers: { 'User-Agent': UA } });
      } catch (e) {
        console.warn(`   fetch error: ${(e as Error).message}; retrying`);
        await pause(5000);
        continue;
      }
      if (res.status === 429) {
        const wait = Math.min(8000 + attempt * 4000, 45000);
        console.warn(`   429 rate-limited; backing off ${wait / 1000}s (attempt ${attempt + 1})`);
        await pause(wait);
        continue;
      }
      if (!res.ok) return { status: res.status, products: null };
      const data = await res.json().catch(() => null);
      // A valid array (possibly empty) is a real page; anything else is an error,
      // never conflated with the empty-page end-of-pagination signal (§10.3).
      if (!Array.isArray(data)) return { status: res.status, products: null };
      return { status: 200, products: (data as WooProduct[]).map(wooToShopify) };
    }
    return { status: 429, products: null, gaveUp: true };
  };
}

/** Fetches and classifies one brand's whole feed (Shopify or WooCommerce). */
export async function fetchBrand(brand: Brand): Promise<BrandFetchResult & { outcome: FetchOutcome }> {
  const fetcher = brand.platform === 'woo' ? wooPageFetcher(brand) : httpPageFetcher(brand);
  const { products, outcome } = await paginateFeed(fetcher);
  return { ...classifyFeed(products, brand, isCompleteFetch(outcome)), outcome };
}
