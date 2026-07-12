# Folio Backlog

Working backlog for todos and features. One list, ordered within each section.
Every item cites where it came from (ADR, handoff, or session) so scope doesn't drift.
When an item ships, strike it with a date + commit hash rather than deleting it —
same convention as the handoff queue.

Created 2026-07-11. Sources: `docs/AGENT_HANDOFF.md` (queue + next-move ladder),
ADRs 0004–0006, `packages/engine/src/data/README.md`, session findings.

---

## Now (unblocked, do next)

- [ ] **Push `main`.** Six commits ahead of origin (`f26f985` editor
  data-integrity, `a5d8f58`/`a404b6e`/`f861ba0`/`bf834bc` studio-dashboard
  slices 1–4, `0ce67bc` docs). Awaiting David's explicit go — auto-deploy takes
  the new UI live on push. *(ops — needs local SSH key)*
- [x] ~~**Finish studio dashboard slice 2**~~ — shipped 2026-07-11, `a404b6e`
  (extracted paths verified live; 11 review findings fixed pre-commit, ADR 0006).
- [x] ~~**CMU dict expansion (~2k words).**~~ — shipped 2026-07-12, `55f6c07`
  (dict 330 → 2,119 entries, corpus token coverage 66.1% → 99.1%) +
  `3626d78` (re-baseline: one bound, jemima meterConsistency). cmudict-0.7b
  vendored with SHA-256 provenance; generator at
  `packages/engine/scripts/generate-cmu-dict.mjs` reuses the engine tokenizer
  so keys can't diverge; curly-apostrophe lookups normalized; five heteronym
  overrides documented. 83 corpus words remain honestly OOV (absent upstream).
  **This unblocks the sight-word-excluded decodability variant (ADR 0004).**

## Web — studio dashboard (design 1c) + editor

- [x] ~~**Slice 3: mode rail.**~~ — shipped 2026-07-11, `f861ba0` (rail + Analyze
  mode + prefs v2; status bar + sidebar toggle removed; 8 pre-ship fixes,
  ADR 0007). Mock icons kept, no Lucide dep.
- [x] ~~**Slice 4: Prosody mode.**~~ — shipped 2026-07-11, `bf834bc` (Phonology +
  Prosody modes; prosody rows moved to `panel-prosody` + per-line rhyme letters;
  ADR 0008). Studio-dashboard sequence complete.
- [ ] **Editable manuscript title.** The context bar shows a static "Untitled
  manuscript" with no way to change it — ADR 0006 scoped inline editing out per
  the handoff, so it's an intentional gap, now a real one. Needs: title state in
  persistence, edit affordance in the context bar, export filename should follow.
  *(found in session 2026-07-11)*
- [ ] **guide.astro copy fix.** Stale twice over: post-slice-1 AND post-ADR-0010
  (the tabbed inspector it may now describe was consolidated into the digest +
  modes the same day). A parallel session is refreshing it against slices 1–4;
  it needs one more pass against ADR 0010 after that lands. *(ADR 0005 watch
  item + ADR 0010)*
- [x] ~~**UI consolidation (ADR 0010).**~~ — shipped 2026-07-12, `3479c88`
  (prototype `c504399`): tab strip dissolved into the Write digest with
  mode cross-links, Issues → Verdicts, Grid/Book moved onto the canvas,
  panels to static role=region. Mirror readouts (phoneme distribution,
  meter shape) remain the ADR 0009 items that make the modes sing —
  prototyped in docs/prototypes/ui-consolidation.html, not yet product.
- [ ] *(watch, not scheduled)* **Stacked highlight legibility** — reach-word wash
  under phoneme-match tint composites to ~0.34 ochre. If it reads muddy, the
  sanctioned fallback is border-only `phoneme-match`. Do not do speculatively.
  *(ADR 0005)*

## Demo / sample fixtures

*Whole initiative from session 2026-07-11; rationale in ADR 0009 (two-layer
analysis + generated demo fixtures). Replaces the current pre-loaded samples.*

- [ ] **Generate one fully-realized book per `AgeBand`.** Five bespoke fixtures
  (`board`, `early-picture`, `picture`, `early-reader`, `chapter`), built
  youngest-first. Each replaces ad-hoc pre-loaded samples so every band's
  analysis can be previewed end to end. *(ADR 0009)*
- [x] ~~**`board` fixture: finalize "Time for Bed, Little One."**~~ — shipped
  2026-07-12, `17a4f31`. Wired as the board sample from
  `packages/web/demo-fixtures/`; the 14pp off-signature miss is KEPT as the
  hard-layer demo (ADR 0009 requires one; the signature verdict surface is
  future work). Two things the wiring exposed and fixed: setText was
  flattening verse lines (no sample ever showed a rhyme scheme), and demo
  vocabulary must be dict-covered or grapheme guesses invent false
  non-rhymes in the mirror. Verified: AABBCCDDEEFFGG per-line letters,
  meter outlier visible at 66.7% consistency, luminous/ascent flagged,
  zero guessed pronunciations. *(ADR 0009)*
- [ ] **Calibrate each fixture to ~60–70% "profile coverage."** By construction:
  one half-heard deviation per soft axis (prosody, rhyme/phonological, lexical
  frequency) + at least one hard-constraint miss, each sized to *its own* band.
  Not a grade — the target is "sound but tightenable." *(ADR 0009)*
- [ ] **Band-key the demo state (1:1:1).** Selecting a band loads its canonical
  book → layout → analysis via one lookup. Collapse any code path that lets band,
  layout, and sample vary independently. *(ADR 0009)*
- [x] ~~**Descriptive mirror readout for the soft layer.**~~ — shipped
  2026-07-12 (ADR 0011): meter-shape chart in the Prosody panel (per-line
  syllable bars against the manuscript's own longest line, deviation ≥1.5×
  median in ochre) + phoneme-distribution matrix in Phonics (top-8 sounds ×
  spreads, words-carrying-the-sound, per-row relative shading, rows are live
  phon-chips). Observation-register copy throughout. *(ADR 0009 → 0011)*
- [ ] **Neutrality audit of soft-layer copy.** No evaluative vocabulary
  ("flaw," "weak," "wrong," "fix") anywhere in the soft layer; keep observation
  and optional SLP *reference* notes visibly separate. Any verdict phrasing there
  is a bug against ADR 0009. *(ADR 0009)*

## Engine

- [ ] **Sight-word-excluded decodability variant.** Blocked by CMU expansion —
  non-sight tokens are currently ~97–100% grapheme-guessed. *(ADR 0004)*
- [ ] **GPC-based percent-decodable metric.** ADR 0004's destination construct;
  recorded, not started. Blocked by the variant above.
- [ ] **Vowel acquisition norms.** All 15 vowels default to age 3 (Crowe & McLeod
  2020 is consonants-only). Candidates: Otomo & Stoel-Gammon 1992, Donegan 2013.
  One row of `cmu-phonemes.ts` to swap; needs a `SOURCES.md` entry. *(handoff queue)*
- [ ] **Stem-aware reach detection.** "bunnies" and proper nouns stop counting as
  reach words; new reason `morphologically-complex`. *(handoff, Tier-1 follow-on)*
- [ ] **Tier-2 vs Tier-3 split.** Needs a wider frequency band than Dale–Chall
  provides. *(handoff, Tier-1 follow-on)*
- [ ] **Fry groups 2–10** (words 101–1000). Careful transcription from Fry 1980;
  verification rules in `data/README.md`. *(data README pending list)*
- [ ] **Decodability calibration pass** — only once there's enough corpus/user
  signal to calibrate against. *(handoff ladder #5)*

## Growth / user signal

- [ ] **Plausible: register domain** at the dashboard for
  folio.harmonic-systems.org — script already ships harmlessly. **Hold until the
  studio dashboard slices land**, so baseline data doesn't straddle two UIs.
  *(handoff + session 2026-07-11)*
- [ ] **Plausible goals** — `analyze_clicked` (/paste) + `text_typed` (/). ~10 min,
  after domain registration. *(handoff ladder #2)*
- [ ] **Reading Kit (clinical PDF export)** — half-day first cut *if* SLP audience
  signals up. Strategic, not technical. *(handoff queue + ladder #3)*
- [ ] **Trope overlay** — alternative to Reading Kit depending on which signal
  arrives. *(handoff ladder #3)*
- [ ] **Two-week rule:** if no clear signal two weeks into the watch phase, pick
  one branch and ship it anyway — the branches are reversible. *(handoff)*

---

## Conventions

- New items get a one-line provenance note (ADR, issue, or "found in session DATE").
- Anything blocked names its blocker inline.
- This file is the working list; `docs/AGENT_HANDOFF.md` stays the narrative
  orientation for new sessions. When the two disagree, this file wins on
  priority, the handoff wins on rationale.
