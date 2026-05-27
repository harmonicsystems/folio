# 0002: Spread-first editing

## Status

Accepted (2026-05-25). Production code in `packages/web/` may now rely on these decisions.

## Context

The current web alpha at `packages/web/` is a paste-and-analyze surface: one textarea, one readability report below. It validates that the engine works in the browser, but it doesn't match how picture-book authors actually write. Picture books are composed *by spread* — 16 page-pair units, each with a placement decision (text left, text right, wordless, etc.) and an illustration brief that develops alongside the words.

A throwaway visual prototype at [prototypes/spread-editor/](../../prototypes/spread-editor/) explored this shape: 16 tiles in a scrollable grid, per-spread placement zones, reach words decorated in-context, a live readability sidebar driven by mock analysis. The validation reaction was strong, and one concrete implementation concern surfaced — re-rendering reach-word decoration on every keystroke breaks the caret. That concern is what this ADR needs to resolve before production code starts.

The decision in scope here is about **the editor surface**: how the author types into a spread, how reach-word annotations attach to that text without disrupting input, and which library (if any) we adopt to manage the rich-text complexity. The engine-side decisions (whether `analyze()` returns per-spread profiles, where `TrimSize` lives, etc.) are covered separately in [0003-spread-native-engine-api.md](0003-spread-native-engine-api.md).

## Decision

**Adopt the spread-first editor as the primary surface for `packages/web/`,** replacing the paste-and-analyze UI once feature parity is reached (basic readability sidebar, reach-word identification, sight-word coverage). The paste UI stays available behind a route during the transition for users who want the simpler interaction.

**Use Lexical** ([lexical.dev](https://lexical.dev)) as the rich-text editor framework. Each spread gets its own Lexical editor instance scoped to that spread's text, so re-renders triggered by analysis updates don't cross spread boundaries. Reach-word annotations are implemented as Lexical decorator nodes — these wrap text without modifying the underlying text node tree, so the caret survives re-decoration.

**Defer rich illustration-brief authoring to a later milestone.** The first cut treats the brief slot as a plain text field per spread, alongside the manuscript text. The point of v1 is to validate the spread-first authoring rhythm, not to ship illustrator collaboration features.

## Consequences

### What this makes easier

- Authors compose in the unit they think in (spread), not the unit the engine consumes (full manuscript). The engine still receives a full `Manuscript`; the editor just helps it get assembled.
- Reach-word decoration becomes a stable, caret-safe overlay rather than a stream of `dangerouslySetInnerHTML` re-renders fighting with `contentEditable`. This was the specific concern surfaced by the prototype.
- Adding per-spread analysis fields later (when [0003](0003-spread-native-engine-api.md) lands) becomes a matter of binding a new sidebar panel to existing per-spread data — no editor surgery required.
- Lexical's plugin model gives a clean place to add later features (collaboration cursors, comment threads, illustrator-side annotations) without rewriting the editor core.

### What this makes harder

- Bundle weight grows. Lexical adds ~30–40 KB gzipped to the web alpha. Acceptable for an authoring tool; not acceptable if we ever want the same UI to serve as a read-only embeddable widget.
- Per-spread editor instances mean coordinating focus, undo history, and clipboard across 16 editors. Lexical handles this within an instance, not across instances — we'll need a thin coordinator for cross-spread undo and cut/paste-across-spread flows. Out of scope for v1; deliberate v2 work.
- We're committing to a controlled rich-text model. If we ever want to support Markdown import/export round-tripping faithfully, we'll need to write conversion layers — Lexical doesn't ship one we'd want to use as-is.

### What we're accepting

- Lexical is Meta-maintained and active, but it's younger than ProseMirror. We're trading some battle-testing for a better React integration story and a simpler decorator-node model. If Lexical's trajectory changes, migration to TipTap (a ProseMirror wrapper with a similar API surface) is plausible — the editor is the only place Lexical types leak into our code, and the surface area is small.
- The paste-and-analyze UI stays as a fallback route during transition. Once the spread editor reaches parity, the paste UI gets removed in the same PR that flips the default — no permanent dual maintenance.

## Alternatives considered

**TipTap (ProseMirror wrapper).** Mature, well-documented, similar API to Lexical. Rejected primarily because its decorator equivalent (ProseMirror plugins with widget decorations) is harder to reason about for the specific reach-word use case — and because Lexical's per-editor isolation matches the per-spread model more cleanly. Either would have worked; this is a soft preference, not a fundamental difference.

**Raw ProseMirror.** Most flexible, most powerful, steepest learning curve. Rejected as overkill for an authoring tool whose rich-text needs are modest (bold/italic, soft line breaks, reach-word decoration). The complexity tax compounds across 16 editor instances.

**Roll our own controlled `contentEditable`.** Considered seriously because it's the smallest possible bundle. Rejected because the prototype already demonstrated that caret stability under decoration is non-trivial, and that's exactly the class of bug a controlled-`contentEditable` implementation invites. The cost of getting it right exceeds the cost of adopting Lexical.

**Stay with paste-and-analyze, add per-spread tabs.** Cheaper to ship, but doesn't change the authoring model — just gives it a different UI dressing. The whole point of this ADR is the model change.
