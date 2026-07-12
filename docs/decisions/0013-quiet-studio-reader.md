# ADR 0013 — Quiet studio reader reflection layer

Status: Accepted 2026-07-12
Deciders: David Nyman (implementation authorization), Codex product pass

## Context

ADR 0012 narrows the editor MVP to read-aloud picture books and separates
audience age from reading situation. The existing Write-mode digest still shows
five persistent metrics, however, which gives every number equal weight and can
make an ingredient profile feel like a grade.

Folio should borrow the useful interaction quality of chatbot products — timely,
bite-sized synthesis — without chat, generated prose, manuscript mutation, or a
simulated assistant personality. Writers need to move from a small observation
back to its evidence and then return to the manuscript without losing autonomy.

## Decision

### 1. Add a web-side reflection view model

`deriveReflections()` converts an existing `ReadabilityProfile`, engine spreads,
reading situation, and pronunciation-provenance list into at most three
deterministic observations. It does not alter engine behavior or add linguistic
claims. The model remains in `packages/web` until its shape is proven; it is not
part of the published engine contract.

Each reflection records its domain, scope, observation, evidence, confidence,
destination mode, and priority. Reading situation changes priority only. It
does not change measurements.

### 2. Write mode is Glance

The Write sidebar keeps the manuscript word-count contour and replaces the
persistent metric stack with a maximum of three reflections. Empty manuscripts
show a quiet explanation instead of synthetic advice. Deep metrics remain in
Analyze, Phonology, and Prosody modes.

### 3. Evidence is always reachable

A reflection can open its relevant workbench, return attention to an affected
spread, or activate an existing phoneme highlight. Supporting evidence and
construct limits appear on the card itself; estimated pronunciation changes the
confidence presentation.

### 4. Reading situation is web-side manuscript metadata

The editor adds `adult-read-aloud`, `shared-reading`, and
`independent-reading`. It persists with the draft and is flattened away by
`toEngineManuscript()`. Samples default to adult read-aloud. This keeps the
published engine API stable as required by ADR 0012.

### 5. Reflections observe; integrity warnings protect trust

Reflection copy describes patterns and comparisons. It does not recommend
replacement text, label a pattern wrong, predict performance, or certify a
reading age. Existing warnings remain unchanged in this slice; separating
linguistic patterns from integrity warnings completely is follow-on work.

## Consequences

- Writers see fewer numbers while composing, with a path to the full evidence.
- The same profile can foreground different ingredients for different reading
  situations without creating multiple engine behaviors.
- Reflection rules require product judgment and should eventually receive
  focused unit coverage. The web package currently has no test runner, so the
  first slice is protected by strict TypeScript, the engine/corpus suites, build
  validation, and browser QA rather than adding an unapproved dependency.
- The reflection layer may reveal missing engine evidence. Those gaps should be
  recorded rather than filled with unsupported inference.
- Dismissal and selection-scoped reflections are deliberately deferred until
  the basic presentation earns its place with writers.

## Alternatives considered

- **Keep the metric digest.** Rejected because it gives all measurements equal
  urgency and reinforces a dashboard/grading interpretation.
- **Build a chatbot panel.** Rejected because it implies agency, invites
  generation, and adds conversational ceremony to deterministic evidence.
- **Put reflections in the engine API.** Rejected because priority and wording
  are product-context concerns and the shape has not been validated.
- **Change engine scores by reading situation.** Rejected because context should
  affect presentation, not silently redefine a measurement.

