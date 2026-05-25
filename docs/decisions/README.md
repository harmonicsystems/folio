# Architectural Decision Records (ADRs)

This directory holds short markdown files documenting significant architectural decisions. Each file is named `NNNN-title.md` where NNNN is a 4-digit zero-padded number.

## When to write an ADR

Write one when you make a decision that:

- Has trade-offs you'd forget in 6 months
- Closes off other reasonable options
- Future contributors will want to understand the reasoning behind
- Touches the engine's public API

Don't write one for routine implementation choices.

## Template

```markdown
# NNNN: Title

## Status

Proposed | Accepted | Deprecated | Superseded by NNNN

## Context

What is the issue we're addressing? What are the forces at play?

## Decision

What did we decide?

## Consequences

What becomes easier or harder as a result? What are we accepting?

## Alternatives considered

What else did we look at? Why didn't we pick those?
```

## Existing ADRs

(none yet — first one will likely be the TypeScript-over-Rust decision for the engine core)
