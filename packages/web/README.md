# Web Alpha

A single-page Astro alpha for the early-literacy engine. Paste a manuscript, pick an age band, see a readability profile in the browser.

What it surfaces:

- Word count against the age-band target (over/under styling)
- Sight-word coverage (Dolch + Fry)
- Type-token ratio and unique-word count
- Warnings with severity styling
- Reach words grouped by spread of first appearance

Two sample loaders ship inline (the synthetic board-book and a Peter Rabbit excerpt) so a first-time visitor can see the engine work without typing.

## Running locally

```
pnpm install
pnpm --filter @harmonic-systems/early-literacy build
pnpm --filter @harmonic-systems/folio-web dev
```

The web package imports the engine via `workspace:*`; the engine's `dist/` must exist before `astro dev` starts.

## Stack

- Astro 5, no client framework
- `@harmonic-systems/early-literacy` as a workspace dependency; `analyze()` runs in the browser
- Plain CSS, no Tailwind — the styling lives inline in `src/pages/index.astro` and matches the cream/taupe aesthetic used across Harmonic Systems sites
- No persistence, no auth, no network calls

## Deploy

GitHub Actions builds on push to `main` and publishes to GitHub Pages under `folio.harmonic-systems.org`. CNAME lives in `public/CNAME`.
