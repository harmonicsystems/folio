# ADR 0008 — Phonology + Prosody modes (studio dashboard, slice 4)

Status: Accepted 2026-07-11
Deciders: David Nyman (design handoff + slice sequencing)

## Context

Final slice of the studio-dashboard handoff (design 1c; slices 1–3 = ADRs 0005–0007). The rail
gains its last two task modes. Per the handoff's mode-semantics table, both are **focused,
still-editable** modes — unlike Analyze, the spread canvas stays live; only the inspector
changes shape: Phonology shows the phoneme inventory expanded, Prosody shows meter/rhyme with
per-line detail when available.

## Decision

- **Focused modes are inspector arrangements, not new surfaces.** `body[data-mode='phonology'
  |'prosody']` hides the tab strip (rules placed after the `.inspector-tabs` base rules — the
  source-order discipline this file now enforces by habit) and `setMode` shows exactly one
  panel. No reparenting: the panels stay in the aside; only Analyze moves them.
- **Phonology = the Phonics panel, expanded.** On entry, every `details` in the panel is forced
  open (phonemes by age, by manner, syllable shapes, guessed pronunciations — the spec's
  "inventory expanded"); the user can re-collapse, we only force on entry. Phoneme chips keep
  their existing click-to-highlight behavior — that is the point of the mode: click a phoneme,
  see it tinted in the still-editable manuscript.
- **Prosody gets its own panel** (`#panel-prosody`, `role="region"`, ships hidden): the three
  metric rows move here from their slice-1 "temporary home" at the bottom of the Phonics tab
  (ids verbatim — the render functions don't know they moved), plus a new **Line endings**
  section pairing each manuscript line with its rhyme letter.
- **Per-line rhyme detail is client-side pairing, no engine change.** The engine's
  `detectRhymeScheme` emits exactly one letter per non-empty trimmed line (`-` for lines whose
  last word has no rhyme phoneme) over the `'\n\n'`-joined spread text; `renderProsodyLines`
  splits the identical string the identical way, so letters align index-for-index. It renders
  only when `scheme.length === lines.length` (defense; both sides derive from the same string)
  and shows an honest empty state otherwise. Verified live: a typed quatrain (mat/hat/high/sky)
  renders A/A/B/C beside the right lines. Note: Lexical paragraphs serialize with line breaks,
  so *typed* multi-line verse gets per-line letters; the bundled samples were flattened to
  prose-per-spread when authored and legitimately show no scheme (pre-existing sample-data
  shape, not a rendering gap).
- **panel-prosody is not a tab.** The tab strip stays four tabs; the panel appears only in
  Prosody mode and as a fifth card in the Analyze report (the spec's report includes "prosody
  summaries"). It carries `role="region"` + `aria-label` statically, `data-panel-title` for the
  report card, `tabindex="0"` for keyboard reach.
- **Orphaned-tabpanel rule generalized from ADR 0007**: whenever a panel is visible without a
  visible tablist (Analyze's report *and* Phonology's focused panel), it presents as
  `role="region"`; the write branch restores `tabpanel`.
- **State**: `EditorMode` is the four-value union prefs v2 was shaped for (no version bump);
  `MODE_SET` + an `isEditorMode` guard validate every read (body attribute, stored prefs, rail
  `data-mode-set`). The palette's Go-to-mode commands became a loop over the set, keeping the
  `current` hint and the focus-the-rail-button pattern from ADR 0007.
- Book-view invariants carry over unchanged: the arrow-key guard and scroll capture remain
  Analyze-only (the workspace is visible in the focused modes), and leaving Analyze into *any*
  editable mode restores the captured spread. The capture is additionally guarded on
  `prev !== 'analyze'` — re-entering Analyze (palette) would otherwise clobber the saved index
  with 0 read from the hidden surface.

- **Pre-commit review corrections (3 fixed before ship):** the rail click handler still carried
  slice 3's analyze-else-write mapping, so the two new buttons silently fell through to Write
  (caught in live verification — the buttons "worked" visually because Write is a valid state);
  re-activating the already-current Phonology mode (rail re-click, palette) re-ran the
  force-open and wiped the user's collapse state — now guarded on `prev !== 'phonology'` to
  match the stated entry-only intent; and the muted `-` rhyme marker used taupe at 12px
  (4.08:1, below AA) — swapped to `--callout-ink`, the same substitution this file already
  makes at that size class. The review also attempted the orphaned-tabpanel claim against
  Phonology mode and refuted it — the role swap generalized from ADR 0007 was already in place.

## Consequences / watch items

- Find & replace works normally in the focused modes (editors visible); only Analyze closes /
  redirects it. If a future mode hides the workspace, it must copy Analyze's two find-bar
  guards.
- The forced-open details on Phonology entry re-run on every entry — deliberate (the mode's
  promise is "expanded"), but it means a user who collapses a group and round-trips modes sees
  it open again.
- The rail is at six items (four modes + logo + settings). The handoff designed for exactly
  this; anything beyond it should revisit the rail's information density.
- The studio-dashboard sequence is complete: slices 1–4 shipped, each behind its own ADR
  (0005–0008).
