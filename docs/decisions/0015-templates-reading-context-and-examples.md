# ADR 0015 — Templates, reading context, and example isolation

Status: Accepted 2026-07-12
Deciders: David Nyman (product direction), Codex implementation pass

## Context

The carousel rebuild exposed an ambiguity in the editor header. Audience,
experience, and sample selection appeared as peer controls even though they have
very different consequences:

- audience and reading situation change how Folio interprets evidence;
- book structure changes the physical working document;
- a sample is a different manuscript entirely.

Treating them as ordinary settings makes it unclear whether changing a control
will reinterpret, restructure, or replace the writer's work. It also leaves the
single `folio.draft` slot unable to preserve an original while a writer explores
another structure.

## Decision

### 1. Reading context never mutates the manuscript

Audience and experience are grouped under **Reading context · analysis only**.
They reprioritize and contextualize existing engine evidence. They do not change
spread count, page placement, text, formatting, template, or export structure.

### 2. Templates are blank web-side working structures

A `BookTemplate` defines a name, explanatory copy, default audience and reading
situation, spread count, and default left/right page placements. Templates carry
no manuscript prose and are explicitly described as editable starting points,
not publishing requirements.

The first set is deliberately small: compact board-book, picture-book, verse
picture-book, and blank custom structures. Template data remains in the web
package and does not change the published engine API.

### 3. Structure changes create a copy

Choosing another structure never mutates the active manuscript. Folio captures
and preserves the source in the local manuscript library, creates a new document
ID, and maps unchanged spread content by index where a destination exists. It
does not rewrite or automatically reflow prose. When the destination is shorter,
the complete source remains available as its own manuscript.

### 4. Examples are read-only explorations

The former Samples action becomes **Explore**. Opening an example creates a
temporary read-only document associated with an appropriate template and stores
the writer's return document ID. A persistent banner explains the state and
returns to the original manuscript. Example exploration never enters the local
manuscript library and never overwrites the active work.

### 5. Local persistence becomes a document library

Web persistence advances to version 4. Each manuscript stores a unique document
ID, template ID, spread count, reading context, workspace position, page
placements, plain text, and lossless Lexical state. A small local index provides
document switching. V2 and v3 single-draft formats migrate on read.

## Consequences

- Writers can experiment with audience and experience without fearing a format
  change.
- Template conversion is reversible because the source remains a separate
  manuscript.
- Examples can be richer and more instructional without becoming destructive
  presets.
- The editor supports variable spread counts while the engine continues to
  accept an ordinary `Manuscript.spreads` array.
- Local manuscript management now needs later affordances for rename, archive,
  and deletion. The alpha library intentionally ships with switching and new
  document creation first.
- Templates must cite structural provenance if future copy presents a convention
  as an industry requirement. The initial copy avoids that claim.

## Alternatives considered

- **Let Audience change the template.** Rejected because interpretation and
  physical structure are independent authorial choices.
- **Transform the active manuscript in place.** Rejected because shortening or
  redistributing spreads can destroy page-turn decisions.
- **Continue loading samples over the current draft with confirmation.**
  Rejected because a confirmation still makes exploration destructive.
- **Put templates in the engine contract.** Rejected because trim, page roles,
  and composition remain web/product concerns.

