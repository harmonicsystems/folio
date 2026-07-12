# ADR 0014 — Spread carousel editor and writer lenses

Status: Accepted 2026-07-12
Deciders: David Nyman (visual direction and implementation authorization), Codex product pass

## Context

The studio-dashboard sequence made every shipped engine output reachable, but it
retained the mental model of an analytics product: a mode rail, a grid of 16
editor tiles, and inspector/report panels. ADRs 0012 and 0013 instead position
Folio as a quiet studio reader for read-aloud picture books. A scratch interface
concept tested a composition in which the facing spread is the dominant object,
analysis behaves like an editorial margin, and the entire book remains visible
as a compact shape.

The concept was approved as the direction for an alpha-testable rebuild. The
engine API, Lexical editing foundation, local-first persistence, and integrity
rules remain load-bearing and must survive the UI replacement.

## Decision

### 1. One facing spread is the primary canvas

The editor presents one two-page spread at a time in a horizontal carousel.
Previous/next controls, arrow keys outside editing controls, and a 16-spread book
map provide navigation. All 32 Lexical editors remain mounted so formatting,
history, persistence, and programmatic sample loading remain stable across
carousel movement.

### 2. Replace technical modes with three writer lenses

- **Draft** shows a few deterministic reflections about vocabulary, density,
  sound arrival, and other changes across the manuscript.
- **Listen** presents rhyme, suggested stress/meter, and line shape as a
  rehearsal surface, never a performance prediction.
- **Language** presents the sound palette, familiar/reach vocabulary, sentence
  shape, and pronunciation provenance.

These lenses reorganize existing evidence. They do not change engine behavior.

### 3. Analysis is an editorial margin

The right-hand margin is unframed and quiet. It shows evidence in short sections
rather than persistent metric cards. Empty states explicitly wait for manuscript
evidence. Estimated pronunciation remains visible and does not get blended into
direct observations.

### 4. The book map shows shape, navigation, and reflection presence

Sixteen compact spread controls encode relative word density within the current
manuscript. The selected spread and spreads referenced by surfaced reflections
remain distinguishable without a second dashboard or permanent legend.

### 5. Persistence advances to a web-only v3 document

`folio.draft.v3` stores title, reading situation, selected spread, active lens,
page placement, plain text, and lossless Lexical state. The editor migrates v2
drafts on read. Reading situation remains outside the published engine contract.

### 6. Existing capabilities move into quiet utility controls

Sample loading, plain-text/Markdown/PDF export, layout selection, manuscript
title, local save status, and reset remain available. They no longer define the
first viewport. Find/replace and the command palette are deferred from this
first rebuild rather than transplanted as old-shell dependencies.

### 7. The manuscript is visually errorless by default

Less-familiar vocabulary remains available in Draft and Language evidence but
is not marked with ambient error-like underlines on the writing canvas. Inline
paint is opt-in: selecting a phoneme in Language temporarily highlights the
words that carry it. A Focus control hides manuscript metadata, lenses, the
editorial margin, and book map while preserving the spread carousel, autosave,
and background analysis; Escape returns to the studio.

## Consequences

- The app now reads as a writing environment first and an analysis tool second.
- A complete picture-book manuscript can be traversed without shrinking its
  pages into editing tiles.
- The three writer jobs in ADR 0012 have direct interaction surfaces.
- Grid overview, command palette, and find/replace are temporarily absent; alpha
  feedback should decide whether they return and where they belong.
- The single React island owns orchestration that previously lived in a large
  Astro page script. The engine remains framework-free and portable.
- The book-map density bars are within-manuscript comparisons, not developmental
  targets.
- A writer can make the analysis layer disappear without changing or pausing
  it; returning to the studio reveals up-to-date evidence.

## Alternatives considered

- **Restyle the existing studio dashboard.** Rejected because the hierarchy,
  not the palette, was the problem.
- **Keep grid and carousel as equal primary views.** Rejected for the first pass;
  equal modes weaken the commitment to page-level composition.
- **Mount only the current spread.** Rejected because it complicates lossless
  editor state, sample loading, and analysis reads for the whole manuscript.
- **Move reflection derivation into the engine.** Rejected by ADR 0013; wording
  and attention priority remain product-context concerns.
