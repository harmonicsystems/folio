# ADR 0010 — One job per surface: digest inspector, canvas-local view toggle

Status: Accepted 2026-07-12
Deciders: David Nyman (variant choice + the mirror principle below)

## Context

The studio-dashboard sequence (ADRs 0005–0008) shipped its slices faithfully, and the
finished whole exposed a redundancy the staging had hidden: **three arrangements of the
same five panels** (tabs one-at-a-time, Analyze all-at-once, modes one-focused), the
Phonics tab duplicating Phonology mode, and a Grid/Book toggle dangling in the context
bar while Analyze hid the canvas it controls.

A throwaway prototype (`docs/prototypes/ui-consolidation.html`, built on the real board
demo fixture) compared two resolutions for the Write inspector: **A** — the tabs dissolve
into a single glanceable digest with cross-links into the modes; **B** — the tab strip
shrinks to Length | Issues. David chose **A**.

The organizing principle, in David's words: on the surface it's a simple text editor, but
**the mirror should be a reflection of the shape of the story without judgement — the
packaged expertise of someone who sees language as its individual ingredients.** That
principle (ADR 0009's two registers, made concrete) is what assigns each surface one job.

## Decision

Each surface gets exactly one job:

| Surface | Job |
|---|---|
| **Rail** | The only navigation. Write / Analyze / Phonology / Prosody. |
| **Write digest** | The glance: hero word count + target, sight coverage, decodability, reach count, rhyme scheme, meter — each deep item cross-linking into its mode — followed by **Verdicts**. |
| **Verdicts** (was "Issues") | The hard-constraint register only: publishing mechanics, pass/fail, welcome to judge. |
| **Phonology / Prosody modes** | The mirror: canvas stays editable; the panel *describes* the ingredient (phoneme inventory today, distribution + meter shape as the ADR 0009 readouts land). Never a verdict. |
| **Analyze** | The whole manuscript at once — all full panels as report cards, unchanged concept. |
| **Canvas header** | Grid/Book lives here, with its referent — present wherever spreads render, absent in Analyze. |

Implementation shape:

- **The tab strip is deleted**, with its ARIA tabs machinery (TAB_ORDER keyboard nav,
  roving tabindex, `currentTab`). The five full panels stay — they are the Analyze report
  cards and the mode panels — and become static `role="region"` + `aria-label` (the
  tabpanel role had no tablist left to belong to; the ADR 0007/0008 role-swap code
  dissolves with it).
- **A new digest panel** is additive: it carries its own `dg-*` element ids and the render
  functions write both the full-panel elements and the digest values (a few extra
  `setText`-style lines each — same pattern as slice 1's hero additions). Nothing about
  the existing panels' ids or renders changes, so Analyze and the modes are untouched.
- **Write mode aside = digest + Verdicts panel** stacked. Analyze reparents the five full
  panels exactly as before; the digest stays home (hidden with the workspace).
- **Grid/Book toggle**: the same DOM elements (ids, listeners, MutationObserver travel)
  move from the context bar into a canvas header row; the workspace grid gains an `auto`
  header row with the sidebar spanning both rows.
- The Issues count badge dies with the tab strip; the failing-verdict count is visible in
  the digest's Verdicts section directly.
- Palette, prefs v2, find bar, book-view state capture: unchanged.

- **Pre-commit review corrections (3 fixed before ship):** the explicit workspace grid rows
  left a phantom row-1 track when the onboarding card is hidden (i.e. every returning
  visit) — grid gutters don't collapse around zero-height explicit tracks, so a permanent
  ~1.5rem dead band sat above the canvas header; row-gap is now 0 with margins carrying the
  vertical rhythm. The Verdicts heading's `.panel-title` rule lost every property to the
  pre-existing `.sidebar h3` on specificity (rendering taupe, below AA — the exact failure
  the callout-ink token exists to avoid) — the rule is now `.inspector-panel .panel-title`.
  And the palette's "Switch to Book/Grid view" command, run from Analyze, flipped a control
  that is now hidden with the canvas — it drops to Write first, same as `openFindBar`.

## Consequences / watch items

- The digest's `dg-*` values are a second write-target for renders — a render fn that
  updates a full panel but forgets the digest shows stale glance data. The additions are
  colocated with the canonical `setText` calls to keep them in the same edit path.
- The Vocab deep detail (tier coverage, TTR, unique words, reach list) now surfaces only
  in Analyze. If reach-word *lists* prove wanted while writing, they cross-link from the
  digest's reach row into Phonology mode (where the words are highlighted in context) —
  watch for the signal before adding chrome back.
- Warning copy is not yet neutral-register audited (ADR 0009 backlog); renaming the panel
  to "Verdicts" sharpens the promise the copy must grow into.
- `/guide` describes the tabbed inspector (a parallel session is refreshing it against
  slices 1–4); it will need one more pass once this lands.
- The prototype file stays in `docs/prototypes/` as the design record.
