# Demo fixtures (ADR 0009)

Authored-to-spec demo books, one per age band (built youngest-first), wired as
the editor's pre-loaded samples. These are NOT the regression corpus — that
lives in `/corpora` (verbatim public-domain texts with measured bounds). Demo
fixtures are generated product content whose ingredient profile is controlled
on purpose: each carries one **half-heard deviation per soft axis** (prosody,
rhyme/phonological, lexical frequency) plus at least one **hard-constraint
miss**, calibrated to its own band, so the analysis has something legible to
mirror. See `docs/decisions/0009-two-layer-analysis-and-demo-fixtures.md`.

Format: one spread per stanza (blank-line separated); single newlines are
verse line breaks (the editor preserves them, and the engine's per-line
prosody reads them).

## board-time-for-bed.txt — "Time for Bed, Little One"

Drafted by David (session 2026-07-11) against a `board` envelope: 7 spreads,
couplet refrain, steady 4-beat read-aloud pulse. Planted, by construction:

- **Meter outlier** — the elephant line (~17 syllables against the 4-beat
  pattern).
- **Phonologically weak rhyme pairs** — "warm / warm" (identity, not rhyme)
  and "wing / everything" (contained identity).
- **Lexical-frequency outlier** — "luminous ascent" (Tier-2+ against a
  Tier-1 text).
- **Hard-constraint miss** — 7 spreads = 14 pages, off the 12/16pp board
  signature. Kept deliberately (ADR 0009 requires a hard-layer demo; the
  verdict surface for signatures is future work and this fixture is ready
  for it).
