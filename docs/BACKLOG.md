# Folio Backlog

Working backlog for todos and features. One list, ordered within each section.
Every item cites where it came from (ADR, handoff, or session) so scope doesn't drift.
When an item ships, strike it with a date + commit hash rather than deleting it —
same convention as the handoff queue.

Created 2026-07-11. Sources: `docs/AGENT_HANDOFF.md` (queue + next-move ladder),
ADRs 0004–0006, `packages/engine/src/data/README.md`, session findings.

---

## Now (unblocked, do next)

- [ ] **Push `main`.** Two commits ahead of origin (`f26f985` editor data-integrity,
  `a5d8f58` inspector slice 1); slice 2 sits uncommitted in `index.astro`. Commit
  slice 2, push all three. *(ops — needs local SSH key)*
- [ ] **Finish studio dashboard slice 2** — context bar + ⌘K palette (ADR 0006,
  in flight). Verify the extracted code paths (`performReset()`,
  `requestLoadSample()`) fire before committing; the ADR claims no behavior forked.
- [ ] **CMU dict expansion (~2k words).** Gates the honest decodability work
  (ADR 0004). Scoped 2026-07-11: current dict is 330 entries → 66.1% token
  coverage on the 10-fixture corpus, 1,856 unique OOV words falling to the
  grapheme heuristic. Plan:
  1. Vendor the upstream cmudict file (public domain) with provenance.
  2. Zero-dependency generator script: word list (corpus vocabulary ∪ current
     entries) → `cmu-dict.ts`, same header format.
  3. Resolve contraction/apostrophe handling against the tokenizer convention
     first (naive splits produce `t`/`s`/`ll`/`m` fragments).
  4. Re-baseline corpus regression numbers as a deliberate, separate commit.

## Web — studio dashboard (design 1c) + editor

- [ ] **Slice 3: mode rail.** Removes sidebar toggle + status bar, lands prefs v2
  (tab persistence — deferred from slice 1 to avoid migration debt), revisits
  the bundled mock icons / Lucide decision. *(ADR 0005/0006)*
- [ ] **Slice 4: Prosody mode.** Absorbs the three prosody rows (dominant meter,
  consistency, rhyme scheme) currently parked at the bottom of the Phonics tab.
  *(ADR 0005 — "temporary home")*
- [ ] **Editable manuscript title.** The context bar shows a static "Untitled
  manuscript" with no way to change it — ADR 0006 scoped inline editing out per
  the handoff, so it's an intentional gap, now a real one. Needs: title state in
  persistence, edit affordance in the context bar, export filename should follow.
  *(found in session 2026-07-11)*
- [ ] **guide.astro copy fix.** "The sections follow the sidebar, top to bottom"
  is stale post-slice-1. Small. *(ADR 0005 watch item)*
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
- [ ] **`board` fixture: finalize "Time for Bed, Little One."** Draft exists
  (session 2026-07-11) — 7 spreads, refrain, planted meter outlier + distant
  rhyme pair + lexical outlier ("luminous ascent") + off-signature 14pp. Trim to
  a 12/16pp signature or keep the miss as the hard-layer demo (decide), then wire
  as the `board` sample. *(ADR 0009)*
- [ ] **Calibrate each fixture to ~60–70% "profile coverage."** By construction:
  one half-heard deviation per soft axis (prosody, rhyme/phonological, lexical
  frequency) + at least one hard-constraint miss, each sized to *its own* band.
  Not a grade — the target is "sound but tightenable." *(ADR 0009)*
- [ ] **Band-key the demo state (1:1:1).** Selecting a band loads its canonical
  book → layout → analysis via one lookup. Collapse any code path that lets band,
  layout, and sample vary independently. *(ADR 0009)*
- [ ] **Descriptive mirror readout for the soft layer.** Surface phoneme
  distribution + meter shape *as observation* (e.g. "/u/ appears often here,"
  "the meter has this shape"), distinct from the reach-word / decodability paths
  that exist to flag. Feeds the demo's "notice-it-yourself" moment. *(ADR 0009)*
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
