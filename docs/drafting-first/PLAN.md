# Drafting-first branch plan (`explore/drafting-first`)

Milestone 1 deliverable. Decisions of record live in
[ADR 0016](../decisions/0016-drafting-first-book-model.md); this document is the
build map.

## Hypothesis

The most valuable Folio product may be purely for creation: a smart notebook for
book-making — a text editor designed around the physical structure of children's
books (word count, page count, trim size, construction), with presets that carry
real publishing specifications, so the author sees how their book will actually
look while they draft it.

The analysis engine stays in the codebase untouched. **Nothing on this branch
depends on it, imports from it (not even types), or makes room for it in the
UI.** Counts are fine; judgments are not.

Two artifacts, cleanly separated: the beautiful designed book is the
**workspace**; the plain standard-format submission manuscript is the
**deliverable**. A persistent Submission View toggle flips between them.

## What is kept from the existing app

- **The persisted data layer**: the `folio.draft.v2` localStorage schema
  (`{version, ageBand, trimKey, spreads[{leftPage:{text,placement},rightPage:…}],
  savedAt}`). The new editor's per-page persisted shape is a structural superset
  of that page shape, and the existing draft is imported (one-way,
  non-destructive) into the new library on first run. Main-branch keys are
  **never written**.
- Design-language cues: the warm cream palette and the already-loaded fonts
  (Atkinson Hyperlegible, Libre Caslon Text).
- Nothing else. There are no API routes or server to keep (the app is fully
  static), and the web app's only factored-out module (`src/types.ts`)
  type-imports the engine, so the new UI declares its own structurally
  compatible types instead of importing it.

All existing routes (`/`, `/paste`, `/about`, `/guide`) and components stay
byte-identical. The new UI is all-new components, styling, and one new route.

## Where the new UI lives

- Route: **`/draft`** (`src/pages/draft.astro`) — a static shell that mounts one
  React island (`client:only="react"`; the app is localStorage-backed, so SSR
  would only render an empty flash). A ~60-line hash router handles app states:
  `#/` library · `#/new` · `#/book/<id>[/spread/<n>|/storyboard|/illustrations|/submission]`.
- Code: everything under `src/drafting/` —

```
drafting/
  formats.ts       BookFormat types + 3 preset const objects (imports nothing)
  pageMap.ts       buildPageMap(pageCount, construction) → render units/roles/labels (pure)
  model.ts         DraftBook + pure ops (splitStoryPageAt, mergeWithNext, applyPageCount/
                   Construction/Format/Level, validateBook)
  counts.ts        engine-free word counting, band + budget readouts (pure)
  persistence.ts   folio.drafting.* keys, library index, legacy import, autosave, quota handling
  flatten.ts       DraftBook → SavedDraft-v2-shaped spreads (export path; never auto-written)
  submission.ts    DraftBook → submission document model (paragraphs, rounded count,
                   optional page markers, art-notes quarantine list) (pure)
  docx.ts          zero-dependency minimal OOXML writer (stored-entry ZIP)
  router.ts        hash router
  DraftApp.tsx     providers + route switch
  hooks/           useElementSize, useOverflow, useKeyboardNav, useTheme, useBookStore
  components/      shell/ library/ newbook/ page/ editor/ storyboard/ submission/
  styles/          tokens.css, page.css, submission.css, app.css
```

Dependency direction: components → hooks → model/pageMap/counts/persistence →
formats. No component touches localStorage directly. **Zero new runtime
dependencies**; `vitest` is added as a web-package devDependency for the pure
modules.

Engine-free enforcement, run at every milestone:

```
grep -rn "early-literacy\|from '\.\./types'" packages/web/src/drafting packages/web/src/pages/draft.astro
```

must return nothing.

## Core mechanisms

- **True-scale rendering**: pages lay out at native CSS physical units
  (1in = 96px, 1pt = 4/3px exactly — a 10×10" page is 960×960px and 18pt type is
  honestly 18pt relative to trim), then scale to fit via `transform: scale()`.
  Transforms don't affect layout, so wraps and overflow are identical at every
  zoom — the editor and the storyboard thumbnails render the same book through
  one pure `PageRenderer` (`mode="edit" | "thumb"`).
- **Editing**: one `contenteditable="plaintext-only"` div per page. Pagination
  is structural: Cmd/Ctrl+Enter (or the footer control) splits at the caret and
  prepends the remainder to the next story page. Overflow past the safe area
  gets a gentle tint + whisper caption and **never** reflows.
- **Page map**: page 1 is recto; odd = recto; legal page counts come only from
  the preset's signature list. Front matter, self-ended endpaper consumption,
  and editorial spread labels ("pages 4–5 … 32") all derive from
  `buildPageMap(pageCount, construction)`. Story text is keyed by **story
  ordinal**, so page-count/construction changes renumber instead of destroying.
- **Tokens + themes**: three tiers of CSS custom properties; three themes
  (studio light / evening dark / paper warm) via `data-theme` with a
  pre-hydration script. Page rendering tokens (`--page-*`) are defined once and
  never themed — the book is ink-on-paper in every theme. Submission view is a
  third, deliberately un-themed rendering (`--ms-*`: white, black, Times New
  Roman).
- **Submission View**: the same manuscript re-rendered live as the standard
  submission document (contact block + rounded word count, centered title/byline,
  12pt TNR double-spaced 1" margins, `LASTNAME / TITLE / page#` running header).
  Art notes are quarantined to a separate "do not submit" file, never inlined.
  Page markers are an off-by-default toggle. Exports: .docx (hand-rolled OOXML)
  and PDF via printing our own paginated US-Letter sheets.

## Milestones

1. **Plan doc + ADR 0016** (this document).
2. **Tokens + themes + app shell** — library, new-book flow with preset picker
   showing spec details; persistence + legacy import; scaled-contenteditable
   risk spike.
3. **Spread renderer + direct writing + explicit pagination** (picture book).
4. **Storyboard + front matter + shape-of-the-book counters.**
5. **Text layout options + illustration placeholders + illustration list.**
6. **Board book + early reader presets** — the preset-architecture test:
   should be almost entirely data.
7. **Clean manuscript export** — Submission View toggle, quarantine,
   plain-vs-paginated toggle, .docx/PDF export.
8. **Polish** — keyboard navigation, autosave affordances, empty states, and a
   written summary + recommendations.

Each milestone ends with: typecheck + build green, the engine-free grep clean,
unit tests for any pure module touched, and browser verification of the flows
it added.
