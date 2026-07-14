# Design critique brief — Folio drafting surface

A brief to hand a designer for a heuristic critique + targeted visual-polish
pass on the drafting-first surface (`explore/drafting-first`). Companion to
[PLAN.md](PLAN.md), [SUMMARY.md](SUMMARY.md), and
[ADR 0016](../decisions/0016-drafting-first-book-model.md).

The one question that anchors the whole critique: **does the book stay the
hero, and does a first-time picture-book author understand what to do without
a tutorial?**

---

## What we're asking for

A heuristic critique and targeted visual-polish pass on an existing, shipped
tool — **not a redesign, not new features, not a rebrand.** Deliverable: a
prioritized, annotated punch list (severity + rough effort), and wherever you
can, concrete values we can drop straight into the existing design-token
system. Flag anything that would need a structural change rather than a token
tweak, so we can decide separately.

## What it is

Folio's drafting surface is a spread-based WYSIWYG editor for children's books:
you pick a format (board book / picture book / early reader) and write directly
onto facing pages rendered at true trim proportions. Three views via a top-bar
toggle — **Write** (the spread editor), **Storyboard** (a grid of the whole
book), **Submission** (the plain standard-manuscript export) — plus a Library
and a new-book flow. It's live: **folio.harmonic-systems.org/draft**. Three
themes ship (Studio light / Evening dark / Paper warm) under Settings. It's
local-first — books live in your browser's storage, so anything you type is
private to your machine.

## The design intent to honor (guardrails — please don't fight them)

- Calm, spacious, typography-forward. **The book's pages are the brightest
  object on screen; chrome recedes; avoid dashboard aesthetics.**
- **Judgment-free** — the tool shows plain counts, never quality scores.
  (Readability analysis is a separate product, deliberately out of scope here.)
- **Two artifacts, cleanly separated:** the designed book is the *workspace*;
  the plain submission manuscript is the *deliverable*. The Submission view is
  **deliberately un-themed** (white paper, black Times New Roman) — that
  plainness is intentional, not a bug.
- Everything is built on a **three-tier CSS design-token system** (primitives →
  semantic roles → component tokens) with the three themes layered on top. The
  book pages themselves render ink-on-paper, true to print, in *every* theme.
  **This token system is the lever** — please work at that altitude so your
  recommendations are values we apply, not screens we rebuild.

## Where we especially want your eye

We've already run an internal critique and suspect these; confirm, refute, and
find what we missed:

- **Density & hierarchy** — the bottom status/caption band and the ambient
  counters: do they read as a calm sentence or a busy readout? Is the
  per-spread word count redundant with the per-page captions?
- **The spread-position readout** ("pages 4–5 · story spread 2 of 14 · 4 of
  17") — legible or noise?
- **Discoverability** — the preset-card trim silhouettes are nearly invisible
  (white-on-white); Specs/Guides don't clearly read as buttons; the per-page
  "Text & art" popover opens *over* the page so you can't see your change land.
- **How hard the chrome should recede** — where's the line between "quiet" and
  "can't find the control"?

> Alternate framing: to get a genuinely fresh read, drop this section and give
> the designer only the anchor question + guardrails. Priming converges faster;
> a blank slate can surface things we've gone blind to.

## Evaluate specifically across

- All three themes, especially **Evening** (dark) and **Paper** (warm).
- The **first-run empty states** (empty shelf, new-book flow, a blank book).
- The **Write → Storyboard → Submission transition** — the moment the designed
  book collapses into the plain manuscript. Does that read as intentional?
- A **contrast / accessibility check** in each theme.

## Explicitly out of scope

Logo / brand identity; any new features or flows; the analysis / readability
product; the print-ready interior PDF; the marketing site. Keep the book pages
themselves print-true — don't theme them.

## Logistics

Live URL above; switch themes in Settings; timebox to a focused half-day.
Return it as a ranked list annotated on screenshots (or a short doc). Token
values or spec numbers wherever you can — we'll implement from the existing
system.
