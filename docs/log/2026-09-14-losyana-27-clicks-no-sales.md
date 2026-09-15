# Losyana affiliate: 27 clicks, 0 sales — normal at this volume, plus three real headwinds
**Date:** 2026-09-14 · **Status:** done (read-only research, nothing changed on the site)

## Goal
Tina, reading her GoAffPro dashboard: *"27 clicks but no things sold."* Establish whether that
is a problem, and what is actually in the way of a sale.

## What was checked

### 1. Is zero sales at 27 clicks a signal?
No. At an assumed 1–3% click-to-order rate (**an industry rule of thumb, not measured here**),
27 clicks predicts 0.27–0.81 orders. The probability of seeing zero is ~45–76%. Zero is the
most likely outcome. It only starts to mean something at roughly 150–300 clicks.

### 2. Who can actually buy
Shipping rates read from Losyana's own checkout (`/cart/shipping_rates.json`, an anonymous
cart with one in-stock variant, no order placed). Germany included as a control that must
return a rate:

```
Germany         DHL Express 1-3 days      €4.89
Netherlands     Express DHL 3-5 days      €8.99
United Kingdom  Express DHL 3-5 days      €8.99
United States   Standard International    €19.99
Canada          Standard International    €19.99
```

The storefront serves German by default; its shipping policy offers free shipping from €79 in
Germany and €150 in the EU, and names nothing outside the EU. **US visitors are 37% of TMH's
traffic** (`2026-09-09-who-is-actually-reached.md`) and face €19.99 shipping on a
German-language store. US import duties after the end of the de minimis exemption were not
checked here.

### 3. Attribution window
`2026-08-28-losyana-affiliate-wrong-store.md` read GoAffPro's own config: `cookie_duration`
86400 (**24 hours**), last-touch. A shopper who clicks, thinks, and buys on day two earns
nothing.

### 4. Is a sale tracked at all?
**Unproven.** The 27 clicks prove the `?ref=` parameter reaches GoAffPro. Nothing has ever
confirmed that an order is credited. No test purchase was made here. Buying through your own
link may break the programme's terms.

## Notes / follow-ups
- Ask Losyana (a) to confirm an order through `ref=dsgnnfgp` is credited and (b) whether the
  cookie can go from 24 hours to 30 days.
- When joining the other programmes, prefer houses that ship cheaply to the US/UK, where the
  visitors are.

---

# Addendum: "we build a small script for brands with no affiliate programme"
Tina's idea, same day. Assessed, not built.

**Platform:** 109 of 115 brand records are Shopify; 6 are WooCommerce (`platform: 'woo'` in
`data/brands.ts`).

**A homemade tracking script is the wrong vehicle, for three reasons:**
1. **Shopify no longer lets a merchant paste a script into checkout.** Additional Scripts and
   the Thank-you/Order-status script boxes were removed for non-Plus stores on 26 Aug 2026.
   Purchase tracking now has to be a Web Pixels app, which is an app build with review, not a
   snippet (addrevenue.io, revize.app, Elevar docs).
2. **The tool already exists, free.** GoAffPro's Shopify plan is $0/month with unlimited
   affiliates and revenue (apps.shopify.com/goaffpro, read today). Shopify Collabs is free for
   merchants but, per secondary sources, only US/CA/UK creators can join.
3. **Conflict of interest.** A brand would be trusting the party it pays to also count the
   sales it pays on.

**Kept:** the service half. Set up a free, existing app for the brand at no charge, in exchange
for a code. A per-brand discount code tracked in Shopify natively is a no-app fallback (no
cookie window, works across devices; it can leak to coupon sites).
