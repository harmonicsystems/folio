# Folio

A constraint-engine and authoring tool for picture books and early-reader literature (ages 0–10).

Restraint → creative flow. Anti-slop infrastructure for children's literature.

## What's here

This monorepo holds two related products that share one engine:

1. **`@harmonic-systems/early-literacy`** — a TypeScript package that analyzes manuscript text for developmental appropriateness across phonology, vocabulary, syntax, and prosody. See `packages/engine/`.

2. **Folio** — a future syncing iPad/macOS authoring app for writer-illustrator teams, built on the engine. Not in this repo yet.

In between, there's a CLI (`packages/cli/`) and a web alpha (`packages/web/`) — the engine's first usable interfaces. The web alpha runs `analyze()` in the browser and ships two surfaces: a paste-and-analyze page at `/` and a spread-first editor at `/editor` (16 tiles, per-spread analysis, live updates). Run with `pnpm --filter @harmonic-systems/folio-web dev`.

## Status

Pre-alpha. The engine and CLI are the first deliverables.

## Where to start

- `CLAUDE.md` — persistent brief for Claude Code sessions
- `ARCHITECTURE.md` — design rationale and module structure
- `docs/decisions/` — architectural decision records (spread editor: ADRs 0002 + 0003)
- `docs/linguistics/SOURCES.md` — the research base behind every metric
- `corpora/README.md` — how to add test fixtures (canonical books)

## Thesis

The LLM does the boring legibility work in the background. Humans do every creative act. We never generate manuscript text or illustrations on behalf of an author. The tool's job is to make logistics legible so creativity has room.

## License

TBD.

## Author

Harmonic Systems · harmonic-systems.org
