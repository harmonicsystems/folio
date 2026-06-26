# Agent Handoff

If you're picking this up cold: read **this file first**, then [`CLAUDE.md`](../CLAUDE.md) and [`ARCHITECTURE.md`](../ARCHITECTURE.md). Skim the last ten commits to see recent direction. Open `https://folio.harmonic-systems.org/` to see the working software.

This doc replaces the parallel-agent rules of the road that the early multi-track phase needed. The repo now lives on `main` only; there are no parallel sessions. **Most of the originally planned build is done.** The next phase is observation — what users actually do with what shipped — not a feature list.

## Where the project is right now

- **Live deployment:** `https://folio.harmonic-systems.org/` (auto-deploys on push to `main` via GitHub Actions → GitHub Pages).
- **Engine:** Milestones 0 → 5 complete (`@harmonic-systems/early-literacy`) — syntax (M5) shipped 2026-06-10; M4.1 prosody anacrusis 2026-06-12; vocabulary Tier-1 classification (Dale–Chall proxy) 2026-06-15; corpus doubled to 10 PD fixtures (two per band) 2026-06-15. 195 unit tests + 230 corpus regression tests, all green.
- **Web routes:**
  - `/` — spread-first editor (16 spreads, two facing pages each, Lexical rich text, in-line reach-word + phoneme highlighting, book view, layout presets, font picker, persistence, export to .txt / .md / PDF, sidebar with manuscript metrics + phonology + per-spread bars + prosody + guessed-pronunciations + warnings)
  - `/paste` — paste-and-analyze fallback (single textarea, four sample loaders, analysis output)
  - `/about` — landing page for cold visitors arriving from links / tweets
- **CI:** Typecheck + test on every push and PR. Green right now. See `.github/workflows/ci.yml`.
- **CD:** Build + deploy to Pages on every push to `main`. See `.github/workflows/deploy.yml`.
- **Analytics:** Plausible loaded on all three routes (cookieless). Domain needs to be registered in the Plausible dashboard at folio.harmonic-systems.org for counts to appear — script ships harmlessly until then.

## The thesis (don't drift from this)

The engine measures. **It does not author.** Folio is anti-slop infrastructure for children's literature. Every linguistic claim cites its source; metrics that can't be cited are documented as engine choices, not norms.

Two products from one engine: (1) a TypeScript readability package SLPs / clinicians / educators can use, and (2) a spread-first authoring surface for picture-book writers. Both shipped. The thesis the tool itself teaches — *restraint creates creative flow* — is also the thesis behind how it was built: every constraint we accepted is what let the project move fast without becoming slop.

## Hard rules (do not violate without explicit user OK)

1. **No LLM generation of manuscript text.** This applies to corpus fixtures too — synthetic fixtures are *human-authored test stand-ins*, deliberately written, not generated. The LLM may suggest dialogic prompts, illustrator briefs, and refactoring help; it may not write the manuscript.
2. **Cite or omit.** Every linguistic claim in the codebase must trace to an entry in [`docs/linguistics/SOURCES.md`](linguistics/SOURCES.md). Engine choices (e.g., the 0.7/0.3 decodability formula) are documented as choices, not norms.
3. **Engine portability.** No Node-only APIs in `packages/engine/src/`. File I/O lives in the CLI, in tests, or in the web layer. Data files are TypeScript modules under `src/data/`, never JSON read from disk. This keeps the future Swift / WASM port viable.
4. **Engine API stability.** `packages/engine/src/types.ts` is the public contract. Internal implementations can change; the type surface should stay stable across minor versions. Type changes need an ADR.
5. **Integrity surface.** When the engine makes a best-effort guess (grapheme-heuristic pronunciations, default vowel acquisition ages, uncalibrated decodability), that guess is **visible** to the user. See `getGuessedWords()` in the engine and the "Guessed pronunciations" sidebar section. Do not add silent estimation.

## What makes Folio Folio (the integrity story)

These are not features. They are the load-bearing decisions that distinguish Folio from every other "readability tool" on the market:

- **CSS Custom Highlight API** for reach-word / phoneme / find highlighting. No DOM mutation, so no caret bugs. This is why the editor can be both a real authoring surface and a real clinical-evaluation surface at the same time.
- **Spread-first surface with two facing pages.** Picture books compose at the page level. The two-page model is non-negotiable and shipped after first-user testing exposed the spread-level abstraction as wrong.
- **Phoneme-by-articulation view** + click-to-highlight. No other tool in the space (Lexile, F&P, ATOS, DRA) can see articulation. This is the SLP product.
- **Engine-as-package.** Same `analyze()` runs in the CLI, the web alpha, and any future native or third-party app. Web composition concerns stay in `packages/web/src/types.ts`; the engine never sees `TrimSize` or `SpreadPlacement`.
- **Local-first.** No server, no account, no manuscript content leaves the browser. Drafts autosave to `folio.draft.v1` in localStorage; workspace prefs to `folio.prefs.v1`.

## Open decisions (genuinely undecided)

| Decision | Why blocked | Cost of choosing |
|---|---|---|
| ~~Tier 1 word list~~ — **SHIPPED 2026-06-15: Dale–Chall (1995) familiar words** (∪ Dolch/Fry sight words), 2,939 normalized entries from the MIT-packaged `words/dale-chall` | Done: `data/dale-chall.ts` (provenance + Feist rationale), `vocabulary/tiers.ts`, `tier1Coverage`/`tier2Words` populated, reach reason now `tier-2`, surfaced in editor + /paste + /guide, corpus bounds added | Resolved. Follow-ons: split tier-2 vs tier-3 (needs a wider frequency band) and stem-aware reach detection so "bunnies"/proper nouns stop counting (reason `morphologically-complex`) |
| Decodability calibration | First-cut formula `0.7 × phoneme_ease + 0.3 × syllable_ease` produces a mild inversion (Peter Rabbit 0.866 vs synthetic board book 0.854). Documented as engine choice in `ARCHITECTURE.md` open questions | Wait for more corpora across age bands to give calibration signal |
| Vowel acquisition norms | Crowe & McLeod (2020) covers consonants only. All 15 vowels currently default to age 3 | Candidates: Otomo & Stoel-Gammon (1992), Donegan (2013), longitudinal infant-speech corpus. One row of `cmu-phonemes.ts` to swap in |
| ~~Meter detection anacrusis~~ — **RESOLVED 2026-06-12** | Per-line template scoring (verse line = metrical unit, Attridge 1982) + one unstressed extrametrical pickup per line. Skipped syllable counts in the denominator → automatic penalty → offset-0 wins ties, so iambic/trochaic never re-ambiguate. Bonus fix: odd-length lines no longer phase-flip the stream | Done. All five corpus fixtures stayed inside their existing meterConsistency bands; the verse fixture (Owl & Pussycat) gained most (0.516 → 0.580) while prose barely moved |
| Reading Kit (clinical PDF export) | Strategic, not technical. External review framing: ship first, observe `/paste` vs `/` engagement, then decide | Half-day to first cut if SLP audience signals up |

## Things deliberately NOT done

Don't redo these without a reason:

- **Phone-mode responsiveness.** Tablet+ only. Floating selection toolbars and 340px tile minimums don't translate to phone screens. Documented in the tablet-responsiveness commit.
- **Vocabulary tier classification.** Shipped 2026-06-15 (Dale–Chall proxy — see resolved row above). Open follow-ons: tier-2/tier-3 split and stem-aware reach detection.
- **Dialogic-reading prompts.** Deferred per external review's "ship before adding more" advice.
- **OG image (PNG).** Current state: favicon + descriptive title + description in social previews. Needs a designed 1200×630 image; can't easily generate one programmatically.
- **In-line tooltips on highlighted reach words.** CSS Custom Highlight API paint layers don't accept hover events. The sidebar list already has tooltips; in-text would need mousemove + caretRangeFromPoint, deliberately deferred.
- **Per-client phoneme acquisition profiles (SLP).** Mentioned in `Coming soon` sidebar; deferred until real SLP feedback shapes the interface.

## The audience question (from external review)

The single most important next move is **not building**. It's seeing which audience shows up.

- If `/paste` engagement > `/`: clinical evaluation is the primary use case. Build toward **Reading Kit export** — a PDF that bundles the analysis, phoneme inventory, articulation view, and dialogic prompts for a session-prep document.
- If `/` engagement > `/paste`: authoring is the primary use case. Build toward **trope-template overlay** and **manuscript import**.

Both branches reuse the existing engine and data flow. The audience question decides which one earns the next half-day of work.

Plausible page views are loaded but no custom goals are wired. Adding `goal=analyze_clicked` (on `/paste`'s analyze button) and `goal=text_typed` (on `/`'s first input) takes ~10 min and would give a signal. Not necessary on day 1 — page-view ratio is a usable first proxy.

## Suggested next-move ladder (if user signal arrives)

1. **Watch.** Send the URL to a small set of SLPs and a small set of picture-book authors. Note which route they spend time on and what they say.
2. **Plausible goals.** Add `analyze_clicked` + `text_typed` events when ready to quantify.
3. **Reading Kit OR trope overlay** depending on signal.
4. **Tier 1 sourcing decision** if author-side signal warrants vocabulary tier work.
5. **Calibration pass** for decodability once there's enough corpus signal.

If no clear signal in two weeks: pick one and ship it anyway. The branches are reversible.

## Things worth manually testing

The user is doing this themselves; these are the items most likely to surface a real issue:

- **Print to PDF in Chrome and Safari**, with each body font selected. Does the chosen font embed in the PDF or fall back to default?
- **iPad landscape and portrait**, actual touch input. Floating selection toolbar behavior, scroll-snap in book view, soft hyphen / nbsp shortcut access.
- **Persistence across sessions.** Type a manuscript, change preferences, refresh, close browser, reopen.
- **`/paste` vs `/`** with the same content. The numbers should match exactly.
- **All three highlight layers** stacked on one word (reach-word + phoneme-match + find-current). Visual readability when the three overlap.
- **The "Guessed pronunciations" list** on a Lear or Potter sample. Are the words it surfaces actually the ones you'd want flagged?

## Dev loop

```bash
pnpm install
pnpm -r build        # build engine before downstream packages typecheck
pnpm typecheck       # all packages
pnpm test            # all packages (engine unit + corpus regression)
pnpm --filter @harmonic-systems/folio-web dev   # local at http://localhost:4321
```

CI runs `pnpm install --frozen-lockfile`, `pnpm -r build`, `pnpm typecheck`, `pnpm test` on every push and PR. Deploy runs the same build and uploads `packages/web/dist/` to GitHub Pages.

## Directory map

```
packages/
  engine/          @harmonic-systems/early-literacy — pure TS, browser-portable
    src/
      readability/   orchestrator
      vocabulary/    tokenize, sight-words (Dolch + Fry), tiers (Dale–Chall
                     Tier-1 proxy), reach-word detection
      phonology/     CMU dict, syllabify, phoneme inventory, decodability,
                     getWordPhonemes, isInCmuDict, getGuessedWords
      syntax/        segment (orthographic sentences w/ offsets), clauses
                     (Hunt-1965 lower bound), classify (4 types) — M5, shipped
      prosody/       meter + rhyme detection (Milestone 4, shipped)
      data/          CMU dict subset + phoneme metadata tables
    tests/
  cli/             folio analyze <file> — emits JSON ReadabilityProfile
  web/             Astro spread-first editor + paste + about pages
    src/
      pages/         index.astro (editor), paste.astro, about.astro
      components/    PageEditor.tsx — per-page Lexical React island
      types.ts       WebManuscript / WebSpread / PageContent / TrimSize / toEngineManuscript
    public/
      favicon.svg, CNAME (folio.harmonic-systems.org)
  corpus-tests/    Regression gate — walks corpora/*.meta.json against engine

corpora/           Public-domain + synthetic test fixtures + meta.json constraints
docs/
  AGENT_HANDOFF.md   this file
  decisions/         ADRs (0002 spread-first editing, 0003 spread-native engine API)
  linguistics/SOURCES.md   every cited source
ARCHITECTURE.md    Roadmap + module layout + open questions
CLAUDE.md          Per-repo Claude instructions (the integrity rules)
README.md          Project front door
```

## Git workflow

The multi-track parallel-agent phase is over. Current state:

- One branch: `main`. Push → CI runs → Deploy runs → live in ~1 minute.
- Commit messages explain the **why**, not just the what. See recent log for the established voice.
- Smaller commits review better than big ones; ship at logical breakpoints.
- For substantial new work, open a PR even when solo — gives a review surface.

## Voice & style

Keep the existing aesthetic. A reader should not be able to tell which agent wrote which file.

- **TypeScript:** ESM, strict mode (`noUncheckedIndexedAccess` is on), JSDoc on exported functions, no `any` without a `// TODO: type` comment.
- **Comments:** only when the WHY is non-obvious. Never write self-referential comments (`// added in track 1`, `// see PR #42`). Code rots, and so do those.
- **Markdown:** warm but not chatty. No emojis unless the user requests them. Use tables where they earn their keep; avoid bullet-heavy lists.
- **Errors and warnings:** match the existing tone in `readability/index.ts` — terse, specific, actionable.
- **Engine code is browser-portable.** Tests and CLI may use Node APIs. Web may use browser APIs.

## End of session

Leave the work reviewable:

- All tests passing (`pnpm test` at repo root)
- Typecheck clean (`pnpm typecheck` at repo root)
- Tree clean (no uncommitted half-finished files)
- Commit messages explain why each change was made
- If something is partial, say so explicitly in the commit — do not pretend it's done

The single most important thing you can do as a fresh agent: **be honest about what's shipped vs. what's aspirational**. Folio's whole value proposition is that it doesn't lie. Don't let the tool itself start lying about its own state.
