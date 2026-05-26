# Agent Handoff

This repo runs up to three Claude Code sessions in parallel, each in its own git worktree, each owning a specific lane of work. This doc is the rules of the road so a fresh agent can read it cold and stay in its lane.

If you are starting a fresh session in a worktree, read this first.

## In flight

Each agent updates its own line at the **start** of a session ("picking up X") and at the **end** ("merged Y" / "paused on Z"). The next agent reads this section before doing anything else — it's the only durable signal that another track is in motion.

Format: `**Lane** (`<branch>` in `<worktree>`): status — last touched YYYY-MM-DD`

- **Engine** (`phonology-engine`): idle — Milestone 2 first cut merged 2026-05-25
- **Web + Corpus** (`web-and-corpus`): idle — paste-and-analyze alpha + 5-fixture corpus + validator merged 2026-05-25
- **Design** (`design`): idle — lane not yet started

If your status is anything other than "idle," name the files you are actively editing so the next agent knows what to avoid.

## Lanes

Three persistent lanes. Pick yours by branch name before doing anything else — if your branch doesn't match one of these, stop and ask the human.

### Engine — `phonology-engine` (and successor branches for syntax, prosody)

**Owns:**
- `packages/engine/src/` — all engine internals (phonology, vocabulary, syntax, prosody, readability, data tables)
- `packages/engine/src/types.ts` — the public type contract. Extend with care; new fields should not break existing consumers.
- `packages/engine/tests/` — engine unit tests
- `packages/cli/` — the CLI is the engine's first user; engine and CLI ship together
- The engine barrel (`packages/engine/src/index.ts`) — add exports as new analyzers land

**Cannot touch:** `packages/web/`, `packages/corpus-tests/`, `corpora/`, `design/`.

### Web + Corpus — `web-and-corpus`

**Owns:**
- `packages/web/` — the Astro alpha. Consumes the engine via its existing public API; never reaches into engine internals.
- `packages/corpus-tests/` — the constraint validator. Reads every `corpora/<slug>.meta.json` and asserts engine output against the declared `expected` bounds.
- `corpora/` — fixtures and their `.meta.json` siblings
- May add docs under `docs/` related to the web UI, corpus methodology, or web-side architecture

**Cannot touch:** `packages/engine/src/`, `packages/engine/tests/`, `packages/cli/`, `design/`.

Design tokens consumed by the web alpha must come from `design/tokens.ts` (read-only). Do not redefine colors, spacing, or type in the web package.

### Design — `design`

**Owns:**
- `design/` — mockups, exports, source files (SVG/PDF/PNG), reference imagery
- `design/tokens.ts` — the **only** file that flows from Design into code. Colors, type scales, spacing, motion. Code lanes import from this; nothing else in `design/` is consumed at build time.
- `docs/design/` — design rationale, system documentation, accessibility notes

**Cannot touch:** `packages/`, `corpora/`. Design proposes; engineering integrates.

If a token change in `design/tokens.ts` requires a code change in `packages/web/` to take effect, Design opens a PR with the token update only and flags the required code change in the PR description. The Web lane picks it up in a follow-on PR.

## Hard boundaries

| Path | Engine | Web + Corpus | Design |
|---|---|---|---|
| `packages/engine/src/` | owns | off-limits | off-limits |
| `packages/engine/tests/` | owns | off-limits | off-limits |
| `packages/engine/src/types.ts` | owns (extend carefully) | off-limits | off-limits |
| `packages/cli/` | owns | off-limits | off-limits |
| `packages/web/` | off-limits | owns | off-limits |
| `packages/corpus-tests/` | off-limits | owns | off-limits |
| `corpora/` | off-limits | owns | off-limits |
| `design/` (everything except `tokens.ts`) | off-limits | off-limits | owns |
| `design/tokens.ts` | off-limits | reads only | owns |
| `docs/AGENT_HANDOFF.md` | coordinate via main thread | coordinate via main thread | coordinate via main thread |
| `ARCHITECTURE.md`, `README.md` (root) | coordinate via main thread | coordinate via main thread | coordinate via main thread |
| `package.json` (root), `pnpm-workspace.yaml`, `.github/workflows/` | coordinate via main thread | coordinate via main thread | coordinate via main thread |

"Coordinate via main thread" means: do not edit without checking with the human running the main Claude Code session. These files affect multiple lanes.

When two lanes both want to edit a coordinate-via-main-thread file in the same session (e.g., flipping roadmap boxes in ARCHITECTURE.md), the second lane waits for the first lane's PR to land before opening theirs. Track 1 did this for Track 2's PR in the 2026-05-25 session — it works.

## Shared contracts — do not break these

- **`types.ts` is the integration point.** Only the Engine lane edits it. Other lanes consume the public surface. If a type change would help your lane, propose it in a PR description and flag the human; do not silently reshape the contract.
- **Citation discipline.** Every linguistic claim must trace to an entry in `docs/linguistics/SOURCES.md`, or be removed. No new norms, thresholds, or word lists without a corresponding citation. This applies to phoneme-acquisition norms, corpus `.meta.json` constraints (a claim like "F&P level X" needs a source), and any developmental claim baked into design copy.
- **Engine portability.** No Node-only APIs in `packages/engine/src/`. File IO lives in CLI, tests, or web. Data files are TypeScript modules under `src/data/`, not JSON read from disk.
- **No LLM-generated manuscript text.** Per `CLAUDE.md`. The engine measures; it does not author. Corpus fixtures must be human-authored or verbatim public-domain — synthetic fixtures are deliberate stand-ins, not generations.
- **Design tokens are one-way.** Code imports from `design/tokens.ts`; code never edits it. If a token doesn't fit, the Web lane raises it and Design ships the change.

## Workflow

1. **Confirm your branch first.** `git branch --show-current`. If you are on `main` or a branch that doesn't match one of the three lanes, stop — you are in the wrong worktree.
2. **Read the In flight section.** If another lane is mid-session on a file you were planning to touch, pause and check with the human before proceeding.
3. **Update your own In flight line** at the start of the session — flip "idle" to a one-line description of what you're picking up.
4. **Commit at logical breakpoints**, not at the end of the whole track. Smaller commits review better and revert cleaner.
5. **Do not push to `main`.** Push to your own branch: `git push -u origin <your-branch>`.
6. **Do not merge or rebase against `main` mid-session** unless the human asks you to. The whole point of the worktree is independence.
7. **When the work is done**, open a PR (`gh pr create`) and wait for review. Do not auto-merge. Update your In flight line.
8. **Run `pnpm typecheck` and `pnpm test` from the repo root before each commit.** A green tree is a soft contract.

## If you have to leave your lane

If completing your work *requires* touching a file outside your ownership column, **stop and ask the human**. Do not silently expand scope. Lane expansion is exactly the cause of merge pain that worktrees are supposed to prevent. The human will either grant a one-time exception, re-scope the work, or coordinate with the other agent(s).

## Voice and style

Keep the existing aesthetic — readers should not be able to tell the lanes were written by different agents.

- **TypeScript:** ESM, strict mode, JSDoc on exported functions, no `any` without a `// TODO: type` comment.
- **Comments:** only when the WHY is non-obvious. Never write self-referential comments (`// added in track 1`, `// see PR #42`). Code rots, and so do those.
- **Markdown:** warm but not chatty. No emojis unless the user requests them. Use tables where they earn their keep; avoid bullet-heavy lists.
- **Errors and warnings:** match the existing tone in `readability/index.ts` — terse, specific, actionable.
- **Design copy:** the warm, low-stimulation Harmonic Systems voice. Cream/taupe palette in the web alpha is the visual anchor.
- **Engine code is browser-portable.** Tests and CLI may use Node APIs. Web may use browser APIs.

## End of session

Leave the work reviewable:

- All tests passing (`pnpm test` at repo root)
- Typecheck clean (`pnpm typecheck` at repo root)
- Tree clean (no uncommitted half-finished files)
- A PR open against `main` with a clear summary of what changed
- Your In flight line updated — flip back to "idle" if the work is wrapped, or to "paused on X" if not
- If the work is incomplete, say so explicitly in the PR description — do not pretend it's done

The human running the main session will review, merge, and clean up the worktree.
