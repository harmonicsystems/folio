# ADR 0011 — Mirror readouts: meter shape + phoneme distribution

Status: Accepted 2026-07-12
Deciders: David Nyman (prototype approval, ADR 0009/0010 principles)

## Context

ADR 0010 gave each surface one job and left the mirror modes with a promise to keep:
Phonology and Prosody earn their rail slots only when they show what a numbers row can't —
the *shape* of the story. The two readouts were designed in the approved prototype
(`docs/prototypes/ui-consolidation.html`); this ADR records the judgment calls made
implementing them for real data, under ADR 0009's rule: observation only, no verdicts,
no evaluative vocabulary.

## Decision

- **Meter shape (Prosody panel).** The slice-4 line-endings list becomes the mirror chart:
  one row per line — rhyme letter, a bar scaled to syllables per line **against the
  manuscript's own longest line**, and the count. Rows render whenever the text has ≥2
  lines (the old all-or-nothing rhyme-scheme gate is gone); rhyme letters appear when a
  scheme exists, otherwise a muted dot. Per-line syllables are computed client-side with
  the engine's own exported `tokenizeWords` + `getPronunciation` + `syllableCount` — the
  same pipeline the analysis uses, no engine change, no new exports.
- **Emphasis is the pattern's own deviation, nothing normative:** a line at ≥1.5× the
  manuscript's median (only when there are ≥4 lines, so a median means something) draws in
  ochre instead of taupe. No threshold from outside the text, no wording anywhere — the
  bar is just longer and warmer. The prototype's dashed pulse guide was dropped: the
  median marker it implied is already visible in the bars themselves, and a guide line
  suggests a target.
- **Phoneme distribution (Phonics panel, above the inventory collapsibles).** A matrix of
  the manuscript's **top 8 sounds** × **non-empty spreads**, cell intensity in three ochre
  steps. The metric is **words carrying the sound** (getWordPhonemes dedupes within a
  word), deliberately distinct from the inventory chips' occurrence counts below and
  labeled as such everywhere — caption, row labels, cell titles all say "words". Rows are
  real `.phon-chip` buttons (IPA identities shared with the chips and highlights), so
  click-to-highlight, cross-view active-state sync, and the clear button apply unchanged.
- **Cell intensity is relative to each row's own peak**, not absolute counts: a frequent
  sound would otherwise read uniformly dark and its clustering — the very thing the
  mirror exists to show — would vanish. The caption says exactly that ("relative to its
  own busiest spread"); hover gives the raw count.
- **The accessible channel is the row, not the cells**: each row button's label carries
  the full per-spread distribution ("Sound /ʌ/ — in 26 words (spread 1: 6, …)"), so what
  the shading shows visually is available verbatim to screen readers. Occupied cells
  additionally carry a taupe border — occupancy survives on a shape channel even where
  adjacent fill steps fall under the 3:1 non-text contrast line.
- **Captions are static, italic, and descriptive** (`.mirror-cap`): they explain how to
  read the drawing, never what to think of it. Both readouts render on every analysis
  pass like every other panel (byId works under display:none), so Analyze-mode cards get
  them for free.

- **Pre-commit review corrections (3 fixed before ship):** the matrix originally *labeled*
  its counts as occurrences while getWordPhonemes actually dedupes within words — the same
  panel would show "/m/ — 2 occurrences" on a chip and "×1" in the matrix for "mama";
  resolved by embracing the words-carrying-the-sound metric and relabeling every surface
  (the two metrics answer different questions and now both say which). The per-spread data
  had no non-hover channel at all (bare spans, title-only, sub-3:1 fill steps) — fixed with
  the row-label distribution summary + occupied-cell borders above. And a singular-count
  label read "1 occurrences". The review also probed and rejected: caption hover-wording,
  hue-only outlier signal (bar length already encodes it), and a latent
  display:grid-vs-hidden hazard (guarded anyway with `.phon-dist[hidden]`).

## Consequences / watch items

- Top-8 is a curation cut, not a claim: sounds nine-plus are visible in the existing
  inventory collapsibles below. If SLP usage wants a specific phoneme's row on demand,
  the natural extension is "pin a phoneme from the inventory into the matrix."
- Per-line syllable counts inherit pronunciation quality: on dict-covered text (the demo
  fixture: 100%) they are exact; heavily OOV text gets heuristic counts, consistent with
  the phonology panel's existing guessed-pronunciations integrity signal.
- The 16-column worst case (all spreads filled) puts matrix cells at ~13px in the 320px
  aside — acceptable at iPad+ widths; revisit if a denser trim ever matters.
- The prototype's remaining unbuilt idea — click a meter row to scroll its line into
  view — is deliberately deferred until someone asks.
