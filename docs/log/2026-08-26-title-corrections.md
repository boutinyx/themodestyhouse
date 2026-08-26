# Seven title-cache corrections, and a sweep for what else is not English

**Date:** 2026-08-26 · **Status:** done

## Goal
Close the two follow-ups left open by `docs/log/2026-08-26-double-translation-bug.md`
— `Elenora Hijab` publishing as `Elena Hijab`, and the Beyza/İpekstil rows keeping the
Turkish `Kloş`/`Cloş`.

## What changed
Seven one-line edits to `data/title-translations.json`, each keyed by the RAW feed
title (the only key `lib/publishTitle.ts` looks up):

| raw feed title | was | now |
|---|---|---|
| Elenora Hijab | Elena Hijab | **Elenora Hijab** |
| Aynil Kloş Ferace LACİVERT | Aynil Kloş Abaya DARK BLUE | **Aynil Flared Abaya NAVY BLUE** |
| Aynil Kloş Ferace FÜME | Aynil Kloş Abaya FUME | **Aynil Flared Abaya SMOKED** |
| Aynil Kloş Ferace Antrasit | Aynil Kloş Abaya Anthracite | **Aynil Flared Abaya Anthracite** |
| Aynil Kloş Ferace KIZILCIK | Aynil Cloş Abaya CRANBERRY | **Aynil Flared Abaya CRANBERRY** |
| 9652 İKİLİ Takim Eteklİ KloŞ | 9652 DOUBLE SUIT WITH SKIRT **FLOOR** | **9652 DOUBLE SUIT WITH FLARED SKIRT** |
| Eliz Ferace | Eliz Ferace | **Eliz Abaya** |

None of these is a new naming choice — every one applies a rendering the cache already
uses elsewhere: `Kloş -> Flared` in 40+ entries (`Kloş Etek SİYAH -> Flared Skirt
BLACK`), `Ferace -> Abaya` in **245**, `Lacivert -> Navy Blue`, `Füme -> Smoked`,
`Antrasit -> Anthracite`. `Elenora` is a proper name Google translated as if it were a
word.

The last two were found by a sweep, not named in the request: `9652 ... SKIRT FLOOR`
was the same `Kloş` gap rendered as nonsense, and `Eliz Ferace` came back from Google
unchanged so it had cached as an identity entry.

**Only two of the seven are visible today.** `aurora-abaya:15324727279946`
(`Elenora Hijab`) and `beyza:10546913476792` (`Eliz Abaya`) are published; the five
İpekstil/Beyza rows are unpublished (out of stock or delisted), so those corrections
take effect if they return.

## Verification
```
aurora-abaya:15324727279946 -> "Elenora Hijab"  (was 'Elena Hijab')
beyza:10546913476792        -> "Eliz Abaya"     (was 'Eliz Ferace')

published titles still containing Kloş / Cloş / Ferace: 0
published titles still reading "Elena Hijab":           0
```
`npm test` — 52 files, **856 tests pass**, including the chain guard added earlier
today (`chains after edit: 0`, asserted by the edit script before writing and by the
test after).

## Sweep: what is still not English
Over all **4,358 published rows in non-English brands**. Two findings, both
**pre-existing first-pass translation gaps, not caused by the double-translation bug**,
and both left alone because they are product naming rather than a mechanical fix:

- **`Çağla` — 22 published rows** (Nihan), 40 cache keys. A Turkish colour, the shade of
  an unripe almond. Google leaves it untranslated every time. Rendering it needs a
  decision — "Almond Green" and "Green Almond" are both used in the trade — so it is
  Tina's call, not mine.
- **6 Beyza rows with a leftover Turkish word**: `Söğüt Aller Pat Detailed Abaya 3657`
  (söğüt = willow), `9286 Abaya Çingirak`, `9160-3829 Manto ExclusİVe` (manto = coat),
  `9106 KAP GÜLLÜ` (kap = cover/coat, güllü = rosy), `3746 Samyelİ Abaya`, `İDİL Abaya`,
  plus `Pırıltı Velvet and Fabric Mixed Tunic - Black` (Nihan; pırıltı = sparkle).
  Several are proper names and should stay; the rest are one-line cache edits.

Everything else is clean: no other source-language garment word reaches a published
title.

## Notes / follow-ups
Nothing outstanding in the code. The two lists above are waiting on Tina's decision.

## Staging verification (added after deploy)
`/modest-hijabs`, `/modest-abayas`, `/directory` from staging and from production
(`main`, uncorrected) as the negative control.

| string | production | staging |
|---|---|---|
| `Elena hijab` (the doubly-translated value main still serves) | PRESENT | absent |
| `Elenora Hijab` | absent | **PRESENT** |
| `Eliz Ferace` | PRESENT | absent |
| `Eliz Abaya` | absent | **PRESENT** |

Note production reads `Elena hijab`, lower-case h — that is the second-pass value from
the chain `Elenora Hijab -> Elena Hijab -> Elena hijab`, so this one row shows both
bugs fixed at once.

## Status
On `staging` (`50c3dd7`), verified. Not merged to `main`.
