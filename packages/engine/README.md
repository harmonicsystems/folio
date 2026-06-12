# @harmonic-systems/early-literacy

Developmental linguistic analysis for children's literature (ages 0–10).

## Status

Public alpha. Milestones 0–5 shipped (vocabulary + sight words, phonology + decodability, web alpha, prosody, syntax). Vocabulary tier classification (Beck/McKeown/Kucan) is gated on Tier 1 list wiring — the sourcing decision landed 2026-06-10 (Dale-Chall 3000; see `../../docs/AGENT_HANDOFF.md`). 183 unit tests + 114 corpus regression tests, all green.

## Modules

- `readability/` — top-level orchestration; emits a complete `ReadabilityProfile`
- `vocabulary/` — tokenizer, sight word coverage (Dolch + Fry), reach-word detection, TTR. Beck/McKeown/Kucan tiers are stubbed pending sourcing
- `phonology/` — CMU dict (curated ~320-word subset + grapheme heuristic fallback), syllabification, phoneme inventory with first-spread attribution, acquisition-age weighting (Crowe & McLeod 2020), decodability scoring, `getWordPhonemes` (IPA per word), `getGuessedWords` (OOV integrity surface), `isInCmuDict` (dict-hit primitive)
- `syntax/` — orthographic sentence segmentation with source offsets (`segmentSentences`), Hunt-1965 lower-bound clause estimation (`countClauses`), four-way sentence-type classification (`classifySentence`), population sentence-length stdev. Structural metrics only — no developmental thresholds
- `prosody/` — binary stress sequence from CMU markers, dominant meter detection (iambic / trochaic / anapestic / dactylic / mixed), rhyme scheme extraction with cot-caught vowel normalization

## Linguistic grounding

See `../../docs/linguistics/SOURCES.md` for the full citation list. Every metric in this package traces to a published source.

## Development

```bash
pnpm install
pnpm --filter @harmonic-systems/early-literacy test
pnpm --filter @harmonic-systems/early-literacy build
```

## API sketch

```typescript
import { analyze } from '@harmonic-systems/early-literacy';

const profile = analyze({
  ageBand: 'picture',
  spreads: [
    { index: 1, text: 'In the great green room' },
    { index: 2, text: 'There was a telephone' },
    // ...
  ],
});

console.log(profile.vocabulary.tier2Words);
console.log(profile.phonology.decodabilityScore);
console.log(profile.reachWords);
```
