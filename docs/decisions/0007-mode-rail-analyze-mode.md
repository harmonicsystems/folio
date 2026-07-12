# ADR 0007 — Mode rail + Analyze mode + prefs v2 (studio dashboard, slice 3)

Status: Accepted 2026-07-11
Deciders: David Nyman (design handoff + slice sequencing)

## Context

Slice 3 of the studio-dashboard handoff (design 1c; slice 1 = tabbed inspector ADR 0005,
slice 2 = context bar + ⌘K palette ADR 0006). The design adds a fixed 76px ink-colored mode
rail on the left with task modes. This slice ships two of the four modes — **Write** (the
existing spread editor) and **Analyze** (a whole-manuscript report) — plus a Settings button,
and retires the two pieces of chrome the rail replaces: the bottom status bar and the sidebar
Hide/Show toggle. Phonology and Prosody modes are slice 4.

## Decision

- **Analyze mode REPARENTS the four inspector panels** into a `#analyze-report` grid
  (`auto-fit, minmax(320px, 1fr)`) instead of duplicating markup: element-bound listeners
  (phoneme chips on `#phoneme-by-age`/`#phoneme-by-manner`, details toggles) travel with their
  nodes, every id stays unique, and all seven render functions keep working with zero changes —
  analysis passes render into the panels wherever they currently live. Returning to Write
  appends the panels back into the aside and re-applies the remembered `currentTab`. Report
  cards get visual titles via `::before { content: attr(data-panel-title) }`; accessible names
  still come from the existing `aria-labelledby` (accname resolves display:none targets).
- **The status bar is deleted** (markup, CSS, `updateStatusBar`, its runAnalysis call): every
  value it showed lives in the inspector (hero word count, sight coverage, decodability,
  Issues badge), and Analyze mode is now the "whole manuscript at a glance" surface. The
  sidebar toggle + `body.sidebar-collapsed` are likewise gone — the rail's modes replace
  hide-the-sidebar as the way to change what you're looking at.
- **prefs v2** (`folio.prefs.v2`): `{version: 2, bodyFont?, viewMode?, mode?: 'write'|'analyze'}`.
  Loading migrates v1 (font + view carried forward; `sidebarCollapsed` dropped — no equivalent
  exists) and the first v2 write removes the v1 key. The restored mode is **stashed and applied
  after the tab machinery initializes** — `setMode` reads the `TAB_ORDER` const, which is in
  its temporal dead zone when the early prefs-restore block runs.
- **Mode intersections** (each one a real interaction, decided not discovered):
  - *Book view chrome*: the nav arrows / spread counter hide in Analyze even while
    `body.book-mode` is set. Same specificity as `body.book-mode … { display: flex }`, so the
    hide rules are placed **after** them in source — this file's third source-order collision;
    the comment at the rule says why it lives there.
  - *Book arrow keys*: the ←/→ spread navigation keydown returns early in Analyze (it would
    scroll an invisible surface and swallow arrow keys).
  - *Find & replace*: `openFindBar()` drops back to Write first — find operates on the editors,
    and walking matches inside a hidden workspace is meaningless. Cmd+F is therefore also a
    keyboard route out of Analyze.
  - *Print*: `.mode-rail`/`.analyze-report` join the print hide list, `body { padding-left: 0 }`,
    and `.workspace { display: block !important }` so printing from Analyze mode still yields
    the manuscript spreads, not an empty page.
- **Settings rail button opens the ⌘K palette** rather than a new popover — the palette already
  carries trim/font/layout/export; a second surface would duplicate it (`aria-label` says so).
  The palette gains two `Go to mode` commands with the `current` hint marker, so modes are
  keyboard-reachable without the pointer.
- `<body data-mode="write">` is set statically in markup — CSS keys off
  `body[data-mode='analyze']` only, so first paint is Write with no flash, and `savePrefs`
  can always read the attribute.
- **Responsive**: ≤900px hides the rail labels (icons remain, 44px targets); the rail keeps its
  76px column at all widths this slice — the handoff's bottom-bar phone treatment is future work.

- **Pre-commit review corrections (8 findings fixed before ship — 3 self-caught in live
  verification, 5 confirmed by the adversarial review):**
  - *Self-caught:* the book-mode nav/counter chrome stayed visible in Analyze (the
    same-specificity source-order collision above — spotted in a screenshot); the fixed-position
    nav-prev sat underneath the fixed 76px rail (body padding doesn't move `position: fixed`;
    nav-prev is now `left: calc(76px + 1rem)` and the spread counter re-centered on the content
    area); the ≤900px `display: none` on `.rail-label` stripped the Write/Analyze buttons'
    accessible names entirely (accname skips hidden children) — the buttons carry redundant
    `aria-label`s.
  - *Review-confirmed:* (1) the init-time restore called `setMode('analyze')` → `savePrefs()`
    before the deferred book-view restore set `data-view`, silently rewriting a stored
    `viewMode: 'book'` to `'grid'` on every reload — the restore now passes `persist: false`;
    (2) switching to Analyze left an open find bar live over the report, able to walk and
    Replace-all into editors the user couldn't see — `setMode('analyze')` closes it (mirror of
    openFindBar's drop-to-Write guard); (3) palette-driven mode switches dropped keyboard focus
    to `<body>` (dialog.close() restores focus synchronously *before* run(), and the mode switch
    then hides/reparents that element) — the mode commands focus the matching rail button;
    (4) an Analyze round trip dumped Book view back to spread 1 (display:none discards
    scrollLeft) — the spread index is captured before hiding and re-scrolled on return;
    (5) Analyze exposed four orphaned `role="tabpanel"`s with no tablist on the page — panels
    swap to `role="region"` in the report and back to `tabpanel` in the aside.
  - Fixing (2) introduced — and live verification caught — a second-order TDZ: `closeFindBar`
    touches `findMatches`/`findCurrent`, module `let`s declared ~300 lines below the init-time
    `setMode` call, which killed the whole module on any reload that restored Analyze. The call
    is now guarded on the bar actually being open (it ships `hidden`, so init always skips it).

## Consequences / watch items

- Reparenting means the panels are single-instance: Write's tab strip and Analyze's report can
  never be visible simultaneously (true today — the modes are exclusive). If a future design
  wants them side-by-side, the panels need to become render targets instead.
- Anything that toggles `body.book-mode`-gated chrome in the future must remember Analyze's
  hide rules sit after it in source order.
- Live verification note: mid-verification the preview showed state changes (font, age band,
  view, mode) with no matching code path; instrumenting `body.setAttribute` across three
  faithful repros showed zero spurious `setMode` calls — the changes were concurrent human
  interaction with the shared dev-server tab, not a product bug. The one CSS bug the session
  surfaced (book chrome in Analyze) was real and is fixed above.
- Slice 4 extends `EditorMode` with `'phonology' | 'prosody'`; prefs v2's shape already
  accommodates it (the field is a string union, no version bump needed).
