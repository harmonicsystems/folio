# Architecture

## Two products, one engine

Folio is structured around the principle that the *engine* and the *app* have different ship cadences and different audiences. Build them separately and let each evolve at its own pace.

- The engine (`@harmonic-systems/early-literacy`) analyzes manuscripts. Authors, clinicians, educators, and researchers all want this.
- The app (future) is a constraint-aware authoring environment for writer-illustrator teams. Narrower audience, higher production value.

The engine ships first because it's the differentiator and because it validates the entire premise — that picture book quality can be measured along developmentally grounded dimensions.

## Module structure

### `packages/engine`

Organized by linguistic domain:

- `readability/` — top-level orchestration. Takes a manuscript, returns a `ReadabilityProfile` by composing the other modules.
- `vocabulary/` — Beck/McKeown/Kucan vocabulary tiers, sight word coverage (Dolch/Fry), type-token ratio, "reach word" detection.
- `phonology/` — phoneme inventory, syllable structure (CVC, CCVC, etc.), place/manner/voicing breakdowns, decodability scoring, acquisition-age weighting (Crowe & McLeod 2020).
- `syntax/` — sentence segmentation, clause counting, sentence-type classification, length-variance. Structural metrics only at this layer; developmental thresholds are applied by `readability/`.
- `prosody/` — stress patterns, scansion for rhyming text, sentence rhythm analysis. Connects to read-aloud analysis later (VoiceKit integration).

### `packages/cli`

Command-line interface that takes a manuscript file and emits a `ReadabilityProfile` as JSON. The CLI is the engine's first user — if the CLI is useful, the engine is real.

### `packages/web`

Astro-based alpha. ZPD filter for LLM-generated content: paste a manuscript, see a readability profile and developmental warnings. The slpio.org-adjacent alpha for clinicians and educators.

## Data model

Three core types drive the engine:

- `Manuscript` — title, age band, spreads, full text
- `Spread` — one of (typically) 16 picture book spreads with text
- `ReadabilityProfile` — output: word counts vs targets, vocabulary profile, phonology profile, prosody profile, reach words, warnings

See `packages/engine/src/types.ts` for current definitions. These types are the public contract — internal implementations can change, but the type surface should remain stable across minor versions.

## Linguistic grounding

Every metric must cite its source. See `docs/linguistics/SOURCES.md`. Core anchors:

- **Vocabulary tiers** — Beck, McKeown, & Kucan (2013), *Bringing Words to Life*.
- **Phoneme acquisition** — Crowe & McLeod (2020), *AJSLP*. Supersedes Smit et al. (1990).
- **Sight word lists** — Dolch (1948), Fry (1980).
- **Phonetic transcription** — CMU Pronouncing Dictionary.
- **ZPD** — Vygotsky (1978).
- **i+1 input hypothesis** — Krashen (1985).
- **Dialogic reading** — Whitehurst & Lonigan (1998).
- **Joint attention** — Tomasello (1995, 2003).
- **Reading eye movement** — Rayner (1998).

## Tech stack rationale

- **TypeScript / ESM** for engine, CLI, web. ESM because the rest of the modern JS ecosystem has moved.
- **pnpm workspaces** for monorepo. Lighter than Turbo for what we need right now.
- **Vitest** because it's faster than Jest and the API is the same.
- **Astro** for the web alpha — matches the existing slpio.org and farmers market stack, no framework lock-in for future content pages.
- **Node 20 LTS** target. Pin in `engines`.

The Swift/SwiftData/CloudKit native app is out of scope for this repo. The engine will be ported (or wrapped via WASM) when the native app starts. Designing for portability now: pure functions over data structures, no Node-only APIs in the engine itself (file IO lives in the CLI).

## Roadmap

### Milestone 0: Scaffolding ✓

- [x] Repo structure
- [x] `CLAUDE.md`, `ARCHITECTURE.md`, `SOURCES.md`
- [x] Core types in `packages/engine/src/types.ts`
- [x] Empty module stubs with TODOs (vocabulary, phonology, syntax, prosody, readability)
- [x] `pnpm install` works end-to-end
- [x] CI: typecheck + test on push

### Milestone 1: Word-level engine

- [x] Word tokenization (contractions, possessives whole; hyphens split)
- [x] Sight word coverage (Dolch 220 service + 95 nouns; Fry first 100)
- [x] Type-token ratio
- [ ] Vocabulary tier classification (Tier 1 vs 2 — Tier 3 detection later) — **blocked on tier sourcing decision; see Open Questions**
- [x] Reach word identification (initial: structural — anything outside Dolch + Fry)
- [x] CLI emits JSON for a single text file
- [x] Synthetic board-book fixture passes constraint-based integration tests
- [ ] Tests against 3 canonical books in `corpora/` (2 in place — synthetic board-book + Peter Rabbit; one more for the early-reader or chapter band still needed)
- [ ] Extend Fry to groups 2–10 (mechanical transcription from primary source)

### Milestone 2: Phonology engine

- [ ] CMU dict integration
- [ ] Syllabification (Liang–Knuth)
- [ ] Phoneme inventory per manuscript
- [ ] Acquisition-age weighting
- [ ] Place / manner / voicing breakdown
- [ ] Decodability scoring

### Milestone 3: Web alpha

- [x] Astro scaffold at `packages/web/` with placeholder page
- [x] Deploy pipeline (GitHub Actions → Pages) live at `folio.harmonic-systems.org`
- [x] Paste-and-analyze UI consuming `analyze()` in the browser
- [x] Visual report (no auth, no persistence v1) — word count vs. target, sight-word coverage, TTR, reach words by spread, warnings

### Milestone 4: Prosody

- [ ] Stress pattern detection from CMU dict
- [ ] Meter analysis for rhyming text
- [ ] Read-aloud rhythm scoring (interface for VoiceKit later)

### Future

- Reach-word interactive review UI
- Dialogic reading prompt generator
- Illustrator brief generator
- Native SwiftUI app
- Pop-up paper engineering library
- Eye movement simulation for spread layouts

## Open questions

- Should the engine accept already-tokenized spreads, or do its own spread inference from text? *Leaning: accept both.*
- Should we publish the data files (phoneme inventory, etc.) as separate versioned packages for reuse outside this project? *Leaning: yes, eventually.*
- How do we handle copyright for the corpus? *Initial approach: synthetic stand-ins plus public-domain texts; full canonical works only as private fixtures.*
- LLM integration boundary: where in the stack does Claude API live? *Leaning: a `packages/llm-assist/` package separate from the engine, so the engine has no network deps.*
- **Tier 1 word list sourcing.** Beck/McKeown/Kucan do not publish a canonical Tier 1 list — Tier 1 is conceptually "basic everyday words." Until we choose a sourced proxy, the engine returns `tier1Coverage: 0` and empty `tier2Words`/`tier3Words`. Candidates: (a) General Service List (West 1953) — well-established but old; (b) Children's Printed Word Database (Masterson, Stuart, Dixon & Lovejoy 2010) — UK; (c) derive our own from a children's-books corpus and document the methodology. This decision blocks the `tier1Coverage` field of `VocabularyProfile` from doing real work.
