# Architectural Decision Records (ADRs)

This directory holds short markdown files documenting significant architectural decisions. Each file is named `NNNN-title.md` where NNNN is a 4-digit zero-padded number.

## When to write an ADR

Write one when you make a decision that:

- Has trade-offs you'd forget in 6 months
- Closes off other reasonable options
- Future contributors will want to understand the reasoning behind
- Touches the engine's public API

Don't write one for routine implementation choices.

## Template

```markdown
# NNNN: Title

## Status

Proposed | Accepted | Deprecated | Superseded by NNNN

## Context

What is the issue we're addressing? What are the forces at play?

## Decision

What did we decide?

## Consequences

What becomes easier or harder as a result? What are we accepting?

## Alternatives considered

What else did we look at? Why didn't we pick those?
```

## Existing ADRs

- 0001 — *reserved* for the TypeScript-over-Rust decision for the engine core (not yet written).
- [0002 — Spread-first editing](0002-spread-first-editing.md) — *accepted (2026-05-25)*
- [0003 — Spread-native engine API](0003-spread-native-engine-api.md) — *accepted (2026-05-25)*
- [0004 — Decodability: scope the claims, keep the formula](0004-decodability-construct-scoping.md) — *accepted (2026-06-26)*
- [0005 — Tabbed inspector (studio dashboard, slice 1)](0005-tabbed-inspector-slice-1.md) — *accepted (2026-07-11)*
- [0006 — Context bar + ⌘K command palette (slice 2)](0006-context-bar-command-palette.md) — *accepted (2026-07-11)*
- [0007 — Mode rail + Analyze mode + prefs v2 (slice 3)](0007-mode-rail-analyze-mode.md) — *accepted (2026-07-11)*
- [0008 — Phonology + Prosody modes (slice 4)](0008-phonology-prosody-modes.md) — *accepted (2026-07-11)*
- [0009 — Two-layer analysis (verdict vs. mirror) and generated demo fixtures](0009-two-layer-analysis-and-demo-fixtures.md) — *accepted (2026-07-11)*
- [0010 — One job per surface: digest inspector, canvas-local view toggle](0010-inspector-digest-consolidation.md) — *accepted (2026-07-12)*
- [0011 — Mirror readouts: meter shape + phoneme distribution](0011-mirror-readouts.md) — *accepted (2026-07-12)*
- [0012 — Read-aloud picture-book MVP](0012-read-aloud-picture-book-mvp.md) — *accepted (2026-07-12)*
- [0013 — Quiet studio reader reflection layer](0013-quiet-studio-reader.md) — *accepted (2026-07-12)*
- [0014 — Spread carousel editor and writer lenses](0014-spread-carousel-editor.md) — *accepted (2026-07-12)*
- [0015 — Templates, reading context, and example isolation](0015-templates-reading-context-and-examples.md) — *accepted (2026-07-12)*
- [0016 — Drafting-first book model: page map, presets, persistence, submission export](0016-drafting-first-book-model.md) — *accepted (2026-07-13)*
