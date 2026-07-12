# ADR 0012 — Read-aloud picture-book MVP

Status: Accepted 2026-07-12
Deciders: David Nyman (direction), product conversation 2026-07-12 worked through with Claude

## Context

The engine and web alpha are built (Milestones 0–5, three live routes). The
handoff is explicit that the next phase is user signal, not the next feature. But
"observe which audience shows up" still leaves the editor pointed at all five age
bands at once, and the product copy still hedges toward a general "readability"
claim. A product conversation on 2026-07-12 worked through where Folio's signals
are actually strongest, and what the tool is allowed to say about a manuscript.

Two things fell out of that conversation and belong together.

1. **The signals are strongest at the young end.** Short, spread-native,
   read-aloud text is where phonology, repetition, rhythm, rhyme, vocabulary, and
   page density are all legible at once. A board book fits on one screen; a chapter
   book does not, and the engine has no section/chapter navigation, no morphology,
   and no frequency data wide enough to say much about it yet. Promising equal
   editor depth across all five bands promises depth we don't have.

2. **"Reading age" is the wrong output.** A single number collapses three
   different things — whether a listener can *comprehend* the language, whether a
   child can *decode* it, and how it *performs* read aloud — into one grade. That
   collapse is exactly the "Folio decides what's good" claim ADR 0009 exists to
   refuse. The same manuscript is easy to listen to and hard to decode; both are
   true, and neither is an age.

This ADR records the scope narrowing and the framing. It does **not** design the
"quiet studio reader" interaction model or the rhyme/rhythm user-story slices —
those are downstream of this decision and get their own ADR once designed.

## Decision

### 1. The MVP audience is writers of read-aloud picture books, ages 0–7.

Board and picture books, especially adult-read-aloud manuscripts. That is where
Folio's signals are most legible, so it is where the editor earns the strongest
first impression.

This is a narrowing of the **editor's** promise, not the engine's reach.
`early-reader` and `chapter` stay fully supported by the engine and the CLI —
`analyze()` runs on any band, the type surface is untouched (Hard Rule 4 stands).
The editor simply does not promise equal depth for the older bands until they have
section/chapter navigation, morphology, wider frequency data, and independently
validated reading constructs to stand on.

### 2. Reading situation is an axis separate from audience age.

Ask how a manuscript will usually be *experienced*, independently of the reader's
age: `adult read-aloud`, `shared reading`, or `independent reading`. The two axes
prioritize different signals — a read-aloud manuscript foregrounds rhythm, rhyme,
repetition, and participation; an independent-reading one foregrounds sight words,
decodability, and syllable shape.

This must not collapse comprehension, decoding, and oral performance back into one
"reading age." Reading situation lands as **web-side manuscript metadata first**.
Adding it to the published engine contract is a separate decision that needs its
own ADR — the engine stays as it is for now.

### 3. Three writer jobs are the acceptance test for editor work.

New editor work has to serve one of these, or it doesn't ship into the MVP:

1. **Audience fit** — show the linguistic demands in the manuscript so the writer
   can judge whether they fit the intended audience and reading situation.
2. **Sound and participation** — show the rhyme, repetition, phoneme patterns, and
   invitations to participate that shape a read-aloud.
3. **Flow across pages** — show where rhythm, density, or language changes across
   pages and spreads, so the writer can rehearse and inspect those moments.

Across all three, Folio reports evidence and reference ranges. It never certifies
quality and never predicts a definitive reader age.

### 4. The product promise is ingredients, not assessment.

Folio shows how a picture-book manuscript is built — the words a child encounters,
the sounds they hear, the rhythm an adult reads aloud. It does not grade the story
and does not rewrite it. Homepage, onboarding, guide, and sample-picker copy get
reconciled to this promise; that reconciliation is follow-on work, not part of
this ADR.

### 5. Observation-register vocabulary is house style.

Extending ADR 0009's neutrality rule from the soft layer to the whole editor:
prefer `profile`, `pattern`, `less familiar`, `outside the selected reference
range`, `examine`, `reflection`, `estimated`. Avoid `score`, `problem`, `failure`,
`too difficult`, `age inappropriate`, `fix`, `weakness`, and `passed` — unless a
genuine hard-constraint verdict (publishing mechanics, per ADR 0009) warrants
pass/fail language.

## Consequences

- The demo-fixture initiative builds youngest-first and prioritizes `board`,
  `early-picture`, and `picture`. Bespoke `early-reader` / `chapter` demos defer
  until those editor experiences become priorities.
- Product copy across homepage, onboarding, `guide.astro`, `about.astro`, and the
  sample picker now has a fixed target to reconcile against (ingredients, not
  assessment). That reconciliation is unblocked but not done here.
- The "quiet studio reader" interaction model — reflections, the three depths of
  attention (Glance / Inspect / Study), and the patterns-vs-warnings separation —
  is the natural next design, and earns its own follow-on ADR. This ADR is its
  prerequisite, not its substitute.
- The rhyme and rhythm user-story slices now have a scope to build within: make
  the evidence inspectable in context, never label a non-match as wrong, and phrase
  performance effects conditionally.
- We accept that the older bands look under-served in the editor for now. That is
  the honest state — the engine supports them, the editor's depth does not yet —
  and saying so is preferable to a uniform promise we can't keep.

## Alternatives considered

- **Keep all five bands equally prominent in the editor.** Rejected — it promises
  depth (chapter navigation, morphology, wider frequency data) that doesn't exist,
  and dilutes the one place the signals already sing.
- **Emit a single "reading age" or readability grade.** Rejected — it collapses
  comprehension, decoding, and performance into one number and re-introduces the
  quality-judge claim ADR 0009 refuses.
- **Fold audience age and reading situation into one control.** Rejected — a
  read-aloud board book and an independent early reader ask for different signals;
  one axis can't express that.
- **Leave the scope implicit and skip the ADR.** Rejected — every downstream item
  (demo fixtures, copy rewrites, the interaction model) was blocking on this
  decision, and an unrecorded direction gets re-litigated every session.
