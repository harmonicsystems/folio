# Folio

A constraint-engine and authoring tool for picture books and early-reader literature (ages 0–10). Restraint → creative flow. Anti-slop infrastructure.

## What we're building

Two products from one engine:

1. **Early-literacy readability engine** (`@harmonic-systems/early-literacy`) — a TypeScript package that analyzes manuscript text for developmental appropriateness across phonology, vocabulary, syntax, and prosody.
2. **Folio** — a syncing iPad/macOS authoring app for writer-illustrator teams, built on the engine.

## Thesis

The LLM does the boring legibility work in the background (constraint checking, dialogic prompt generation, phoneme inventory tracking). Humans do every creative act. Never generate manuscript text or illustrations on behalf of the author. The tool's job is to make logistics legible so creativity has room.

## Status

Public alpha live at `folio.harmonic-systems.org`. Engine Milestones 0–5 complete (vocabulary + sight words, phonology + decodability, web alpha, prosody, syntax). Web alpha ships three routes: `/` spread-first editor with Lexical rich text + in-line reach-word / phoneme / find highlighting + persistence + .txt/.md/PDF export, `/paste` analyze-only fallback, `/about` landing page.

Next phase is **user signal**, not the next feature. See [`docs/AGENT_HANDOFF.md`](docs/AGENT_HANDOFF.md) for the full picture and the open decisions ladder.

**This branch (`explore/drafting-first`)** additionally carries a purely-for-creation drafting surface at `/draft` — engine-free by rule (nothing under `packages/web/src/drafting/` may import the engine, even type-only). See [`docs/drafting-first/PLAN.md`](docs/drafting-first/PLAN.md), [`docs/drafting-first/SUMMARY.md`](docs/drafting-first/SUMMARY.md), and ADR 0016.

## Tech stack

- TypeScript (engine, CLI, web alpha)
- pnpm workspaces
- Vitest for tests
- Astro for the eventual web alpha
- SwiftUI + SwiftData + CloudKit for the eventual native app (separate repo or future package; engine ports to Swift later)
- Node 20 LTS target

## Core abstractions

- `Manuscript` — text + spread assignments + age band target
- `Spread` — text content for one of 16 picture book spreads
- `ReadabilityProfile` — per-manuscript output: lexile estimate, F&P level, phoneme inventory, vocabulary tier breakdown, repetition density, reach words flagged
- `AgeBand` — `board`, `early-picture`, `picture`, `early-reader`, `chapter`

See `packages/engine/src/types.ts` for current definitions.

## Linguistic grounding

All metrics must cite their source. See `docs/linguistics/SOURCES.md`. Anchors: Beck/McKeown/Kucan (vocabulary tiers), Crowe & McLeod 2020 (phoneme acquisition norms), Whitehurst (dialogic reading), Vygotsky (ZPD), Krashen (i+1), Rayner (reading eye movement), Tomasello (joint attention), Smit et al. (Iowa-Nebraska articulation norms), Hunt 1965 (finite-clause index), Quirk et al. 1985 (sentence types), Nunberg 1990 (orthographic sentence).

## Working principles

1. **Tests before implementation.** Use the corpus in `corpora/` as fixtures.
2. **Data is IP.** Phoneme inventory, word lists, vocabulary tiers — all versioned, cited, with provenance documented.
3. **Engine API is the contract.** Keep it stable; iterate the internals.
4. **No LLM generation of manuscript content.** LLM is allowed for: dialogic prompt suggestions, illustrator brief generation, refactoring help.
5. **Cite or omit.** Every linguistic claim in the codebase must trace to a citation in `SOURCES.md`, or be removed.

## Milestones shipped

- M0 Scaffolding · M1 Word-level engine (Tier-1 classification shipped 2026-06-15: Dale–Chall familiar-word proxy ∪ Dolch/Fry; `tier1Coverage`/`tier2Words` populated, reach reason `tier-2`) · M2 Phonology · M3 Web alpha · M4 Prosody (meter + rhyme detection, all four canonical feet, AABB / ABAB schemes via CMU dict stress markers; M4.1: per-line scoring + anacrusis handling, Attridge 1982) · M5 Syntax (orthographic sentence segmentation with offsets, Hunt-1965 lower-bound clause estimation, four-way sentence typing — structural metrics only, no developmental thresholds).
- 195 engine unit tests + 230 corpus regression tests (10 fixtures, two per age band), all green.
- Auto-deploy on every push to `main` via GitHub Actions → Pages.

## Conventions

- ESM throughout. Strict TypeScript. No `any` without a `// TODO: type` comment explaining why.
- Module re-exports use `.js` extensions (ESM requirement).
- Tests colocated with code conceptually but housed in `tests/` per package.
- ADRs (architectural decision records) for any non-obvious choice — see `docs/decisions/`.

## What you (Claude Code) should not do without asking

- Add a new top-level dependency
- Change the public API of a published package
- Add a linguistic claim or norm without an accompanying entry in `SOURCES.md`
- Generate manuscript content or illustrations
- Change the engine's behavior to pass a test (change the test or the input instead)
