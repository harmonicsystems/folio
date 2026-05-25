# Folio

A constraint-engine and authoring tool for picture books and early-reader literature (ages 0–10). Restraint → creative flow. Anti-slop infrastructure.

## What we're building

Two products from one engine:

1. **Early-literacy readability engine** (`@harmonic-systems/early-literacy`) — a TypeScript package that analyzes manuscript text for developmental appropriateness across phonology, vocabulary, syntax, and prosody.
2. **Folio** — a syncing iPad/macOS authoring app for writer-illustrator teams, built on the engine.

## Thesis

The LLM does the boring legibility work in the background (constraint checking, dialogic prompt generation, phoneme inventory tracking). Humans do every creative act. Never generate manuscript text or illustrations on behalf of the author. The tool's job is to make logistics legible so creativity has room.

## Status

Pre-alpha. Building the engine first as a TypeScript monorepo package, with a CLI for validation against a canonical book corpus.

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

All metrics must cite their source. See `docs/linguistics/SOURCES.md`. Anchors: Beck/McKeown/Kucan (vocabulary tiers), Crowe & McLeod 2020 (phoneme acquisition norms), Whitehurst (dialogic reading), Vygotsky (ZPD), Krashen (i+1), Rayner (reading eye movement), Tomasello (joint attention), Smit et al. (Iowa-Nebraska articulation norms).

## Working principles

1. **Tests before implementation.** Use the corpus in `corpora/` as fixtures.
2. **Data is IP.** Phoneme inventory, word lists, vocabulary tiers — all versioned, cited, with provenance documented.
3. **Engine API is the contract.** Keep it stable; iterate the internals.
4. **No LLM generation of manuscript content.** LLM is allowed for: dialogic prompt suggestions, illustrator brief generation, refactoring help.
5. **Cite or omit.** Every linguistic claim in the codebase must trace to a citation in `SOURCES.md`, or be removed.

## First milestone

CLI that ingests a `.txt` manuscript and outputs a JSON `ReadabilityProfile`. Validated against 10 canonical books in `corpora/`.

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
