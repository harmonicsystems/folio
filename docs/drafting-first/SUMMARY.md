# Drafting-first branch — what was built, and what to do next

Milestone 8 deliverable (2026-07-13). Companion to [PLAN.md](PLAN.md) and
[ADR 0016](../decisions/0016-drafting-first-book-model.md).

## What shipped

A complete, engine-free drafting product at **`/draft`** — a smart notebook
for book-making. Eight milestones, each committed and browser-verified:

1. **Plan + ADR 0016** — page-map convention (recto-odd, signature-only
   counts, self-ended endpaper math), presets-as-data, story-ordinal keying,
   import-only persistence, submission guardrails.
2. **Tokens, themes, shell** — three-tier CSS custom properties; studio /
   evening / paper themes with pre-hydration (no flash); library; new-book
   flow whose spec sheet teaches the format before the first word.
3. **The spread editor** — pages laid out at native CSS physical units
   (1in = 96px; 18pt is honestly 18pt against trim) and scaled with
   `transform`; `contenteditable="plaintext-only"` per page; explicit page
   break (⌘⏎) that pushes post-caret text to the next story page; overflow
   tinted exactly where it happens and never reflowed.
4. **Storyboard + counters** — every unit as a true-layout thumbnail (the
   same renderer, smaller transform — it cannot lie about what fits),
   editorial labels ("4–5 … 30–31, 32"), front-matter chips, the unplaced-
   pages tray, and ambient judgment-free counts.
5. **Layout + placeholders** — per-page position/alignment/type-step within
   preset rules; illustration spaces (full-bleed spread, full page, halves,
   spot) with notes; constraint logic in the model (a half-page illustration
   owns its half); the illustration list as a copyable/printable artifact.
6. **Board book + early reader** — the preset test passed: both formats came
   up from data alone. Chapters (early reader) are ordinal-keyed markers
   printed above the page's text.
7. **Submission View** — the manuscript re-rendered live as the standard
   submission document (12pt TNR, double-spaced, 1" margins, contact block +
   rounded count, LASTNAME / TITLE / page# from page 2). Art notes
   quarantine into a separate "do not submit" file — never silently dropped,
   never inlined. Page markers off by default. Exports: hand-rolled zero-
   dependency .docx (validated by unzip, xmllint, and Apple's textutil
   importer) and PDF via printing the app's own paginated sheets.
8. **Polish** — caret flows across page boundaries with the arrow keys
   (crossing spreads), empty states everywhere, spike page removed.

**Numbers:** ~30 new source files under `packages/web/src/drafting/` +
`draft.astro`; 68 unit tests (the web package's first); zero new runtime
dependencies (vitest added as devDependency); zero engine imports (grep-
enforced); every existing route byte-identical.

## What the build taught us

- **The preset architecture held.** Milestone 6 was the test: board book and
  early reader needed no renderer, editor, storyboard, or counter changes —
  only `formats.ts` data plus the chapters feature. Adding a fourth format
  (e.g. 8×8 novelty, or a chapter-book trim) should be a data commit.
- **Native-units + transform is the honest-rendering keystone.** One layout
  pass serves the editor, thumbnails, and (later) print interior export.
  Two real bugs were caught live and both were CSS subtleties around it
  (flex-shrink clamping the overflow measurement; justify-content pushing
  overflow above the trim — fixed with auto-margin centering).
- **Ordinal keying earns its keep.** Construction and page-count switches
  renumber instead of destroying; the overflow tray made "shrinking never
  deletes" a visible promise.
- **The submission/design split lands conceptually.** Watching trim, fonts,
  and placeholder frames fall away into the bland manuscript makes "design
  is scaffolding; the text is the thing" legible without a word of copy.

## Known limits (deliberate v1 cuts)

- Esc → storyboard forgets the spread you were on (returns to unit 0).
- Storyboard keyboard nav is native Tab order, not a roving-tabindex grid.
- `mergeWithNext` (break deletion) exists in the model, tested, but has no
  UI affordance yet (backspace-at-page-start is the natural gesture).
- Caret precision inside a scaled contenteditable is verified in Chromium;
  Safari should be spot-checked (fallback documented: CSS `zoom` on the
  editor canvas only).
- Chapter titles are excluded from the submission manuscript (per plan);
  an early-reader submission would normally include them as headings.
- The submission paginator measures with canvas `measureText`; if Times New
  Roman is unavailable the fallback serif may wrap a line differently than
  the printed PDF (same font either way at print time).
- The .docx passed three independent parsers (unzip, xmllint, Apple's
  textutil) but has not been opened in Microsoft Word itself.

## Recommended next moves, in order

1. **Put it in front of a writer.** The branch exists to test "purely for
   creation" — the next unit of work is a session with someone drafting a
   real picture book, watching where they reach for something that isn't
   there. (This mirrors the main branch's "user signal, not the next
   feature" posture.)
2. **Open the sample .docx in Word once** (and Google Docs) — ten minutes,
   closes the last export-confidence gap.
3. **Merge-back decision.** If drafting-first wins: reconcile the two
   word-count vocabularies (engine bands vs preset bands — likely by making
   the engine another consumer of format data) and decide whether `/draft`
   becomes `/`. If the fused product wins: `formats.ts`, `pageMap.ts`, and
   the submission/docx modules are engine-free and portable back to it —
   the verdict layer ADR 0009 wanted (signature math, trim facts) already
   exists here as data.
4. **Small UX debts first if the branch continues:** backspace-at-start
   merge gesture, storyboard position memory on Esc, Safari caret check,
   chapter headings in early-reader submissions (behind the same quiet
   toggle pattern as page markers).
5. **Print interior PDF later, not now** — the renderer is already in real
   inches with real margins; when it's time, the path is the submission
   view's print pattern applied to `SpreadFrame` at scale 1.
