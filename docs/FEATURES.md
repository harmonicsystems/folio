# Folio — Feature Inventory

Everything shipped, in one scannable place. Last updated **2026-06-15** (post-M5, post-M4.1, post-Tier-1).

> Canonical sources: [`ARCHITECTURE.md`](../ARCHITECTURE.md) for milestone detail, [`docs/linguistics/SOURCES.md`](linguistics/SOURCES.md) for every citation, [`docs/AGENT_HANDOFF.md`](AGENT_HANDOFF.md) for open decisions. This file is the consolidated view — when it disagrees with those, those win.

---

## The engine — `@harmonic-systems/early-literacy`

Pure portable TypeScript, zero runtime dependencies, no Node-only APIs (ports to Swift later). Every metric cites a source in SOURCES.md or is explicitly documented as an engine choice with known error modes. **195 unit tests + 230 corpus regression tests** (10 public-domain fixtures, two per age band), all green.

`analyze(manuscript)` returns a `ReadabilityProfile` covering:

### Vocabulary (M1)
- Word tokenization tuned for children's text — contractions and possessives stay whole, hyphenated compounds split, Unicode letters supported, offsets preserved for editor highlighting
- **Tier-1 (familiar-word) coverage** — share of words a young reader likely already knows, measured against the **Dale–Chall (1995)** familiar-word list (~2,939 normalized entries) ∪ Dolch/Fry sight words, as a sourced proxy for Beck/McKeown/Kucan Tier 1
- Sight-word coverage against **Dolch** (220 service words + 95 picture nouns) and **Fry** (first 100) — the narrower instant-recognition measure
- Type-token ratio (vocabulary diversity)
- Reach-word identification — words outside Tier 1, attributed to the spread where each first appears, flagged `tier-2`; the false-positive fix means familiar words like "umbrella" no longer flag
- ⏳ Tier-2 vs Tier-3 split (needs a frequency band) and stem-aware reach detection (so "bunnies"/proper nouns stop counting) — future work

### Phonology (M2)
- CMU Pronouncing Dictionary subset (~315 curated words) with grapheme-heuristic fallback for everything else
- **Guessed-pronunciations integrity surface** — every word whose pronunciation is estimated rather than dictionary-backed is reported, so users know what's a guess
- Syllabification (max-onset principle over ARPABET, legal English onset clusters)
- Phoneme inventory per manuscript — IPA, place/manner/voicing, first-spread attribution, and acquisition ages from **Crowe & McLeod (2020)** (consonants; vowels default to age 3 as a documented convention pending a citable vowel norm)
- Syllable-type breakdown (V / CV / VC / CVC / CCVC / CVCC / other)
- Decodability score 0–1 (engine-choice formula: 70% phoneme ease + 30% syllable ease; calibration pass pending more corpus signal)

### Prosody (M4, refined M4.1)
- Stress sequences from CMU stress markers (binary: primary+secondary collapse to stressed)
- Dominant meter detection across all four canonical feet — iambic, trochaic, anapestic, dactylic (**Hayes 1995**) — with `mixed` and `undefined` (prose) fallbacks
- **Per-line template scoring** — the verse line is the metrical unit (**Attridge 1982**); odd-length lines no longer phase-flip the stream
- **Anacrusis handling** — one unstressed line-initial pickup treated as extrametrical, with a built-in penalty that keeps iambic/trochaic discrimination deterministic
- Rhyme-scheme detection (AABB, ABAB, …) via last-stressed-vowel suffixes, cot-caught merger normalized (dog/log rhyme), spreadsheet-style labels past Z
- Meter-consistency score 0–1

### Syntax (M5)
- Orthographic sentence segmentation (**Nunberg 1990**) with source offsets — honorific/initial/decimal guards, dialogue-tag continuation after `!`/`?`/`…` (CMOS ch. 13: `"Stop!" cried Mr. McGregor.` is one sentence), verse spanning line breaks, paragraph flushes
- Finite-clause estimation — **Hunt (1965)** construct via guarded closed-class markers; documented lower bound with stated bias directions
- Four-way sentence typing — declarative / interrogative / exclamatory / imperative (**Quirk et al. 1985**; CCSS L.1.1.j convention)
- Sentence-length mean + population standard deviation (rhythm vs. monotony signal)
- Structural metrics only — no developmental thresholds, deliberately (production norms like Hunt/Loban would be a category error for input text)

### Orchestration
- Word-count targets per age band (board / early-picture / picture / early-reader / chapter; SCBWI + Mary Kole guidance) with over/under warnings
- Per-spread profiles — word counts, heuristic ceilings (ADR-0003), sight-word coverage, reach words, warnings
- Single segmentation pass feeds `sentenceCount`, `averageSentenceLength`, and all syntax metrics

### Test corpus
Five public-domain fixtures spanning all five age bands (synthetic board book, Aesop, Peter Rabbit, Owl & the Pussy-Cat, Wizard of Oz ch. I–III), with hand-derived expectations — derivation method documented per fixture in `corpora/*.meta.json` note fields.

---

## The web alpha — folio.harmonic-systems.org

### `/` — spread-first editor
- 16 spreads, two facing pages each, per-page composition (text-only / text-top / text-bottom / illustration-only)
- Grid view + Book view (scroll-snap, trim-driven aspect ratio)
- Lexical rich text — bold/italic/underline/strikethrough, floating selection toolbar, markdown shortcuts, soft hyphen + nbsp
- Live analysis sidebar bound to the engine, per spread and whole-manuscript
- Three-layer in-text highlighting (CSS Custom Highlight API): reach words, active phonemes, find matches
- Phoneme inventory views — by acquisition age (color-coded) and by articulation manner; click a phoneme chip to light up every word containing it
- Guessed-pronunciations sidebar (the integrity surface, end to end)
- Layout presets + body-font picker (incl. Atkinson Hyperlegible)
- Find & replace (Cmd+F) with match navigation
- Autosave — draft to `folio.draft.v1`, workspace prefs to `folio.prefs.v1` (local-first; nothing leaves the browser)
- Export — `.txt`, `.md` (formatting preserved), PDF (print stylesheet)
- Onboarding card, About dialog with shortcuts, browser-compat banner fallback
- Accessibility pass (WCAG-AA contrast, focus-visible, aria-pressed); tablet-aware (iPad portrait + landscape)

### `/paste` — analyze-only
- Paste a manuscript, pick an age band, get the full report — no editor, no persistence; the low-friction clinical/evaluation surface
- Built-in public-domain sample texts

### `/about` — landing page for cold visitors

### Instrumentation
- Plausible analytics (cookieless, no Google) on all three routes
- Audience-signal goals: `analyze_clicked` (`/paste`, explicit submits only) and `text_typed` (`/`, once per pageview on first real keystroke — draft restores don't count)

---

## Infrastructure
- pnpm workspace monorepo: `engine` / `cli` / `web` / `corpus-tests`
- CLI: `folio analyze <file>` emits the full JSON profile
- CI on every push/PR (typecheck + full test suite); auto-deploy to GitHub Pages on `main`
- ADRs for non-obvious decisions (`docs/decisions/`)

---

## Deliberately not built (and why)

| Not built | Why |
|---|---|
| Tier-2 vs Tier-3 reach-word split | Needs a frequency band wider than Dale–Chall; all reach words currently labeled `tier-2` |
| Stem-aware reach detection | "bunnies"/"squeezed" and proper nouns read as reach words; needs morphology (reason `morphologically-complex`) |
| Syntax surfacing in the web UI | Engine computes it (M5); deliberately not shown yet — pre-signal feature churn |
| Syntax thresholds/warnings by age | No citable comprehension-side source; cite-or-omit |
| Quote-aware utterance typing (dialogic prompts) | Needs new contract fields → ADR first |
| Dialogic-reading prompt generator | "Ship before adding more" — awaits audience signal |
| Reading Kit (clinical PDF export) | Awaits SLP-side signal (`/paste` engagement) |
| Trope-template overlay, manuscript import | Awaits author-side signal (`/` engagement) |
| Phone-mode responsiveness | Tablet+ only by design for now |
| Decodability recalibration | Needs more corpus across age bands |

The full future list (native SwiftUI app, illustrator briefs, paper engineering, eye-movement simulation) lives in `ARCHITECTURE.md`.
