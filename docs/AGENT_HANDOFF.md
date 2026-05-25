# Agent Handoff

This repo sometimes runs two Claude Code sessions in parallel, each in its own git worktree, each owning a specific track of work. This doc is the rules of the road so a fresh agent can read it cold and stay in its lane.

If you are starting a fresh session in a worktree, read this first.

## Current parallel session

Two tracks are in flight. Decide which you are before doing anything else — your branch name tells you (`phonology-engine` → Track 1, `web-and-corpus` → Track 2).

### Track 1 — Engine: Phonology

**Goal:** complete enough of Milestone 2 to expose phoneme inventory, syllable type breakdown, average syllables per word, and a first-cut decodability score for English children's text.

**Owns:**
- `packages/engine/src/phonology/` — all files, new and existing
- `packages/engine/src/data/cmu-*.ts` — vendored CMU Pronouncing Dictionary subset and any phoneme-norm tables (Crowe & McLeod 2020)
- May extend `PhonologyProfile` in `packages/engine/src/types.ts` if needed — and only `PhonologyProfile`. No other type changes.
- May add tests under `packages/engine/tests/phonology*.test.ts` and `packages/engine/tests/cmu*.test.ts`
- Wires the new module into `packages/engine/src/readability/index.ts` as the **last** step of the track, after phonology is internally complete.

**Cannot touch:** `packages/web/`, `corpora/`, `packages/engine/src/vocabulary|syntax|prosody/`, the engine barrel beyond adding a `analyzePhonology` export.

### Track 2 — Web alpha + Corpus

**Goal:** ship a working web prototype users can paste a manuscript into and see a real readability profile, using the vocabulary engine that already exists.

**Owns:**
- `packages/web/` — replace the placeholder with a real paste-and-analyze UI. Calls into `@harmonic-systems/early-literacy` via the engine's existing public API. Renders word count vs. target, sight-word coverage, TTR, reach words, and warnings.
- `corpora/` — add 1–2 new fixtures (e.g., a public-domain excerpt of Beatrix Potter, *The Tale of Peter Rabbit*, 1902; one more synthetic fixture for a different age band). Each new `.txt` ships with a sibling `.meta.json` per the format in `corpora/README.md`.
- May add docs in `docs/` related to the web UI or corpus methodology.

**Cannot touch:** `packages/engine/src/`, `packages/engine/src/data/`, `packages/cli/`, `packages/engine/src/types.ts`. Track 2 consumes the engine; it does not modify it.

## Hard boundaries

| Path | Track 1 | Track 2 |
|---|---|---|
| `packages/engine/src/phonology/` | owns | off-limits |
| `packages/engine/src/data/` | adds CMU & phoneme files | off-limits |
| `packages/engine/src/types.ts` | `PhonologyProfile` only | off-limits |
| `packages/engine/src/readability/index.ts` | wires in phonology last | off-limits |
| `packages/engine/src/index.ts` (barrel) | adds `analyzePhonology` export | off-limits |
| `packages/engine/src/vocabulary|syntax|prosody/` | off-limits | off-limits |
| `packages/web/` | off-limits | owns |
| `corpora/` | off-limits | owns |
| `package.json` (root), `pnpm-workspace.yaml`, `.github/workflows/` | coordinate via main thread | coordinate via main thread |

"Coordinate via main thread" means: do not edit without checking with the human running the main Claude Code session. These files affect both tracks.

## Shared contracts — do not break these

- **`types.ts` is the integration point.** Track 1 may extend `PhonologyProfile`. No other type changes by either track. If a change here would help your track, propose it in your commit message and stop short of merging — flag the human.
- **Citation discipline.** Every linguistic claim must trace to an entry in `docs/linguistics/SOURCES.md`, or be removed. No new norms, thresholds, or word lists without a corresponding citation. This applies equally to Track 1's phoneme-acquisition norms and Track 2's corpus fixture meta.json constraints (a constraint like "F&P level X" needs a source).
- **Engine portability.** No Node-only APIs in `packages/engine/src/`. File IO lives in CLI, tests, or web. Data files are TypeScript modules under `src/data/`, not JSON read from disk.
- **No LLM-generated manuscript text.** Per `CLAUDE.md`. The engine measures; it does not author. This applies to corpus fixtures too — synthetic fixtures are *human-authored test stand-ins*, written deliberately, not generated.

## Workflow

1. **Confirm your branch first.** `git branch --show-current`. If you are on `main`, stop — you are in the wrong worktree.
2. **Commit at logical breakpoints**, not at the end of the whole track. Smaller commits review better and revert cleaner.
3. **Do not push to `main`.** Push to your own branch: `git push -u origin <your-branch>`.
4. **Do not merge or rebase against `main` mid-track** unless the human asks you to. The whole point of the worktree is independence.
5. **When the track is done**, open a PR (`gh pr create`) and wait for review. Do not auto-merge.
6. **Run `pnpm typecheck` and `pnpm test` from the repo root before each commit.** A green tree is a soft contract.

## If you have to leave your lane

If completing your track *requires* touching a file outside your ownership column, **stop and ask the human**. Do not silently expand scope. Lane expansion is exactly the cause of merge pain that worktrees are supposed to prevent. The human will either grant a one-time exception, re-scope the track, or coordinate with the other agent.

## Voice and style

Keep the existing aesthetic — readers should not be able to tell the two tracks were written by different agents.

- **TypeScript:** ESM, strict mode, JSDoc on exported functions, no `any` without a `// TODO: type` comment.
- **Comments:** only when the WHY is non-obvious. Never write self-referential comments (`// added in track 1`, `// see PR #42`). Code rots, and so do those.
- **Markdown:** warm but not chatty. No emojis unless the user requests them. Use tables where they earn their keep; avoid bullet-heavy lists.
- **Errors and warnings:** match the existing tone in `readability/index.ts` — terse, specific, actionable.
- **Engine code is browser-portable.** Tests and CLI may use Node APIs. Web may use browser APIs.

## End of session

Leave the work reviewable:

- All tests passing (`pnpm test` at repo root)
- Typecheck clean (`pnpm typecheck` at repo root)
- Tree clean (no uncommitted half-finished files)
- A PR open against `main` with a clear summary of what changed
- If the track is incomplete, say so explicitly in the PR description — do not pretend it's done

The human running the main session will review, merge, and clean up the worktree.
