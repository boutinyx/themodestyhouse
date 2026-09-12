# Pinterest pin repair — planned, and blocked on the UI
**Date:** 2026-09-12 (updated 2026-09-13) · **Status:** partial — 1 of 19 pins fixed and live; the rest blocked

## Goal
Tina: *"can you fix that"* → *"you do everything"*. The 19 created pins on
`@themodestyhousehq` carry **no destination URL**, are **all titled "Hijabi outfit"**, and
have hashtag strings instead of descriptions. 105.6k impressions a month, 0 outbound clicks.

## What was established (first-party, today)

Confirmed on pin `589549407517936239` by opening it:
```
title        "Hijabi outfit"
description  #outfit #fashion #hijab #ootd #style #clothing #outfitinspo
             #hijabioutfits #fall #hijabifashion #modest #2000s
destination  none
```
19 created-pin ids read off the grid:
```
589549407519861694  589549407519768379  589549407519742892  589549407519735681
589549407519722170  589549407519715828  589549407519705858  589549407519701421
589549407519699840  589549407519694651  589549407519002654  589549407518599514
589549407518234632  589549407518196328  589549407518196307  589549407518030782
589549407518030762  589549407517977788  589549407517936239
```
The account is now `@themodestyhousehq` / "The Modesty House", 84 followers, 105.6k monthly
views — renamed from `@thetinaesthetic` by a concurrent session today. Any doc still calling
it `@thetinaesthetic` is stale.

## The collision, caught before it executed

`modest-house-26` had been told by Tina, minutes earlier, to **delete the legacy boards
including "Clothing"** — which is where these 19 pins live. **Deleting a board deletes its
pins.** That would have destroyed the account's entire impression base and its two best pins
(363 and 325 saves) while a second session was being asked to repair them. Neither instruction
was wrong on its own; together they cancel.

Both sessions stopped. Nothing deleted, no pin touched. Agreed split: **this session owns
pins** (move, destination, title, description — all in the one edit dialog, so two sessions in
the same dialog is how one overwrites the other), **`modest-house-26` owns boards** and deletes
only once a board is empty.

**The resolution is not either/or.** Moving a pin to another board preserves the pin, its URL
and its accumulated impressions and saves; only deleting the board destroys them. So:
1. move the 19 created pins out of "Clothing" into the new category boards,
2. fix each in place,
3. delete "Clothing" once empty, with its ~124 saved repins of other people's content.

Correction worth recording: **"Clothing" holds 143 pins, not 19.** ~124 are repins that carry
nothing for her; the 19 created ones are the asset.

## What blocked it

**Pinterest's edit dialog will not open under browser automation.** Reproduced independently
by two sessions:
- this session: `...` menu clicked via `javascript_tool` (hung), via `computer` twice (hung),
  `/pin/<id>/edit/` (redirects to the pin), `/_created/` grid (hung 3×), and finally the
  profile root itself started returning a blank body.
- `modest-house-26`: the board edit dialog hung on four separate occasions today.

Every hang is `Script injection timed out after 5000ms`. Individual pin pages and the profile
root render fine until enough activity accumulates, which is consistent with anti-automation
throttling rather than a bug in any one call.

**The Pinterest API is the real unblock and is not available**: app ID 1611152 sits at
"trial access pending" with write scopes blocked. With it, all 19 pins are one script.

## The plan, ready to execute

Per pin, in one pass through its edit dialog:
1. **Board** → the matching new category board (Modest Skirts, Modest Tops & Blouses, …).
2. **Destination** → the matching lane on `themodestyhouse.com`. A product URL beats a lane
   URL, but the pins are outfit photographs rather than catalogue shots and the pieces cannot
   be identified from the image — only Tina can supply those.
3. **Title** → descriptive of what is in the photograph, and DIFFERENT on every pin. Nineteen
   pins sharing one title compete with each other in Pinterest search, which is part of why
   105.6k impressions convert to nothing.
4. **Description** → what the piece is, in plain words; hashtags kept at the end, not instead.

Order: smallest pin first, then re-read its 30-day impressions after a few minutes (Pinterest's
per-pin numbers lag) to prove a move+edit does not cost distribution — **before** touching the
11.9k and 3.7k pins, which carry the ranking.

## Notes / follow-ups
- **Do not delete "Clothing" until the 19 created pins are out of it.** This is the one
  irreversible action in the whole job.
- Board descriptions are all empty; `modest-house-26` has 14 written and ready.
- No copy was published. The titles and descriptions above are described as a rule, not
  written, because nothing has been through the dialog yet.


---

# Update 2026-09-13 — one pin fixed, and the cost of fixing one is now measured

## Pin 1 is done and live

`589549407517936239` — the smallest pin on the account, chosen deliberately as the
experiment (§10.11's rule: measure what a change does before applying it at scale).

```
was   title "Hijabi outfit" · hashtag-only description · NO link
now   title "Sheer lemon peplum blouse with light blue wide-leg trousers"
      a real description
      link https://themodestyhouse.com/modest-tops
           ?utm_source=pinterest&utm_medium=pin&utm_campaign=pin_destinations
```
The pin now renders a **"Naar website"** button. Destination verified `http=200`.

The UTM tags are the point as much as the link is: `utm_campaign=pin_destinations` means
**Pulse → Acquisition → Campaign will show whether a repaired pin actually sends anyone**,
per pin. Until that number moves, the whole "fix the pins" thesis is a hypothesis.

## The finding that changes the plan: editing the LINK wipes the pin's stats

Pinterest interrupts the save with a confirmation:

> **Opgelet!** Als je deze link bewerkt, gaan eventuele betrokkenheidsstatistieken verloren.
> *(Careful! If you edit this link, any engagement statistics will be lost.)*

**It is literal.** That pin showed `Impressies 66` before the save and `—` immediately after.

So repairing a pin in place costs whatever that pin has accumulated. Consequences:

| pin class | measured stats | decision |
|---|---|---|
| small (tens–hundreds of impressions) | nothing to protect | **edit in place**, the reset is free |
| the two winners — 11.9k imp / **363 saves**, 3.7k / **325 saves** | the account's ranking signal, and saves are what Pinterest ranks on | **do NOT edit — re-pin instead**: same image, new pin, on the category board, with the link. The old pin keeps its reach, the new one can earn. Additive rather than a trade |

This was caught only because the experiment ran on the 66-impression pin rather than on a
good one. Had the first edit been applied to the 11.9k pin, 363 saves would be gone and
unrecoverable.

**Still untested, and now explicitly flagged rather than assumed:** whether *moving* a pin
between boards resets stats the same way. An earlier version of this plan asserted that moving
is safe; after the link finding, neither session is willing to rely on it. If moving does
reset, the winners can never leave "Clothing" and **"Clothing" can never be deleted** — which
is a perfectly acceptable outcome, but it needs saying rather than discovering.

## Why the remaining 18 did not get done

The edit dialog is reachable but hostile to automation. Working sequence, for whoever picks
this up: **click `...` once (this only reveals the stats panel), then click `...` again** — the
second click opens "Pin bewerken" directly. Then `triple_click` each field before typing.

Failure rate is roughly one interaction in two. On pin `589549407518030762` (149 impressions,
1 pin click) the dialog was opened three times; on the first the modal dismissed itself mid-typing,
on the second a `cmd+a` in the description blanked the entire page. **Nothing was saved on
either attempt and the pin is verified unchanged** — but each failure costs ~10 calls and
leaves the browser in a state needing a fresh tab.

`modest-house-26`'s browser extension has disconnected entirely ("Browser extension is not
connected"), which in hindsight is what the earlier hangs were building toward. Playwright is
not a substitute: it starts with no cookies and cannot log into the account.

## The route that actually works

**The Pinterest API.** App ID 1611152 is at "trial access pending"; the token available today
carries `pins:read, boards:read, user_accounts:read, ads:read, catalogs:read` — **no write
scopes**, so it cannot even be tested. The moment trial access clears, all 19 pins are one
script, and the first thing to check is whether setting a link via the API triggers the same
stats reset the UI does. If it does not, the winners can be repaired safely too.

## Notes / follow-ups
- **Do not delete "Clothing".** Unchanged and now firmer: the winners may have to live there
  permanently.
- Watch `utm_campaign=pin_destinations` in Pulse over the next fortnight. One repaired pin
  sending even a handful of visits is the evidence that justifies chasing API access.
- Lane URLs were taken from the live sitemap rather than guessed, so a pin can never point at
  a 404: `/blazers-vests /cardigans-sweaters /jackets-coats /layering-basics /modest-abayas
  /modest-activewear /modest-dresses /modest-hijabs /modest-sets /modest-skirts
  /modest-summer-outfits /modest-swimwear /modest-tops /modest-trousers /new-in`.
