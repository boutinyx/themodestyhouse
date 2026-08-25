/**
 * Hand-picked for the homepage "Our picks on abayas" rail — the second
 * PopularShowcase on the page, sitting under the Everyday Lace edit banner.
 *
 * Tina, 2026-08-25: *"i want a card row like popular items from brands and
 * then for abayas"* + a pasted list of 17 products, then *"i want it under
 * everyday lace"* and *"our picks on abayas"* for the heading. She pasted
 * titles + brands + prices rather than URLs, so each one was matched back to
 * its real catalogue id by exact title within that brand (data/products.json),
 * and the ORDER here is hers verbatim — cheapest first, which is the order she
 * sent them in. Do not re-sort it.
 *
 * Real product ids only, same rule as lib/popularItems.ts: app/page.tsx looks
 * each one up in the live catalogue rather than duplicating title/price/image
 * here, so a cut or delisted product silently drops out of the rail instead of
 * rendering a dead card.
 *
 * One of the 17 is currently NOT rendering, and is deliberately still listed:
 * `avyaana:15784275607926` ("Blush Closed Abayah") went `inStock: false` in
 * the 2026-08-25 nightly refresh, so build-data drops it from products.json.
 * It is still in Avyaana's feed (not delisted), so leaving the id here means
 * the card comes back on its own if the brand restocks it. The rail renders 16
 * until then.
 */
export const ABAYA_PICK_IDS = [
  'losyana:8955476967762', // Emirate abaya - lightbeige — €25
  'bayt-el-hayat:6976881229885', // Brown Crinkle Open Abaya — £22.42
  'veiled:7510542516329', // Dalal Embroidered Open Abaya - Peach — $32.50
  'modesty-in-style:10761650209078', // Bella Butterfly Abaya — A$50
  'fares:8281670582463', // Pleated Detail Abaya - Layal — $36.80
  'ayaana:7285066825919', // Afiya • Pastel Green Abaya — $37
  'avyaana:15784275607926', // Blush Closed Abayah — £28 — out of stock, see above
  'avyaana:15784273740150', // Peach Floral — £28
  'modern-hijabi:8275564167382', // Israa Textured Abaya Set - Misty Rose — $40
  'kimodesty:12730', // Essential Abaya Dress – Deep Brown — €34.95
  'manzaram:15648922501445', // Cotton Abaya set — €34.99
  'jawda:16005520720252', // Grey Powder Touch Crepe Umbrella Sleeve Abaya — £29.95
  'bayt-el-hayat:7271166410813', // Habiba Champagne Satin Open Farasha Abaya — £30.80
  'modesty-in-style:10603112628534', // Hilal Abaya — A$60
  'jawda:16054287597948', // Mist Blue Etched Crepe Lace Abaya — £33.95
  'nour-al-houda:7680563806256', // Aria Flounce Open Abaya - Lilac — A$65
  'nour-al-houda:7624295612464', // Sasha Satin Open Abaya - Copper — A$65
];
