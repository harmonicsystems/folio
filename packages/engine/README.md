# @harmonic-systems/early-literacy

Developmental linguistic analysis for children's literature (ages 0–10).

## Status

Pre-alpha. API surfaces are defined in `src/types.ts`; implementations are in progress. See `../../ARCHITECTURE.md` for the full roadmap.

## Modules

- `readability/` — top-level orchestration
- `vocabulary/` — Beck/McKeown/Kucan tiers, sight word coverage (Dolch/Fry)
- `phonology/` — phoneme inventory, syllabification, decodability
- `prosody/` — stress patterns, meter

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
