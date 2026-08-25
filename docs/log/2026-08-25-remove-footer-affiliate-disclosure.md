# Removed the site-wide affiliate disclosure paragraph from the footer
**Date:** 2026-08-25 · **Status:** done · **Has a live legal caveat — read "Cost"**

## Goal
Tina: *"its still too long just get rid of this text"*, quoting the whole disclosure
paragraph including its "Full disclosure" link. It was four lines of 12px small print
sitting between the footer columns and the copyright row.

## What changed
**`components/Footer.tsx`** — the disclosure block is gone: the `maxWidth: 720`
paragraph, the `/terms` "Full disclosure" link inside it, and the wrapper that carried
the hairline above it. The copyright row below already had its own `borderTop`, so what
is left is one clean rule rather than an empty one.

`Link` is still imported and still used three times elsewhere in the file, so nothing
else needed touching. `/privacy` and `/terms` both keep their own links in the
copyright row.

A comment stands where the block was, recording what was removed, why, and the
condition under which it has to come back.

## Cost — this one is not cosmetic
The comment this replaced read *"Must stay site-wide and visible without interaction —
it is the disclosure a regulator looks for first"*, and CLAUDE.md §11 P0-D tracks
affiliate disclosure as a launch item.

Disclosure still exists on **/privacy**, **/terms** and **FAQ Q10**. What is gone is the
site-wide, no-interaction-required one — which is the form the FTC's "clear and
conspicuous" guidance actually asks for, since it wants the disclosure near the
affiliate links rather than on a policy page a visitor has to go find.

**Materially this is defensible only while Skimlinks stays off.**
`NEXT_PUBLIC_SKIMLINKS_ID` is unset and the monetisation is still a stub (§11 P0-E), so
no link on the site currently earns anything and there is nothing yet to disclose. The
moment it is switched on, a one-line version has to come back here. That is the same
condition the cookie-consent gap is already parked behind in P0-D, and it is now two
things gated on the same switch rather than one.

Raised with Tina in the reply, not buried here.

## Verification
`npx tsc --noEmit` clean · `eslint components/Footer.tsx` clean · `npm test` 781 passed.

On staging, after polling the live HTML until the string was gone (§10.23 — the boring
explanation first: the first two minutes of polling were simply the deploy still
building):

```
chromium-phone   {"footerHeight":1035,"hasDisclosureParagraph":false,
                  "hasFullDisclosureLink":false,"termsLinkStillThere":true,
                  "privacyLinkStillThere":true,"lastLines":["·","PRIVACY","·","TERMS"]}
webkit-phone     {... identical ...}
chromium-desktop {"footerHeight":539, ... identical flags ...}
```

`termsLinkStillThere` / `privacyLinkStillThere` are asserted deliberately: the removed
paragraph contained a `/terms` link, and the check that matters is not "the text is
gone" but "removing it did not take the policy links with it". Both survive in the
copyright row. Desktop screenshot confirms a single hairline above the copyright row,
no empty rule where the block was.

## Notes / follow-ups
- **Bring back a one-line disclosure the moment `NEXT_PUBLIC_SKIMLINKS_ID` is set.**
  Something on the order of "Some links are affiliate links — we may earn a commission."
  next to the copyright, not a paragraph. Written down here and in the file so it is not
  remembered only in a conversation.
