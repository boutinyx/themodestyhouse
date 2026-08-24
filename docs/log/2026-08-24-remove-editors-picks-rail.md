# Removed the "Chosen by hand" editor's-picks rail from the homepage
**Date:** 2026-08-24 · **Status:** done

## Goal
Tina: *"this block in homepage is going to go"* — the homepage section headed
**"Chosen by hand."** with the horizontal rail of "Editor's pick" cards and the
**All products** link to `/directory`.

## What changed
`app/page.tsx` only. Nothing else was touched.

- Removed the whole `EDITOR'S PICKS` `<section>` (the heading, both responsive
  copies of the "All products" `Link`, and `<EditorsRail picks={editorsPicks} />`).
  A comment block stands where it was, recording what it was and why it went —
  the same convention the POPULAR ITEMS section above it uses.
- Removed the now-dead `editorsPicks` derivation and its `seenBrand` `Set`. It was
  a `getProducts()` pass filtered to in-stock, non-specialty
  `dress|abaya|skirt|top|set`, deduped to one product per brand, sliced to 12 —
  i.e. a slice of the catalogue, not a hand-curated list, despite the heading.
- Dropped the two imports that had no other caller in the file:
  `EditorsRail` and `isSpecialty`.
- `ArrowRight` and `getProducts` STAY — both still used (the editorial section's
  "All stories" links, and `productById` for `PopularShowcase`).

**`components/EditorsRail.tsx` is deliberately kept.**
`app/product/[brandSlug]/[shopifyId]/page.tsx:168` still renders it as the
related-items rail with `badgeLabel={null}`. Deleting the component would have
broken that page.

Side effect worth noting: this removes the homepage's **second** `getProducts()`
call. Per CLAUDE.md §8 that function is uncached and re-reads/parses ~5.6 MB per
call, so the home render now does one fewer full parse.

## Verification
```
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
TSC_EXIT=0

$ npx eslint app/page.tsx
LINT_EXIT=0

$ npm test
 Test Files  45 passed (45)
      Tests  734 passed (734)
```

Rendered homepage off the running dev server (`:3000`), grepped for the strings
the block was the only source of:

```
$ curl -s http://localhost:3000/ > home.html   # 358,447 bytes
Editor&#x27;s pick     0     <- the card badge, gone
All products           0     <- both responsive Links, gone
Popular items          2     <- section above it, still there
By category            2     <- section below it, still there
```

`Chosen by` still greps 2 — those are **not** the removed heading. Both are inside
`components/VerifiedSpotlight.tsx`'s raw `<style>` block, whose CSS comment happens
to quote the string ("Measured: this heading at 16, \"By category\" and \"Chosen by
hand\" both at 32"), and a raw `<style>` ships its comments to the client. Confirmed
by dumping the surrounding 280 characters.

Product page still renders its related rail (the component's other caller):

```
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/product/niswa/10217348399402
200
```

**Not run:** `npm run build`. Another session has `next dev` live on :3000 and a
production build would overwrite the shared `.next` underneath it — CLAUDE.md
§10.28 rule 4. `tsc` + eslint + 734 tests + a real SSR render of both affected
routes cover this change; it is a deletion of JSX and two imports, with no new
code paths.

## Notes / follow-ups
- The `VerifiedSpotlight` style-comment leak above is harmless but is a live
  example of §10.27's warning about that file: everything inside that template
  literal, comments included, is shipped bytes.
- Nothing else linked to `/directory` from this position on the homepage. It is
  still reachable from the header nav and the footer, so no route was orphaned.
