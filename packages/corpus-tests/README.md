# Corpus Tests

A regression gate for the `corpora/` fixtures. Reads every `<slug>.meta.json`, runs the engine against `<slug>.txt`, and asserts the constraints declared under `expected`.

Run:

```
pnpm --filter @harmonic-systems/folio-corpus-tests test
```

Or from the repo root: `pnpm test` runs it alongside the engine suite.

## Adding a fixture

Drop a `<slug>.txt` and a `<slug>.meta.json` into `corpora/`. The runner finds them automatically.

Constraint paths in the `expected` block resolve against the `ReadabilityProfile` returned by `analyze()`:

```json
{
  "expected": {
    "wordCount": { "min": 140, "max": 180 },
    "vocabulary.sightWordCoverage": { "min": 0.6, "max": 0.75 }
  }
}
```

Either `min` or `max` may be omitted. Constraints are advisory bounds — keep ranges loose enough to survive small data-table tweaks (sight-word lists, tier classifiers) without false positives.

## Why a separate package

The corpus is Track 2 territory; keeping the validator out of `packages/engine/` avoids stepping on the phonology work landing in parallel. The engine ships a smaller, hardcoded smoke test of its own; this package is the broad regression net.
