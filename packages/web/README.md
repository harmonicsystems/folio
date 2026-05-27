# Web Alpha

An Astro alpha for the early-literacy engine. Two surfaces:

- **`/`** — paste-and-analyze. One textarea, one readability report. Drop in a manuscript (one spread per blank-line block) and see the profile.
- **`/editor`** — spread-first editor. 16 tiles, per-spread placement (text-left / right / top / bottom / wordless), per-tile word count vs. the engine's `wordCountCeiling` heuristic, sidebar with manuscript totals, per-spread breakdown, reach words, and merged warnings. Live debounced analysis (250 ms).

Both routes consume the engine via `analyze()` in the browser; no server, no network.

What the analysis surfaces:

- Word count against the age-band target (over/under styling)
- Sight-word coverage (Dolch + Fry)
- Type-token ratio and unique-word count
- Reach words grouped by the spread of first appearance
- Warnings with severity styling — manuscript-level (`WORD_COUNT_OVER`, `WORD_COUNT_UNDER`) and per-spread (`SPREAD_WORD_COUNT_HIGH`)

Four sample loaders ship inline on `/` (board, Peter Rabbit, Owl & Pussycat, Aesop selection) so a first-time visitor can see the engine work without typing. The spread editor currently ships empty — type your own content.

## Running locally

```
pnpm install
pnpm --filter @harmonic-systems/early-literacy build
pnpm --filter @harmonic-systems/folio-web dev
```

The web package imports the engine via `workspace:*`; the engine's `dist/` must exist before `astro dev` starts.

## Stack

- Astro 5, no client framework yet — Slice 2c of Track 3 will add React + Lexical for caret-safe reach-word decoration (see [docs/decisions/0002-spread-first-editing.md](../../docs/decisions/0002-spread-first-editing.md))
- `@harmonic-systems/early-literacy` as a workspace dependency; `analyze()` runs in the browser
- `src/types.ts` defines the web-side `WebManuscript` / `WebSpread` / `TrimSize` / `SpreadPlacement` wrapper types and `toEngineManuscript()` — composition concerns stay here and never reach the engine (see [docs/decisions/0003-spread-native-engine-api.md](../../docs/decisions/0003-spread-native-engine-api.md))
- Plain CSS, no Tailwind — styling lives inline in `src/pages/*.astro` and matches the cream/taupe aesthetic used across Harmonic Systems sites
- No persistence, no auth, no network calls

## Deploy

GitHub Actions builds on push to `main` and publishes to GitHub Pages under `folio.harmonic-systems.org`. CNAME lives in `public/CNAME`.
