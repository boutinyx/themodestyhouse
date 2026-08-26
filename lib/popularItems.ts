/**
 * Hand-picked for the homepage "Popular items" rail (components/PopularShowcase.tsx).
 *
 * SUPERSEDED 2026-08-23: Tina sent 8 specific product links directly ("these
 * are the items that i want"). Matched each to its real catalogue id by
 * brand + URL handle (data/products.json) rather than trusting the pasted
 * URL verbatim — one (mariam-col.com) linked a locale-prefixed
 * (/nl-eu/) Dutch URL that doesn't match our stored (English-default) URL
 * for the same product, so it was found by cross-checking data/raw-products.json
 * for the SKU in the URL (MS433) instead. One target
 * (https://jennah-boutique.com/) was only a homepage link with no specific
 * product — asked her which item; she said skip it, so this rail is 7, not 8.
 *
 * Real product ids only — looked up against the live catalogue in
 * app/page.tsx rather than duplicating title/price/image here, so the rail
 * can never show stale data: if a brand is cut or a product is delisted, its
 * id just silently drops out of the lookup instead of rendering a dead card.
 *
 * 2026-08-26: Mariam's Collection was cut from the directory, so its pick
 * (Satin Lace Trim Top, MS433) was removed here too. The rail is now 6.
 */
export const POPULAR_ITEM_IDS = [
  'bemu:10225604296995', // Polka Dot Maxi Skirt - Black — $42.30 USD
  'eynaa-paris:10742646669655', // Essential Long Sleeved T-Shirt [Off-white] — €39.90
  'la-petite-parisienne:15041729331540', // Yellow Knotted JESSY Set — €47.19
  'glamberry:15530007855369', // Maxi Dress With Flounced Hem — €48
  'hum:9289624256724', // Butterfly Kaftan Top - Black — ₹1,399
  'losyana:8786648891730', // Emirate Abaya - Pink — €25
];
