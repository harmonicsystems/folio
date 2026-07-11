# ADR 0005 — Tabbed inspector (studio dashboard, slice 1)

Status: Accepted 2026-07-11
Deciders: David Nyman (design handoff + slice selection)

## Context

A design handoff ("studio dashboard", design 1c) reorganizes the spread editor from one topbar +
one long 12-section scrolling sidebar into: a mode rail, a chip-based context bar, a tabbed
inspector, a ⌘K command palette, and a reach-word highlight restyle. The handoff sequences the
work into four independently shippable slices; David chose **slice 1 only** for this change:
the sidebar becomes a 4-tab inspector (Length / Vocab / Phonics / Issues), plus the reach-word
restyle. Slices 2–4 (palette + context bar, mode rail + prefs v2, Phonology/Prosody modes) are
future work.

## Decision

- **Chrome-only restructure with total id preservation.** The `aside.sidebar` wrapper and all 27
  pre-existing element ids survive verbatim, so the seven render functions (renderTopMetrics,
  renderPhonologyDetail, renderPerSpread, renderReachWords, renderWarnings, renderGuessedWords,
  updateStatusBar) keep working with only two additions: the Length-tab hero/progress/longest-
  spread updates in `renderTopMetrics`, and the Issues badge in `renderWarnings`. Hidden panels
  keep re-rendering every analysis pass — accepted: `byId` works under `display:none`, the DOM
  writes are cheap, and it means switching tabs never shows stale data.
- **Full ARIA tabs**, not the codebase's `aria-pressed` toggle shortcut: real tab/tabpanel
  ownership warrants tablist semantics (roving tabindex, ArrowLeft/Right wrapping, Home/End,
  automatic activation — panel switching is pure `hidden` toggling, so activation is cheap).
- **Tab → content map**: Length (hero word count + target + progress bar, sentences, avg sentence
  length, NEW longest-spread row, per-spread bars) · Vocab (tier/sight/TTR/unique + reach words) ·
  Phonics (decodability, syllables, the three phoneme collapsibles, guessed pronunciations) ·
  Issues (warnings + count badge on the tab itself).
- **Judgment calls the spec left open:**
  - The three **Prosody rows** (dominant meter, consistency, rhyme scheme) live at the bottom of
    the Phonics tab as a labeled subgroup — a *temporary home* until the slice-4 Prosody mode
    absorbs them. They are deliberately not dropped.
  - The static **"Coming soon" list is removed** from the product surface; the roadmap lives on
    /about and in docs. It had no ids and no render function.
  - **Tab selection is transient** (default Length). Persistence belongs to prefs v2, which the
    handoff schedules for slice 3; writing tab state into prefs v1 now would create migration
    debt.
  - **"Longest spread" is computed client-side** in `renderTopMetrics` from `profile.perSpread`
    — explicitly no engine change.
- **Reach-word restyle (product-wide, this file's one `::highlight(reach-word)` rule):** soft
  ochre wash (rgba(163,120,40,0.16)) + dotted `#a37828` underline replaces the rust wavy
  underline. Rationale: wavy-rust borrows the spellchecker idiom, so flagged words read as typos;
  a wash + dotted line reads as "noted". Kept distinct from `phoneme-match` (stronger 0.22 tint).
- **Deliberately retained this slice** (removal is slice 3): the Sidebar Hide/Show toggle,
  `body.sidebar-collapsed`, and the bottom status bar. The `@media print` rules need no change —
  `.sidebar` is hidden wholesale, covering all new in-aside chrome.
- **No new dependencies**: the handoff's Lucide suggestion is not taken; the bundled mock icons
  are rail-only (slice 3) and will be revisited then.

- **Three deliberate deviations from the spec's literal color values, for WCAG AA** (flagged to
  the design owner rather than silently shipped): inactive tab labels use the handoff's own
  `#6b5f4e` token instead of taupe (taupe on white is 4.07:1 at 11px — below AA's 4.5:1); the
  Issues badge background and the off-target hero subline use a one-step-darker ochre `#8a6420`
  (white-on-ochre and ochre-on-white are both 3.98:1 at 9/12px; the darker step passes at 5.3:1).
  The pre-review build also lost the rust-vs-ochre over/under severity distinction when the word
  count moved into the hero — restored via `.length-hero-num .value.over/.under` (the class
  `setText` already writes), and the orphaned `.metric-row` over/under rules were deleted.
  Tabs get an inset focus ring (the sticky strip sits flush with the scrollport top, clipping the
  default offset ring), and the three panels without focusable content carry `tabindex="0"` per
  the APG tabs pattern.

## Consequences / watch items

- Stacked highlights (reach-word wash under phoneme-match tint) alpha-composite to roughly a
  0.34 ochre wash; verified legible. If it ever reads muddy, the handoff's sanctioned fallback is
  demoting `phoneme-match` to a border-only style — do not do it speculatively.
- guide.astro's "the sections follow the sidebar, top to bottom" prose is now slightly stale —
  small follow-up copy edit, kept out of this chrome-only slice.
- Slices 2–4 build on this structure; the inspector panels are the contract the mode rail will
  toggle against in slice 3.
