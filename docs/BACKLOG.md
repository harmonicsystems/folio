# Folio Backlog

Working backlog for todos and features. One list, ordered within each section.
Every item cites where it came from (ADR, handoff, or session) so scope doesn't drift.
When an item ships, strike it with a date + commit hash rather than deleting it —
same convention as the handoff queue.

Created 2026-07-11. Sources: `docs/AGENT_HANDOFF.md` (queue + next-move ladder),
ADRs 0004–0006, `packages/engine/src/data/README.md`, session findings.

---

## Now (unblocked, do next)

- [ ] **Push `main`.** Seventeen commits ahead of origin (`f26f985` audit fixes
  → `4a08938` mirror readouts: studio-dashboard slices 1–4, CMU dict expansion,
  board demo fixture, ADR 0010 consolidation, ADR 0011 mirrors, docs). Awaiting
  David's explicit go — auto-deploy takes the new UI live on push. *(ops —
  needs local SSH key)*
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

## Product direction — read-aloud picture-book MVP

*Decision candidate from product conversation 2026-07-12. This narrows the
editor's first audience and default experience; it does not remove the longer
age bands from the engine API. Record an ADR before changing route-level product
scope or age-band prominence.*

- [ ] **Decide the MVP audience: writers of board books and picture books for
  ages 0–7, especially adult-read-aloud manuscripts.** This is where short,
  spread-native text makes Folio's strongest signals — phonology, repetition,
  rhythm, rhyme, vocabulary, and page density — most legible. Keep
  `early-reader` and `chapter` supported by the engine/CLI, but do not promise
  equal editor depth until they have section/chapter navigation, morphology,
  wider frequency data, and independently validated reading constructs.
  *(product conversation 2026-07-12; needs ADR)*
- [ ] **Separate audience age from reading situation.** Ask how the manuscript
  will usually be experienced: `adult read-aloud`, `shared reading`, or
  `independent reading`. Use that context to prioritize existing signals; do not
  collapse comprehension, decoding, and oral performance into one "reading
  age." This likely belongs in web-side manuscript metadata first; changing the
  published engine contract requires an ADR. *(product conversation 2026-07-12)*
- [ ] **Adopt three primary writer jobs for the MVP.** Use these to accept or
  reject new UI work:
  1. *Audience fit:* "Show me the linguistic demands in my manuscript so I can
     judge whether they fit my intended audience and reading situation."
  2. *Sound and participation:* "Show me the rhyme, repetition, phoneme patterns,
     and invitations to participate that shape a read-aloud."
  3. *Flow across pages:* "Show me where rhythm, density, or language changes
     across pages and spreads so I can rehearse and inspect those moments."
  Folio reports evidence and reference ranges; it does not certify quality or a
  definitive reader age. *(product conversation 2026-07-12)*
- [ ] **Rewrite the product promise around ingredients, not assessment.** Draft
  direction: Folio shows how a picture-book manuscript is built — the words
  children encounter, the sounds they hear, and the rhythm an adult reads aloud.
  It does not grade or rewrite the story. Reconcile homepage, onboarding, guide,
  and sample-picker copy after the MVP audience decision. *(product conversation
  2026-07-12)*

### User-story slices

- [ ] **Audience-fit profile, not reading-age prediction.** For read-aloud work,
  foreground familiar/reach vocabulary, sentence and clause structure,
  repetition, participation opportunities, phoneme inventory, rhythm/rhyme, and
  density by spread. For independent reading, foreground sight words,
  pronunciation certainty, decodability, syllable shapes, and sentence
  complexity. Copy must say what the manuscript asks of a reader/listener, not
  claim which ages "can read" it. *(product conversation 2026-07-12)*
- [ ] **Rhyme story: make the evidence inspectable in context.** User story:
  "As a rhyming picture-book writer, I want to see the rhyme structure Folio
  detects across my lines so I can find breaks and intentional variations."
  Extend the existing per-line rhyme letters with linked line evidence,
  uncertain/absent endings, and guessed-pronunciation provenance. Never label a
  non-match as wrong. *(product conversation 2026-07-12; builds on ADR 0011)*
- [ ] **Rhythm story: support rehearsal without predicting performance.** User
  story: "As a read-aloud writer, I want to see where the manuscript's suggested
  stress pattern is consistent or changes so I can rehearse those passages and
  decide whether the variation is intentional." Show dominant pattern,
  line-level consistency, stress trace, outliers, and pronunciation uncertainty.
  Phrase effects conditionally: written stress can suggest a stumble, pause, or
  emphasis, but cannot determine a reader's performance. *(product conversation
  2026-07-12; builds on ADR 0011)*

### Interaction model — a quiet studio reader

- [ ] **Introduce neutral, evidence-backed "reflections."** Borrow progressive
  disclosure from chatbot interfaces without chat, generation, or implied
  agency: watch continuously, stay quiet, surface a small contextual
  observation, let the writer inspect its evidence, and never alter manuscript
  text. Each reflection needs a scope (word/line/page/spread/manuscript), reason
  for surfacing, evidence, provenance/confidence, relevant mode link, and a
  consequence-free dismissal. *(product conversation 2026-07-12)*
- [ ] **Design three depths of attention.** `Glance`: at most two or three timely
  reflections beside the canvas. `Inspect`: affected words/lines, neighboring
  spread comparison, source/guess status, and construct limits. `Study`: the
  existing Analyze, Phonics, and Prosody modes. Do not turn Write mode into a
  persistent dashboard. *(product conversation 2026-07-12; extends ADR 0010)*
- [ ] **Separate linguistic patterns from integrity warnings.** Reserve warnings
  for states that threaten trust or work — failed persistence, guessed
  pronunciation, unsupported browser behavior, invalid data. Present reach
  vocabulary, density, rhythm changes, and phoneme concentrations as patterns or
  reflections. Audit labels including `Verdicts`, `warnings`, and "outlier" for
  unintended grading semantics. *(product conversation 2026-07-12)*
- [ ] **Adopt observation-register vocabulary throughout the editor.** Prefer
  `profile`, `pattern`, `less familiar`, `outside the selected reference range`,
  `examine`, `reflection`, and `estimated`; avoid `score`, `problem`, `failure`,
  `too difficult`, `age inappropriate`, `fix`, `weakness`, and `passed` unless a
  hard technical constraint genuinely warrants it. *(product conversation
  2026-07-12; extends ADR 0009 neutrality rule)*

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
analysis + authored demo fixtures). Replaces the current pre-loaded samples.*

- [ ] **Author diagnostic demo fixtures for the chosen MVP bands.** Build
  youngest-first and prioritize `board`, `early-picture`, and `picture` if the
  read-aloud MVP is accepted. These are intentionally authored demonstration
  manuscripts, not regression fixtures and not LLM-generated manuscript
  content. Keep public-domain texts as comparison fixtures showing that strong
  literature can legitimately produce many signals. Defer bespoke
  `early-reader`/`chapter` demos until those editor experiences are product
  priorities. *(ADR 0009 + product conversation 2026-07-12; scope depends on MVP
  ADR)*
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
- [ ] **Replace "60–70% good/profile coverage" with diagnostic signal design.**
  A sample's job is to demonstrate what Folio can notice, not what Folio
  considers good. Give each fixture a small, intentional set of legible
  contrasts: familiar vocabulary plus a few reach words; repetition followed by
  a deliberate break; a concentrated target phoneme; at least one visible
  pronunciation-provenance case where appropriate; aligned rhythmic lines plus
  a variation; a denser spread; mixed sentence types; and a wordless or
  near-wordless moment. Select only signals appropriate to that manuscript — do
  not force every engine axis into every sample. *(supersedes the 60–70% framing
  from ADR 0009; product conversation 2026-07-12 — update ADR before shipping)*
- [ ] **Add fixture-authored guided tours.** Store deterministic annotations in
  demo metadata: where to start, what pattern to activate, which evidence to
  inspect, and what limitation/provenance note matters. The tour should teach
  that flags are ingredients rather than defects and should never generate or
  suggest manuscript prose. Suggested sample categories: `clean signal` (one
  domain), `mixed manuscript` (several interacting dimensions), and
  `public-domain comparison` (recognized literature with legitimate signals).
  *(product conversation 2026-07-12; likely web-only metadata)*
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
