# "Apply for the seal" becomes "Sign your brand up"
**Date:** 2026-09-03 · **Status:** done

## Goal

Tina: *"i want to change apply for the seal to soething for sign your brand up"*.

## What changed

The phrase was live on three surfaces, and they had to move together — otherwise the
link a visitor clicks and the form they land on would name two different things:

| file | surface |
|---|---|
| `components/Footer.tsx` | the footer link under "The House" |
| `app/about/page.tsx` | the brass button beside "See the houses" |
| `lib/contactTopics.ts` | the Subject dropdown option — **and the email subject prefix** |

`lib/contact.test.ts` asserts that prefix and now expects `[Sign your brand up] Amina`.

**Only the label moved.** The topic `value` stays `'seal'`: it is what `?topic=seal`
deep-links to from both the footer and `/about`, and it is the key the inbox has been
filing these under since the form existed. Renaming the value would break both links
without failing a test or a typecheck.

Two comments that named the old CTA directly were updated with it
(`app/contact/page.tsx`, and the Footer note about the phrase wrapping to three lines at
390px). The narrative comments in `app/page.tsx` that QUOTE Tina saying "apply for the
seal ccan go" in August were left alone — they are history, not live references.

## Verification

`npm test` — 1100 passed, 0 failed. (The two `lib/edits.test.ts` failures logged on
2026-09-01 are gone; those hand-picks were re-picked in the meantime.)

On staging, in a real browser:

```
CSS loaded: rgb(250, 247, 241)
/about link(s) to ?topic=seal: ["Sign your brand up","Sign your brand up"]
footer has "Sign your brand up": true
footer still has "Apply for the seal": false
subject options: general: General enquiry | seal: Sign your brand up |
                 marketing: Marketing | brand: Suggest a house |
                 claim: Claim a house | press: Press | correction: Report a correction
preselected on /contact?topic=seal: seal
```

The "still has the old string: false" row is the control — a one-sided check for the new
string would pass even if the old one were still rendering somewhere beside it.

## Notes / follow-ups

- ~~**The Subject dropdown now has three options that read alike**~~ — **CLOSED the same
  day.** "Apply for the seal" was clearly distinct from "Submit a brand"; "Sign your brand
  up" was not, and a house wanting the seal could reasonably have picked either, landing in
  the inbox under two different subjects. Raised, and Tina chose to rename rather than
  merge, so **"Submit a brand" is now "Suggest a house"** — a shopper recommending a house
  she loves, as against `seal`, which is the house itself getting in touch. "house" rather
  than "brand" is the word the rest of the site already uses ("Claim a house", "See the
  houses"). Label only; `value` stays `'brand'`.

  The wording is mine, from the option Tina picked — she chose "rename" without naming it.
  One line in `lib/contactTopics.ts` if she wants different words.
