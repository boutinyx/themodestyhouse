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
 *
 * 2026-08-29: Tina sent 12 more links ("i want some new items in the popular
 * of other brands"). All twelve are here — but three of them only became
 * addable mid-task, and that is worth recording.
 *
 * Those three were `losyana.shop` URLs while this catalogue still scraped
 * `losyana.nl`. Both domains served a LIVE Shopify feed with different stock,
 * so two of her picks existed nowhere in our data and the third
 * ("La Palma") we held only from `.nl`, out of stock and unpublished. It was
 * raised rather than guessed at, because moving that brand's domain rewrites
 * the outbound URL of every Losyana product. A concurrent session then did
 * exactly that (`43d63af`, "move the house to losyana.shop"), and all three
 * resolved on the next look.
 *
 * The move also RENUMBERED the brand: `.shop` issues its own Shopify ids, so
 * `losyana:8786648891730` (Emirate Abaya - Pink, the 2026-08-23 pick) stopped
 * resolving and the rail silently lost a card. It is remapped below to
 * `losyana:9140604141893` — same product, same colourway, new storefront —
 * rather than deleted, because the pick is Tina's and only the id changed.
 * → docs/log/2026-08-29-popular-items-nine-added.md
 *
 * Matched by URL HANDLE against data/products.json, never by the pasted URL
 * verbatim and never by title: two of the nine have titles that disagree with
 * their own handle, because the brand renamed the colourway and kept the URL
 * (`khaki-floor-length-hardware-tunic` is titled "Olive Floor Length Hardware
 * Tunic"). Same trap as the colour-lead pins on 2026-08-28.
 */
export const POPULAR_ITEM_IDS = [
  'bemu:10225604296995', // Polka Dot Maxi Skirt - Black — $42.30 USD
  // Out of stock since at least 2026-08-29 and therefore unpublished, so the
  // lookup in app/page.tsx drops it and the rail renders one card short.
  // KEPT deliberately: `inStock: false` is reversible — a restock republishes
  // it and the pick reappears with no action. Deleting it would throw away
  // Tina's choice permanently to fix something that fixes itself. Same
  // reasoning as lib/dressSubtypes.test.ts's 2026-08-28 correction.
  'eynaa-paris:10742646669655', // Essential Long Sleeved T-Shirt [Off-white] — €39.90
  'la-petite-parisienne:15041729331540', // Yellow Knotted JESSY Set — €47.19
  'glamberry:15530007855369', // Maxi Dress With Flounced Hem — €48
  'hum:9289624256724', // Butterfly Kaftan Top - Black — ₹1,399
  // Was losyana:8786648891730 (€25) until the brand moved to losyana.shop on
  // 2026-08-29 and was reissued new Shopify ids. Same product, same colour.
  'losyana:9140604141893', // emirate abaya - pink — €59
  // Added 2026-08-29, in the order Tina sent them.
  'whiteicy:15666941722964', // Mei denim dress with mandarin collar — €49.90
  'manzaram:15722034135365', // Blouse with collar and button closure — €29.99
  'losyana:15642554827077', // wickel linen abaya - beige — €39
  'noureen:55334', // Closed Abaya Double Sleeve Pink/Powder — €64.99
  'losyana:15870729847109', // Madrid — €39
  'losyana:15870585110853', // La Palma — €79
  'summer-evenings:8731127480570', // Olive Floor Length Hardware Tunic — €73.95
  'lafemme:30415', // Balloon Sleeve Blouse — €34.99
  'diversity-modest:15846335807822', // The Unique Top Summer Soft Ivory — €25
  'jawda:16054289269116', // Brown Print Top — £24.95
  'summer-evenings:9282608660730', // White Cotton Smocked Tunic — €73.95
  'manzaram:15773219225925', // T-shirt with wide sleeves — €19.99
];
