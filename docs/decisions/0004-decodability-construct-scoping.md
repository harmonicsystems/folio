# ADR 0004 — Decodability: scope the claims, keep the formula

Status: Accepted 2026-06-26
Deciders: David Nyman (direction), diagnosis by multi-agent corpus analysis

## Context

`phonology.decodabilityScore` (0.7 × mean phoneme ease + 0.3 × mean
syllable ease) had a long-standing open question: across the corpus it is
nearly flat (0.831–0.883 over all 10 fixtures) with an apparent inversion —
the structurally simplest texts do not score highest. ARCHITECTURE.md
previously guessed the cause was the syllable-ease table under-counting
complex shapes. With the corpus doubled to two fixtures per band, we ran a
full diagnosis (four independent analysis lenses + adversarial synthesis;
scripts reproduced the shipped engine's scores to 4 decimals before any
variant was trusted).

## What the diagnosis established

1. **The dominant mechanism is DH-inside-sight-words, not syllable
   weights.** "the/that/this/they/there" are built on DH — the
   latest-rated phoneme in the inventory (Crowe & McLeod age 6.5 → ease
   0.30). In **all 10 fixtures, 100% of DH occurrences sit inside
   Dolch/Fry sight words.** The two anomalously low scorers are exactly
   the highest-DH texts (house-that-jack-built 12.9% of phoneme tokens,
   synthetic board book 10.1%). Counterfactually neutralizing DH alone
   flips the corpus minimum to the corpus maximum. High-repetition
   sight-word text — the register written for the youngest readers — is
   being scored as if children sound out words they are taught to
   recognize whole. (DH share vs. score: Pearson −0.88.)
2. **Per-position averaging normalizes word length away.** Longer literary
   words average *easier* per phoneme (more vowels, which all sit at ease
   1.0 pending a vowel-norm citation; more open syllables): "curiosity"
   out-scores "cat". Meanwhile avgSyllablesPerWord tracks age band at
   r ≈ +0.89 — the strongest band signal in the neighborhood — and the
   formula discards it by construction.
3. **A construct gap:** the acquisition ages are speech-**production**
   norms (90% articulation criterion), used as a proxy for **decoding**
   difficulty. A child sounding out "thin" is not blocked by inability to
   articulate /θ/. The proxy is defensible but was under-disclosed.
4. **The obvious fix is gated by data coverage.** Scoring only
   non-sight-word tokens (the honest encoding of "sounding words out")
   would today compute the score almost entirely from grapheme-heuristic
   guesses: the vendored CMU subset nearly coincides with the sight-word
   lists, so non-sight tokens are ~97–100% guessed per fixture — with
   demonstrably wrong guesses ("alice" → AE1 L AY0 K). Shipping that
   variant now would trade a flat-but-real number for a well-shaped
   number computed from guesses, violating the visible-guess integrity
   principle.
5. **Cross-band monotonicity is the wrong calibration target.** Board,
   early-picture, and picture books are adult-read-aloud — the child
   decodes nothing (the project's own anchors, Whitehurst and Tomasello,
   are shared-reading constructs). Decoding load peaks in the
   early-reader band and declines after. Tuning the formula to make
   corpus fixtures sort by band would be exactly the
   "change the engine to pass the test" failure mode the project forbids.

## Decision

**Keep the formula. Scope the claims.** Specifically:

- guide.astro, types.ts, and the phonology module docstring now state:
  the score is most meaningful when the child is the reader (early-reader
  band); read-aloud bands should use the phoneme inventory; sight words
  are counted as decoding load (documented error mode); word length is
  not a factor; the acquisition ages are production norms used as a
  decoding proxy.
- The uncited "structured-literacy curricula" justification for the
  syllable table is reworded as an explicit engine convention
  (cite-or-omit).
- The `mrs`/`mr` grapheme-fallback bug found in passing (vowel-less
  M-R-S pronunciation, 0 syllables) is fixed with real CMU entries.

## Consequences

- Zero engine-behavior change from this ADR except the mr/mrs dictionary
  entries (corpus bounds re-checked deliberately where affected).
- The **next real step is CMU dict expansion** (~2k children's-book
  words, versioned data IP): it unblocks the sight-word-excluded variant
  (V1/V4 in the diagnosis), which is the recorded candidate formula
  change. Any such change re-derives all 10 corpus decodability bounds
  and updates every claim surface.
- **Destination construct (recorded, not scheduled):** a true
  decodable-text metric in the structured-literacy sense —
  percent-decodable given a taught grapheme→phoneme scope-and-sequence,
  with a sight-word allowance. Different construct; needs its own data
  asset and ADR. The diagnosis verified the current metric can invert
  against it (irregular "could" out-scores regular "crow").

## Rejected alternatives

- **Reweighting (e.g. 0.5/0.5):** measured as a wash — the spread
  *shrinks*; the problem is the phoneme term's DH artifact, not weights.
- **Length-aware variant now:** best standalone correlation gain, but
  leaves the DH artifact at the corpus floor and would be motivated by
  band-order correlation — the target this ADR rejects.
- **Sight-word exclusion now:** right construct, wrong moment — gated on
  dictionary coverage (see Consequences).
