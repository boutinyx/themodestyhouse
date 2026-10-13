# Pinterest via the API: state of the account, and 12 pins still titled "Hijabi outfit"
**Date:** 2026-10-13 · **Status:** partial — read access works, pin editing is blocked by Pinterest

## Goal
Growth plan item 3 (`2026-10-13-growth-research-plan.md`). Tina put a real access token (`pina_…`) in `.env`
as `PINTEREST_API` (the earlier value was the 40-hex app secret, which returns 401).

## What the API shows (read-only, 2026-09-13 → 2026-10-12)
- Account "The Modesty House" / @themodestyhousehq, BUSINESS, 20 boards, 65 created pins listed by `/v5/pins`.
- **56,335 impressions · 2,008 pin clicks · 401 saves · 17 outbound clicks.**
- The pin plan from 2026-09-27 is DONE: all 19 outfit images are posted (Sep 27–30). The top pins (15,981 /
  10,600 impressions) now carry `https://themodestyhouse.com/` as their link.
- 12 of the 19 new pins (images 10–23) are still titled "Hijabi outfit" with no description. Pins matched to the
  source images by a 16×20 greyscale distance: every best match 1.8–4.5, every runner-up ≥ 37.

## What blocked it
`PATCH /v5/pins/{id}` → `401 {"code":3,"message":"Your application does not have access to this restricted
feature: pin_edit"}`. Nothing was changed on any pin. Editing needs Pinterest to grant the app the `pin_edit`
feature (Standard access, applied for in the developer portal). Title/description edits do not reset a pin's
stats (only a LINK edit does — 2026-09-13), so these 12 are safe to edit by hand.

## The copy, for editing by hand (link unchanged on all 12)
Based on `2026-09-27-pin-copy-ready-to-post.md`, with prices removed (they go stale) and two pieces that are no
longer published (Kamin "The Naya", Eynaa Paris bomber) described without the brand. Image 15 uses Tina's
corrected Arakai "Retaj Linen Shirt". All other named products verified published today.

**https://pinterest.com/pin/589549407520443786/** (image 10)  
Title: Brown boucle jacket over a creme maxi dress  
Description: Brown Boucle Jacket by Chic & Modesty over a creme long-sleeve maxi dress. #modestfashion #autumnoutfit #hijabioutfit

**https://pinterest.com/pin/589549407520448371/** (image 11)  
Title: Creme long-sleeve maxi dress  
Description: A creme long-sleeve maxi dress, worn with a brown boucle jacket. #modestfashion #maxidress #modestdress

**https://pinterest.com/pin/589549407520476749/** (image 12)  
Title: Brown boucle jacket, close up  
Description: Brown Boucle Jacket by Chic & Modesty. #modestfashion #bouclejacket #autumnstyle

**https://pinterest.com/pin/589549407520470302/** (image 13)  
Title: Blue striped longline shirt with light-wash jeans  
Description: Lia Longline Shirt in Blue Stripe by Nour Al Houda with Wide Leg Denim Cotton Jeans in Light Blue by Nihan. #modestfashion #hijabioutfit #stripedshirt

**https://pinterest.com/pin/589549407520450700/** (image 14)  
Title: Light blue wide-leg jeans with a striped longline shirt  
Description: Wide Leg Denim Cotton Jeans in Light Blue by Nihan. #modestfashion #widelegjeans #modestdenim

**https://pinterest.com/pin/589549407520481217/** (image 15)  
Title: Cream linen shirt with taupe wide-leg trousers  
Description: Retaj Linen Shirt in White by Arakai Studio with Wide Leg Pant in Coffee Brown by Haya Active. #modestfashion #hijabioutfit #linenshirt

**https://pinterest.com/pin/589549407520483180/** (image 16)  
Title: Taupe wide-leg trousers  
Description: Wide Leg Pant in Coffee Brown by Haya Active. #modestfashion #widelegtrousers #neutralstyle

**https://pinterest.com/pin/589549407520501271/** (image 18)  
Title: Black oversized bomber jacket with cream wide-leg trousers  
Description: A black oversized bomber jacket with Relaxed Fit Pants in Bare by Fares. #modestfashion #bomberjacket #hijabioutfit

**https://pinterest.com/pin/589549407520502472/** (image 20)  
Title: Cream relaxed wide-leg trousers  
Description: Relaxed Fit Pants in Bare by Fares. #modestfashion #widelegtrousers #neutraloutfit

**https://pinterest.com/pin/589549407520488529/** (image 21)  
Title: Olive belted blazer with a white blouse and dark denim  
Description: The Noble Belted Blazer in Olive by Losyana with Zahra Cotton Blouse in White and Nova Denim Pants in Dark Wash, both by Nour Al Houda. #modestfashion #hijabioutfit #blazer

**https://pinterest.com/pin/589549407520490005/** (image 22)  
Title: Olive belted blazer over a white puff-sleeve blouse  
Description: The Noble Belted Blazer in Olive by Losyana. #modestfashion #olivegreen #modestblazer

**https://pinterest.com/pin/589549407520494225/** (image 23)  
Title: Dark wash wide-leg denim with an olive blazer  
Description: Nova Denim Pants in Dark Wash by Nour Al Houda. #modestfashion #modestdenim #widelegjeans

