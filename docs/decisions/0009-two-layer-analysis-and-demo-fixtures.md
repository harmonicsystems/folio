# ADR 0009 — Two-layer analysis (verdict vs. mirror) and generated demo fixtures

Status: Accepted 2026-07-11
Deciders: David Nyman (direction), session working-through with Claude

## Context

Two questions arrived together and turned out to be the same question.

1. **Demo content.** The pre-loaded samples don't demonstrate the product. We
   want a *fully realized* book per age band so the analyses can be previewed
   end to end — and we want each one to feel "60–70% there": sound, but with a
   few changes that would tighten rhyme, meter, vocabulary, or other parameters.
2. **What the engine is allowed to claim.** Folio must not become a tool that
   defines what makes children's writing "good." The canon argues against it:
   run *Where the Wild Things Are* or Seuss through a rules engine and they light
   up with "violations," because their art *is* the rule-break. A tool that
   scores Seuss at 40% is broken, not the book.

The resolution to (2) reframes (1). Folio is not a quality judge. It is an SLP's
decomposition of the **discrete linguistic ingredients** of a text — phonemic
distribution, prosodic shape, lexical frequency, rhyme as phonological-awareness
scaffolding — plus the **publishing mechanics** an author has to satisfy to get a
board book physically printed. Those are two different kinds of statement and
must not be presented as if they were one.

## Decision

### 1. The engine speaks in two registers, and they never blend.

- **Hard-constraint layer — verdicts.** Trim, bleed, page-count signature,
  even-page increments. These genuinely are pass/fail rules; their job is to help
  the writer with publishing mechanics. A verdict here ("14 pages doesn't fit a
  4-page signature") is correct and welcome.
- **Soft layer — a mirror, not a ruler.** Prosody, phoneme distribution, rhyme,
  lexical frequency. This layer *describes what is on the page* and nothing more:
  "you've used a lot of the /u/ sound," "your meter has this shape," "the refrain
  covers every spread." It measures against no norm and issues no verdict. The
  writer supplies the judgment.

The persuasive power of the soft layer comes from contrast, not correction: a
mirror makes a pattern's own outlier visible. Draw the meter shape and the one
long line announces itself; the writer notices it, and the noticing is theirs.
This is why "60–70% there" is **profile coverage**, not a grade — how much of the
book sits inside the band's typical shape, with deviations laid out neutrally.

### 2. Observation and reference stay visibly separate.

Within the soft layer, keep two strata apart in copy and UI:

- **Observation** — pure description of the text (the /u/ count, the meter shape).
  Always neutral. No evaluative vocabulary — no "flaw," "weak," "wrong," "fix."
- **Reference** — optional, clearly separated, take-it-or-leave-it SLP context:
  "repeated vowel sounds support phonemic exposure at this band." Never phrased as
  a directive.

### 3. Demo books are generated fixtures, not literature.

Licensed or canonical books fail as demo material twice over: their ingredient
profile can't be controlled, and their strength is often the deviation itself.
Authored-to-spec fixtures are the only way to hold a profile steady on purpose and
to place a *legible* deviation exactly where we want the preview to speak.

Each demo book carries, by construction:

- one calibrated deviation per soft axis (prosody, rhyme/phonological, lexical
  frequency), sized to be **half-heard, not glaring** — subtle enough that a
  layperson senses it without naming it, so the analysis does the naming;
- at least one hard-constraint miss (e.g., an off-signature page count) so the
  verdict layer also has something to demonstrate;
- calibration to *its own band* — a meter stumble that matters at a `board`
  read-aloud cadence is invisible at `early-reader`.

### 4. Demo state is band-keyed, 1:1:1.

Age band is the key. Selecting a band loads *its* canonical book, which carries
*its* layout, which produces *its* analysis. Band → layout → sample stops being
three things to keep in sync and becomes one lookup. There is no reconciliation
logic to get wrong because there is nothing to reconcile.

## Consequences

- The `AgeBand` set (`board`, `early-picture`, `picture`, `early-reader`,
  `chapter`) defines the demo-book set: one fully realized fixture each, built
  youngest-first starting with `board`.
- Soft-layer output strings must be audited for neutrality; any evaluative
  wording is a bug against this ADR.
- The soft layer needs a descriptive phoneme-distribution / meter-shape readout
  surfaced *as a mirror*, distinct from the existing reach-word and decodability
  paths that exist to flag things.
- Demo-state code that lets band, layout, and sample vary independently should be
  collapsed to a band lookup.
- We accept authoring cost: engineering a believable "60–70%" book is harder than
  writing a good one or a broken one, and each fixture is bespoke per band.

## Alternatives considered

- **Curated real books as samples.** Rejected — uncontrollable profiles, and it
  would put the engine in the position of scoring beloved books as deficient.
- **All-green "compliant" demo books.** Rejected — shows nothing happening; the
  product's value is the preview surfacing something the author half-missed.
- **A single quality score across both layers.** Rejected — it re-introduces the
  "Folio decides what's good" claim this ADR exists to refuse.
- **Independently varying demo state with combination validation.** Rejected in
  favor of the 1:1:1 band key — simpler and unbreakable.

## Reference: the `board` prototype

A first fixture, "Time for Bed, Little One," was drafted this session against a
`board` envelope (7 spreads, refrain, steady read-aloud pulse). It plants a meter
outlier (one ~14-syllable line against a 4-beat pattern), a phonetically distant
rhyme pair, a lexical-frequency outlier ("luminous ascent"), and an off-signature
14-page count. Its soft-layer mirror shows /ʌ/ clustered through the opening,
/iː/ pooled at the close, and the refrain fixing /aɪ/–/ɛ/ across every spread. It
is the reference the remaining bands should carry the same pattern up from.
