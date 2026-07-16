# ADR 0016 — Drafting-first book model: page map, presets, persistence, submission export

Status: Accepted 2026-07-13
Deciders: David Nyman (route, editor tech, word bands, compat model — chosen at plan review)
Scope: the `explore/drafting-first` branch only. Numbered 0016 because 0012–0015
are taken on the unmerged `codex/reflection-ui` branch.

## Context

This branch tests a product hypothesis: separate drafting from analysis
entirely and see whether a purely-for-creation surface — a spread-based WYSIWYG
editor built around the physical structure of children's books — is the more
valuable product. That deliberately diverges from the fused
"quiet studio reader" direction (ADRs 0009–0011, and 0012–0015 on
`codex/reflection-ui`); the divergence is the experiment, and this ADR records
the decisions that make it buildable without disturbing anything that exists.

Constraints in force: the analysis engine stays untouched and unreferenced
(no imports, not even type-only — `src/types.ts` type-imports the engine, so
the new code declares its own structurally compatible types); the existing
localStorage draft must remain readable and unclobbered from `main`; no new
runtime dependencies.

## Decision

### 1. Page map convention

Page 1 is a recto; odd pages are recto, even verso. Legal page counts come only
from each preset's signature list (`pageCounts`), all multiples of 4 — this
subsumes ADR 0009's hard-constraint verdict ("14 pages doesn't fit a 4-page
signature") by making illegal counts unrepresentable. Every book therefore
renders as `[1] single-recto, [2–3], …, [N−2, N−1], [N] single-verso`, and the
storyboard labels units the way editors do ("pages 4–5, 6–7 … 30–31, 32").

`buildPageMap(pageCount, construction)` is a pure function assigning each
physical page a role (`half-title | title | copyright | story | self-end`) from
the construction's `frontMatterOrder`, and emitting the render units. All page
math in the app derives from it.

**Endpaper convention (corrects the build brief, which had it inverted):** in
trade practice it is the *self-ended* book whose endpapers consume the printed
signature — the first and last leaves (pages 1–2 and N−1–N) become pastedown +
flyleaf, removing 4 pages from the budget. "Plus endpapers" binds separate
endpaper stock, leaving all printed pages usable. (Harold Underdown, *The
Complete Idiot's Guide to Publishing Children's Books*, 3rd ed., on 32-page
self-ended construction; Tara Lazar, "Picture Book Construction: Know Your
Layout," taralazar.com.)

Resulting budgets at the classic 32 pages:

| Construction | Front matter | Story pages | Spread-equivalents |
|---|---|---|---|
| Hardcover, self-ended (default) | title p3, copyright p4 | 5–30 (26 pp) | 13 |
| Hardcover + endpapers | half title p1, copyright p2, title p3 | 4–32 (29 pp) | 14.5 |

Both bracket the traditional "~13–14 story spreads, story begins page 4–5."
Board book 20 pp: title p1, story pp2–20. Early reader 32 pp: title p1,
copyright p2, story pp3–32.

### 2. Presets are data

`formats.ts` ships three `BookFormat` const objects (board book, picture book —
the default, early reader) and nothing else knows their numbers. Deviations
from the brief's type sketch: `orientation` lives on each trim option (one
preset legitimately offers square, portrait, and landscape); menus
(`trimOptions`, `constructionOptions`, `levels`) are explicit; `frontMatterOrder`
makes the page map derivable from data. Word bands use the brief's numbers
(picture 200–1,000 target 500; early reader leveled 100–400 / 400–1,200 /
1,200–2,500; board 0–100 target 50) — chosen at plan review over the engine's
SCBWI/Mary Kole constants, which stay untouched as the analysis-side truth.
Provenance is documented in `formats.ts` header comments.

### 3. Document model: story ordinals, not page numbers

Story content is keyed by story ordinal and front matter by role; the page map
binds ordinal → physical page at render time. Page-count and construction
changes are therefore non-destructive renumberings; pages that no longer fit go
to a visible `overflow` tray, never deleted. The explicit page break
(`splitStoryPageAt`) moves post-caret text to the *next story page* with no
cascade. Text never reflows across pages implicitly.

### 4. Persistence: new keys, superset schema, import-only

- Keys: `folio.drafting.library.v1` (index), `folio.drafting.book.v1.<uuid>`
  (one record per book — small writes, quota failures isolated),
  `folio.drafting.prefs.v1`, `folio.drafting.theme`. Version numbers 3/4 and
  the `folio.draft` prefix are deliberately avoided (used by
  `codex/reflection-ui`).
- Per-page persisted shape is a structural superset of SavedDraft v2's
  `{text, placement}` (placement re-derived on save), so the page data remains
  legible to main-branch semantics.
- The existing `folio.draft.v2`/`v1` draft is imported once, non-destructively,
  as a 32-page plus-endpapers picture book (all 32 pages usable — nothing
  truncates; position-preserving; plain text only).
- **No mirroring back to `folio.draft.v2`.** Main's restore loop assumes
  exactly 16 spreads and autosaves what it reads — a mirror would be truncated
  to 16 spreads and then written back over itself, and any live draft on `/`
  would be silently clobbered. Import-only carries all the real value with
  none of the destruction risk.

### 5. Submission export: conformity, not polish

The designed book is the workspace; the deliverable is the standard submission
manuscript (contact block + rounded word count, centered title and byline,
12pt Times New Roman, double-spaced, 1" margins, `LASTNAME / TITLE / page#`
running header from page 2 — per standard manuscript format, cf. William
Shunn's "Proper Manuscript Format"). A persistent Submission View toggle
renders it live and is the only place file export exists. It is deliberately
un-themed.

Two guardrails: (a) illustration placeholders and notes are **stripped by
default** and quarantined into a separate file labeled "Art notes — for your
reference, do not submit" — never silently dropped, never inlined in v1;
(b) the default export is the plain non-paginated manuscript; `PAGE n–m:`
markers are an off-by-default toggle.

Export tech is zero-dependency: the on-screen view paginates into US-Letter
sheets by measurement, PDF is `window.print()` over exactly those sheets (so
preview ≡ PDF and no reliance on `@page` margin-box support for running
headers), and .docx is a small hand-rolled OOXML package (stored-entry ZIP;
double spacing via `w:line="480"`, header with a `PAGE` field, `titlePg` for
the header-free first page). If Word/Pages/Google Docs validation exposes
brittleness, we stop and ask before adding the `docx` npm package.

## Consequences

- The preset architecture is falsifiable: milestone 6 (board book + early
  reader) must land as almost pure data, or the design failed.
- Two word-count vocabularies now exist in the repo (drafting presets vs engine
  targets). Acceptable on an exploration branch; a merge would need to
  reconcile them (likely by making the engine bands another consumer of
  format data).
- The new UI duplicates ~4 small type shapes rather than importing them —
  the price of the hard engine-free rule, paid once, enforced by grep.
- Plain-text pages mean imported drafts lose inline bold/italic (the stored
  original is untouched). Accepted at plan review.
- Main cannot see books created here (import is one-way). Accepted at plan
  review; a future explicit "export to classic editor" could use `flatten.ts`.

## Alternatives considered

- **Reuse `PageEditor.tsx`/Lexical** — rejected: couples the new surface to the
  old component tree and its `window.__pageEditors` registry; rich text isn't
  needed (layout choices are page-level by design).
- **Mirror the active book to `folio.draft.v2`** — rejected for the truncate-
  and-clobber loop described above.
- **Page-number-keyed content** — rejected: every construction/page-count
  change would orphan content; ordinals make those operations renumberings.
- **`docx` npm package now** — deferred: the emitted document is trivial and
  the repo rule is no new dependencies without need demonstrated.
