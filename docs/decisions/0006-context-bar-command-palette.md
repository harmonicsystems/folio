# ADR 0006 — Context bar + ⌘K command palette (studio dashboard, slice 2)

Status: Accepted 2026-07-11
Deciders: David Nyman (design handoff + slice sequencing)

## Context

Slice 2 of the studio-dashboard handoff (design 1c; slice 1 = the tabbed inspector, ADR 0005).
The old topbar carried nine controls; the design splits them by frequency: document identity
(age band, trim, body font) stays visible as chips, everything rarer moves into a ⌘K command
palette, and the topbar becomes a slim context bar.

## Decision

- **Context bar** replaces the topbar: brand + static "Untitled manuscript" title (inline editing
  is out of scope per the handoff) + three chips; right side keeps the saved indicator (aria-live
  preserved), the Grid/Book toggle (unchanged ids/behavior), the sidebar toggle (**temporary** —
  slice 3 removes it with the mode rail), and the ⌘K button.
- **Chips are launchers, not new controls.** The same `<select>` elements (`age-band`,
  `trim-size`, `body-font`) live inside anchored popovers, so every existing change listener
  (trim aspect, body font + prefs save, analysis re-run) is untouched. Chip labels sync from the
  select's selected option; popovers close on outside click, Escape, or selection.
- **Palette commands act through existing code paths**: samples via a new `requestLoadSample()`
  (the extracted overwrite-confirm), export via `downloadManuscript()`/`window.print()`, layout
  via `applyLayoutPreset()`, age/trim/font by setting the real selects and dispatching `change`,
  view toggle by clicking the real buttons, find via `openFindBar()`, About via the existing
  dialog. No behavior forked.
- **Reset is palette-only with an in-palette two-step confirm** (spec requirement): first
  activation swaps the row to an explicit rust confirm label; only a second activation runs the
  extracted `performReset()`. The old `window.confirm` was removed along with the topbar button —
  the palette's two-step is the confirm.
- **Removed from the DOM**: the layout/sample/export selects, the reset button, and the "?"
  About button (About lives in the palette). Their listeners were removed or extracted; the
  `about-btn` CSS block was deleted.
- Palette is a native `<dialog>` (same pattern as About): Escape closes, backdrop click closes,
  focus returns to the previously focused element on close. The input is 16px (iOS zoom floor).
  Filtering is substring-on-label+hint; ArrowUp/Down with wrap, Enter activates.
- **Responsive** (≤900px): the title and the trim/font chips hide; the palette (⌘K button)
  carries those settings — the "…" overflow affordance from the spec is the palette itself.
- Print hide list: `.topbar` replaced by `.context-bar`, plus `.cmdk` and `.cb-popover`.

- **Pre-commit review corrections (11 findings, all fixed before ship):** the palette's manual
  focus-restore fought native `<dialog>` close behavior and ran in the queued close event — after
  the command — stealing focus from the find bar so typed search text landed in the manuscript;
  removed entirely (native close() restores focus synchronously). Sample loads now sync the
  age-band chip (programmatic `.value` writes fire no change event). The palette is a proper
  combobox (role, `aria-activedescendant`, option ids, empty state outside the listbox). The
  two-step Reset ignores key auto-repeat, and clicking a row syncs the active option + refocuses
  the input so click-then-Enter targets the same command. Chip popovers no longer close on
  `change` (Windows/Linux fire it per arrow step on closed selects) and Escape returns focus to
  the chip instead of stranding it on `<body>`. ⌘K refuses to stack on an open modal, and on
  macOS the binding is Cmd-only so native Ctrl+K kill-to-end-of-line keeps working in the
  editors. Dead `.control button` CSS pruned.

## Consequences / watch items

- Cmd/Ctrl+K is now bound globally (preventDefault); it toggles the palette. No prior binding
  existed.
- The `hint: 'current'` marker on the selected age/trim/font command is minimal state exposure;
  richer grouping/sections in the palette are possible later without structural change.
- Keyboard-only and screen-reader access to age/trim/font now has two routes (chip popover,
  palette). The chips carry `aria-haspopup`/`aria-expanded`.
- Slice 3 (mode rail) removes the sidebar toggle + status bar and lands prefs v2.
