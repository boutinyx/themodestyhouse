# The Losyana affiliate code is for a different store than the one we link to
**Date:** 2026-08-28 · **Status:** blocked on the merchant — no code changed

## What happened
Tina signed up to Losyana's GoAffPro programme at `losyana.goaffpro.com` and sent the
dashboard: 10% commission, referral link `https://losyana.shop/?ref=dsgnnfgp`, coupon code
`TINA`.

**The referral link is on `losyana.shop`. Every one of our 622 published Losyana products
points at `losyana.nl`.** `data/brands.ts` has `homepage: 'https://losyana.nl'`, and
`normalizeProduct` builds `url` as `${brand.homepage}/products/${handle}`.

## They are two separate Shopify stores, not two domains for one

```
https://www.losyana.nl    Shopify.shop = losyana.myshopify.com        807+ products
https://losyana.shop      Shopify.shop = losyana-shop.myshopify.com  1000+ products
```

Neither redirects to the other; both are live; the product handles differ
(`dubai-linen-set-black`, `old-vienna-skirt-white` vs `linen-corset-kimono-black`,
`ninja-underscarf-bone`). Both counts hit a 4-page probe cap, so both are larger.

Each runs its OWN GoAffPro install, keyed by shop in the loader URL:

```
losyana.nl    -> api.goaffpro.com/loader.js?shop=losyana.myshopify.com
losyana.shop  -> api.goaffpro.com/loader.js?shop=losyana-shop.myshopify.com
```

Separate installs mean separate affiliate databases, so a code issued by one has no meaning
to the other.

## Measured, with controls

Loaded each in a clean browser context and read the cookies and localStorage GoAffPro sets.

| load | tracking set |
|---|---|
| `losyana.shop/?ref=dsgnnfgp` — **control, must track** | `ref=dsgnnfgp`, `gfp_v_id=1537282817`, `gfp_ref_expires` (24h) |
| `losyana.shop/` — **control, must NOT** | none |
| `losyana.nl/?ref=dsgnnfgp` — the real question | **none** |
| `losyana.nl/` | none |

The two controls are what make the third row mean anything: the code demonstrably works
where it was issued, and demonstrably does nothing where our links go. Without the
`no ref` row, "nothing on .nl" could have been a probe that never sees any cookie
(§10.49 rule 3 — a table needs rows that must read PRESENT).

**As it stands the sign-up earns nothing from this site.** A visitor clicking a Losyana card
lands on `losyana.nl`, which has never heard of `dsgnnfgp`, and nothing would look wrong:
the page loads, the product is there, and the commission simply never exists. Exactly the
shape of failure §10.44 describes — invisible at both ends.

One useful detail from the `.nl` store's own GoAffPro config, for whenever a correct code
exists: `"goaffpro_identifiers":"gfp_ref,ref,aff,wpam_id,click_id"`, `cookie_duration`
86400 (24h), `last_touch`. So `?ref=` is an accepted parameter there — the mechanism is
right, only the code is wrong.

## Options

1. **Get a code for the `.nl` store.** Ask Losyana directly which store the `.nl`
   catalogue belongs to and for an affiliate account on it. Cleanest — the 622 products we
   already publish start earning with a one-field change.
2. **Add `losyana.shop` to the catalogue as its own house.** 1000+ products, and a working
   affiliate code already in hand. This turns a dead sign-up into monetisable inventory,
   but adding a house is an editorial decision, not a mechanical one — Tina's call.
3. Do both: they appear to be a main store and a second line.

## The generalisable warning

**Before joining any brand's programme, check that the affiliate link's domain matches the
`homepage` in `data/brands.ts`.** The risk is not hypothetical for the other two on the
shortlist: LaMeera Moda's storefront is `lameeramoda.com` but its myshopify handle is
`abyatifashion`, and Summer Evenings' GoAffPro portal at `summer-evenings.goaffpro.com`
reports "not attached" — the same message a nonsense handle returns. A programme can be
real and still be attached to a store we do not link to.

## Notes / follow-ups
- No code was written. There is nothing to wire until a code exists that tracks on a domain
  we actually link to.
- When one does: an optional `affiliate` field on `data/brands.ts` plus a branch in
  `withUtm()` (`lib/outbound.ts`) covers all ten outbound call sites at render time, leaves
  `Product.url` clean in raw (§8), and needs no cookie banner — the cookie is set on the
  brand's domain, under the brand's own consent, not ours.
