# 0003: Spread-native engine API

## Status

Proposed. Awaiting ratification.

## Context

The spread-first editor decided in [0002-spread-first-editing.md](0002-spread-first-editing.md) needs the engine to answer three questions it currently doesn't:

1. **Where does composition metadata live?** The editor needs to track per-spread placement (`text-left`, `text-right`, `wordless`, etc.) and the manuscript's `TrimSize` (e.g., 8×10 portrait, 10×8 landscape). Does that data live on the engine's `Manuscript` and `Spread` types, or on a web-side wrapper?
2. **Who computes per-spread profiles?** The sidebar needs to show word count, sight-word coverage, reach words, and warnings *per spread*, not just for the whole manuscript. Does `analyze()` return `perSpread: SpreadProfile[]`, or does the web layer derive per-spread numbers by re-filtering a manuscript-level profile?
3. **Are per-spread word-count targets norms or heuristics?** The sidebar wants a green/yellow/red signal on each spread's word count. Is "this spread is too long for a board book" a cited developmental claim or a UI convenience?

These three decisions shape the engine's public surface, so they need an ADR before code lands. The current engine types in [packages/engine/src/types.ts](../../packages/engine/src/types.ts) — `Manuscript`, `Spread`, `ReadabilityProfile` — would change as a result.

The fourth open question from [docs/AGENT_HANDOFF.md](../AGENT_HANDOFF.md) (editor library) is covered in [0002](0002-spread-first-editing.md) — this ADR is engine-only.

## Decision

### Q1 — Composition metadata lives on a web-side wrapper, not on engine types.

The engine's `Manuscript` and `Spread` stay as they are: text content, age band, spread index, optional notes. `TrimSize`, `SpreadPlacement`, and any future composition metadata (gutter handling, bleed, illustration brief) live in a `WebManuscript` wrapper type in `packages/web/`.

```ts
// packages/web/src/types.ts (new)
import type { Manuscript, Spread } from '@harmonic-systems/early-literacy';

export type SpreadPlacement = 'text-left' | 'text-right' | 'text-top' | 'text-bottom' | 'wordless';
export type TrimSize = { widthIn: number; heightIn: number; orientation: 'portrait' | 'landscape' };

export interface WebSpread extends Spread {
  placement: SpreadPlacement;
  illustrationBrief?: string;
}

export interface WebManuscript extends Manuscript {
  trimSize: TrimSize;
  spreads: WebSpread[];
}
```

The web layer strips composition fields before calling `analyze(manuscript)`. The engine never sees them.

### Q2 — `analyze()` returns `perSpread: SpreadProfile[]` directly.

`ReadabilityProfile` gains a `perSpread: SpreadProfile[]` field, indexed parallel to `Manuscript.spreads`. The engine internally walks per-spread anyway (spread attribution for first-occurrence reach words, phoneme inventory by spread) — exposing those numbers is cheaper than asking every consumer to re-derive them.

```ts
// packages/engine/src/types.ts (extension)
export interface SpreadProfile {
  index: number;
  wordCount: number;
  /** Heuristic ceiling for this spread given the manuscript's age band. */
  wordCountCeiling: number;
  sightWordCoverage: number;
  reachWords: ReachWord[];
  warnings: Warning[];
}

export interface ReadabilityProfile {
  // ... existing fields ...
  perSpread: SpreadProfile[];
}
```

No new `analyze()` overload — the existing call returns the richer profile. Consumers that don't care about per-spread data ignore the field.

### Q3 — Per-spread word-count targets are **heuristics**, marked as such in the type.

Picture books distribute words unevenly by design (a wordless climax spread, a dense exposition spread). There is no developmentally cited "max words per spread" the way there is "max words per manuscript at this age band" — the manuscript total is the cited number; the per-spread breakdown is an even-distribution heuristic for UI signal.

The heuristic is `wordCountCeiling = ceil(manuscriptWordCountTarget.max / nonWordlessSpreadCount * 1.5)` — the `1.5` is slack for intentional density variation. The field name (`Ceiling`, not `Target`) signals that it's an upper-soft-bound, not a goal.

Add a corresponding warning code (e.g., `SPREAD_WORD_COUNT_HIGH`) with severity `info`, not `warning` — exceeding the heuristic is a signal, not a problem.

This is documented in [docs/linguistics/SOURCES.md](../linguistics/SOURCES.md) as an explicit *engine heuristic without a cited norm*, in the same convention used for the decodability formula in the phonology engine.

## Consequences

### What this makes easier

- The engine stays pure-text-and-developmental — no UI concerns leak into the package other apps will consume (CLI, future native app, third-party tools).
- The web layer owns its own concerns (placement, trim size, brief) without negotiating type changes through the engine.
- Per-spread data is computed once, in the engine, by the code that already has spread context — instead of every consumer reimplementing spread filtering.
- Future per-spread engine work (per-spread phoneme variety, per-spread sentence-length variance) extends `SpreadProfile` without touching the wrapper type.

### What this makes harder

- Two type hierarchies for "a manuscript" — engine's pure type and web's extended type. Acceptable cost; the alternative (engine knowing about trim sizes and placement) is worse because it constrains the engine to a single product's needs.
- The `wordCountCeiling` heuristic will be wrong for some books — a deliberately dense single-spread will fire `SPREAD_WORD_COUNT_HIGH` even when that's the author's whole point. Mitigated by `info` severity (signal, not warning) and by documenting the heuristic origin in the field's JSDoc.

### What we're accepting

- `ReadabilityProfile` becomes larger. For a 16-spread board book that's 16 `SpreadProfile` entries containing duplicates of data also aggregated at the manuscript level. The JSON gets bigger, the CLI output gets longer. Worth it for the per-spread UI affordance.
- The wrapper type means web-side serialization (saving a draft) must handle the wrapper, not just the engine type. Saving and loading is out of scope for v1 anyway (no persistence), but worth noting for the persistence ADR when it comes.

## Alternatives considered

**Composition fields on engine types.** Considered briefly. Rejected because it couples the engine to one UI's needs — the CLI doesn't care about trim sizes, the future native app may model placement differently, and embedding UI concerns in a developmental-analysis package is a category error.

**Web filters manuscript-level profile to derive per-spread data.** Considered for symmetry with the engine staying minimal. Rejected because per-spread reach-word attribution (which spread did this word *first* appear on?) requires walking the manuscript in order — the engine already does that; the web layer reproducing it duplicates work and risks divergence.

**Make per-spread word-count targets a cited norm.** Looked for developmental citations on per-spread distribution. None exist that would survive scrutiny — the published guidance is at the manuscript level (Kole, SCBWI). Treating an even-distribution rule as a citation would violate the citation-discipline rule in [CLAUDE.md](../../CLAUDE.md). The heuristic disclosure is the honest path.

**Separate `analyzePerSpread()` function.** Considered to keep `analyze()` lean. Rejected because every web call would now make two engine calls, and the implementation walks the manuscript once internally either way. The wider `ReadabilityProfile` is simpler than the two-call pattern.
