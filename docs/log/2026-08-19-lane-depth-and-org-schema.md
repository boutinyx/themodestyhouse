# Lane depth pass (3 lanes) + Organization schema enrichment
**Date:** 2026-08-19 · **Status:** done

## Tier 2 item C — three lanes deepened, eleven left alone

`/modest-abayas` 152 → **340** words · `/modest-dresses` 138 → **306** · `/modest-hijabs`
139 → **302**. The other eleven lanes are **unchanged on purpose**: they carry 30% of
category search interest and act as the control. If the deepened three move and the rest do
not, length was the cause — which is the only cheap way to learn that. The
`lib/laneAnswers.test.ts` ceiling was raised 180 → 600 earlier today for exactly this.

### These three, because the data chose them
70% of category impressions and 66% of the catalogue:

| lane | impressions (365d) | products |
|---|---|---|
| `/modest-dresses` | 46 | 2,983 |
| `/modest-hijabs` | 16 | 5,088 |
| `/modest-abayas` | 11 | 5,213 |

### Measured before written, and it changed the copy
Every claim was checked against the live catalogue rather than recalled. Two corrections
resulted:

- **"nida" was dropped.** It reads as the canonical abaya fabric in general knowledge, and
  the earlier gap analysis named it — but it appears in only **21** abaya titles here.
  Written instead from what is actually stocked: satin 153, linen 121, chiffon 103, crepe 75.
- **Modal was added to hijabs.** It is the **second** most common hijab fabric in the range
  (806 titles, behind jersey's 1,415) and the original block did not mention it at all,
  while naming satin, silk and crinkle.

Also added: the abaya/kaftan/jilbab/bisht/khimar distinction (all five are real, distinct
things in this catalogue — kaftan 280 titles, jilbab 171, bisht 36); opacity and lining on
dresses, which is the question a photograph cannot answer; undercaps and instant hijabs,
together roughly a fifth of the hijab lane and previously referenced only in passing; and
per-fabric care.

Prices are described in relative terms ("under 100 in its own currency") rather than as a
converted figure — ADR-0002.

### Deliberately still missing
Each of the three needs one more paragraph: **how to tell a well-made piece from a cheap
one.** That is a judgement, it is the only part of these pages no competitor could write,
and it is Tina's (§10.18). A note in `lib/laneAnswers.ts` records that.

## Tier 3 item C — Organization schema
Every field added was reused from somewhere it is already published, never invented:
`description` from `app/layout.tsx`, `contactPoint` from `content/legal/terms.md` and
`/contact`, `addressCountry: 'NL'` from `content/legal/privacy.md`'s "based in the
Netherlands".

**`sameAs` is still absent, and that is the point.** It is the field that actually drives
entity resolution, and it cannot be filled honestly: `components/Footer.tsx` links to bare
`pinterest.com` / `instagram.com` / `tiktok.com` because there are no profiles. Pointing
`sameAs` at a platform homepage asserts an identity that does not exist. `alternateName`
(invented copy) and `founder` (a documented privacy choice) are absent for the same class
of reason. The real unlock is creating the accounts — a business decision, not an SEO one.

## Verification
```
npx tsc --noEmit        exit 0
npx vitest run          713/713
npm run build           40/40 static
audit:mobile            0/9 overflow, a11y 0, stacked 0, aspect 0 — both engines
```
Live against `next start`: all three lanes render their longer block with an `<h2>`;
Organization emits description + address + contactPoint and **no `sameAs`**.

## Notes
- Two bulk-edit slips today, both caught immediately and neither shipped: a dropped comma
  in `data/brands.ts` (caught by `tsc`), and a regex here that assumed single-quoted string
  literals when `laneAnswers` bodies containing an apostrophe use double quotes. Both fixed
  by looking at the actual file rather than assuming its shape.
