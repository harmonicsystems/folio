# Agent Handoff

This repo sometimes runs two Claude Code sessions in parallel, each in its own git worktree, each owning a specific track of work. This doc is the rules of the road so a fresh agent can read it cold and stay in its lane.

If you are starting a fresh session in a worktree, read this first.

## Current parallel session

One track is in flight. Confirm by branch name (`spread-editor`) before doing anything else.

Earlier tracks — phonology (Track 1) and web alpha + corpus (Track 2) — landed on `main` as commits `b5c67fe..23cfc22`. Their sections have been removed per the lifecycle convention below; consult `git log` for the history.

### Track 3 — Spread-First Editor

**Status:** In flight, pre-work only. A throwaway visual prototype exists at `prototypes/spread-editor/` and can be iterated on freely. Production work in `packages/web/` is gated on the open questions below — the spec proposes engine-API changes that need ADRs ratified before code lands.

**Goal:** ship the spread-first editor — 16 spread tiles with per-spread placement zones, in-context reach-word decoration, and a live readability sidebar driven by `analyze()`. Replaces the paste-and-analyze UI in `packages/web/src/pages/index.astro` as the primary editor surface once it reaches parity.

**Owns:**
- `packages/web/` — sole owner.
- `prototypes/spread-editor/` — delete when the production editor reaches feature parity.
- `docs/decisions/0002-spread-first-editing.md` and `docs/decisions/0003-spread-native-engine-api.md` — to be written.
- `packages/engine/src/types.ts` — only the extensions ratified by ADR 0003 (e.g., `SpreadProfile`, optional `perSpread` on `ReadabilityProfile`). No other type changes.
- Engine module signatures changed per ADR 0003.

**Cannot touch:** `packages/engine/src/phonology|vocabulary|syntax|prosody/`, `packages/engine/src/data/`, `packages/cli/`, `packages/corpus-tests/`, `corpora/`.

**Open questions blocking production start (need human decisions):**
1. Do `TrimSize` and `SpreadPlacement` live on the engine's `Manuscript`/`Spread`, or on a web-side wrapper type? (Recommendation: wrapper — the engine measures, composition is the UI's job.)
2. Does `analyze()` return `perSpread: SpreadProfile[]`, or does the web filter the manuscript-level profile? (Recommendation: engine returns; filtering on the web duplicates internal engine logic.)
3. Are per-spread word-count targets a cited norm or a descriptive heuristic? (Recommendation: heuristic — picture books distribute words unevenly by design.)
4. Editor library for caret-safe reach-word decoration: Lexical, TipTap, ProseMirror, or roll our own controlled `contentEditable`? (Recommendation: Lexical.)

## Hard boundaries

| Path | Track 3 |
|---|---|
| `packages/web/` | owns |
| `prototypes/` | owns |
| `docs/decisions/0002-*.md`, `0003-*.md` | owns (to be written) |
| `packages/engine/src/types.ts` | extends per ADR 0003 only |
| `packages/engine/src/readability/index.ts` | may change `analyze()` signature per ADR 0003 |
| `packages/engine/src/phonology|vocabulary|syntax|prosody/` | off-limits |
| `packages/engine/src/data/` | off-limits |
| `packages/engine/src/index.ts` (barrel) | coordinate via main thread |
| `packages/cli/`, `packages/corpus-tests/` | off-limits |
| `corpora/` | off-limits |
| `package.json` (root), `pnpm-workspace.yaml`, `.github/workflows/` | coordinate via main thread |

"Coordinate via main thread" means: do not edit without checking with the human running the main Claude Code session. These files affect downstream consumers.

## Shared contracts — do not break these

- **`types.ts` is the integration point.** Track 3 may extend it only with changes ratified by ADR 0003. Any other type change needs a new ADR and human sign-off — propose it, do not merge it. Downstream consumers (`packages/cli/`, `packages/web/`, `packages/corpus-tests/`) all depend on the surface staying stable.
- **Citation discipline.** Every linguistic claim must trace to an entry in `docs/linguistics/SOURCES.md`, or be removed. No new norms, thresholds, or word lists without a corresponding citation. Phoneme-acquisition norms, vocabulary tiers, prosody templates, corpus fixture constraints — all the same rule.
- **Engine portability.** No Node-only APIs in `packages/engine/src/`. File IO lives in CLI, tests, or web. Data files are TypeScript modules under `src/data/`, not JSON read from disk.
- **No LLM-generated manuscript text.** Per `CLAUDE.md`. The engine measures; it does not author. This applies to corpus fixtures too — synthetic fixtures are *human-authored test stand-ins*, written deliberately, not generated.

## Workflow

1. **Confirm your branch first.** `git branch --show-current`. If you are on `main`, stop — you are in the wrong worktree.
2. **Commit at logical breakpoints**, not at the end of the whole track. Smaller commits review better and revert cleaner.
3. **Do not push to `main`.** Push to your own branch: `git push -u origin <your-branch>`.
4. **Do not merge or rebase against `main` mid-track** unless the human asks you to. The whole point of the worktree is independence.
5. **When the track is done**, open a PR (`gh pr create`) and wait for review. Do not auto-merge.
6. **Run `pnpm typecheck` and `pnpm test` from the repo root before each commit.** A green tree is a soft contract.

## Track lifecycle

Tracks are **queued**, **in flight**, or **landed**. When a track lands on `main`, remove its section *and* its boundaries-table column in the same commit — this doc is for current parallel work, not history. Use git for history.

A queued track stays queued until its blockers clear. The first agent to start work flips the status to in-flight in the same commit as their first real change.

## If you have to leave your lane

If completing your track *requires* touching a file outside your ownership column, **stop and ask the human**. Do not silently expand scope. Lane expansion is exactly the cause of merge pain that worktrees are supposed to prevent. The human will either grant a one-time exception, re-scope the track, or coordinate with the other agent.

## Voice and style

Keep the existing aesthetic — readers should not be able to tell which agent wrote which file.

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
