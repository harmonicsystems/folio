# Web Alpha

An Astro alpha for the early-literacy engine. Two surfaces:

- **`/`** — spread-first editor (primary). 16 spreads, each with two facing pages. Per-page composition (text-only / text-top / text-bottom / illustration-only) and per-page text. Rich text via Lexical with bold / italic / underline (Cmd+B/I/U, floating toolbar on selection). Grid view for overview, Book view for one-spread-at-a-time at the trim's open aspect ratio. Layout presets (Classic facing, Mirror, Text top, Full text) and body-font picker (Libre Caslon, Futura, Futura Bold, Atkinson Hyperlegible, Bricolage Grotesque). Sidebar with manuscript-level metrics, phonology (decodability, avg syllables/word, top syllable type), per-spread mini bars, reach words, warnings, and a Coming soon preview. Collapsible sidebar with a status-bar fallback for focused-writing mode. Reach words underline in-place via the CSS Custom Highlight API.
- **`/paste`** — paste-and-analyze (fallback). One textarea, one readability report. Drop in a manuscript (one spread per blank-line block) and see the profile. Ships with four sample loaders (board, Peter Rabbit, Owl & Pussycat, Aesop selection) so a first-time visitor can see the engine work without typing.

Both routes consume the engine via `analyze()` in the browser; no server, no network.

What the analysis surfaces:

- Word count against the age-band target (over/under styling)
- Sight-word coverage (Dolch + Fry)
- Type-token ratio and unique-word count
- Reach words grouped by the spread of first appearance (and underlined in context in the spread editor)
- Phonology — decodability score (Crowe & McLeod 2020 acquisition-age weighting), avg syllables per word, top syllable type
- Warnings with severity styling — manuscript-level (`WORD_COUNT_OVER`, `WORD_COUNT_UNDER`) and per-spread (`SPREAD_WORD_COUNT_HIGH`)

## Running locally

```
pnpm install
pnpm --filter @harmonic-systems/early-literacy build
pnpm --filter @harmonic-systems/folio-web dev
```

The web package imports the engine via `workspace:*`; the engine's `dist/` must exist before `astro dev` starts.

## Stack

- Astro 5 with `@astrojs/react` for the Lexical editor islands (`/` only — `/paste` stays framework-free)
- Lexical + `@lexical/react` — rich-text editor with caret-safe reach-word decoration per [docs/decisions/0002-spread-first-editing.md](../../docs/decisions/0002-spread-first-editing.md)
- `@harmonic-systems/early-literacy` as a workspace dependency; `analyze()` runs in the browser
- `src/types.ts` defines the web-side `WebManuscript` / `WebSpread` / `PageContent` / `PagePlacement` / `TrimSize` wrapper types and `toEngineManuscript()` — composition concerns stay here and never reach the engine (see [docs/decisions/0003-spread-native-engine-api.md](../../docs/decisions/0003-spread-native-engine-api.md))
- `src/components/PageEditor.tsx` — per-page Lexical editor as an Astro client island; one instance per page (32 total per 16-spread manuscript). Communicates with the surrounding Astro script via a `window.__pageEditors` handle registry and `page-text-change` / `page-editor-ready` CustomEvents.
- Plain CSS, no Tailwind — styling lives inline in `src/pages/*.astro` and matches the cream/taupe aesthetic used across Harmonic Systems sites
- No persistence, no auth, no network calls

## Deploy

GitHub Actions builds on push to `main` and publishes to GitHub Pages under `folio.harmonic-systems.org`. CNAME lives in `public/CNAME`.
